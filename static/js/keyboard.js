const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const penaltyOverlay = document.getElementById('penalty-overlay');

// 顯示設定
const LANE_COUNT = 4;
const LANE_WIDTH = canvas.width / LANE_COUNT;
const BLOCK_HEIGHT = 80;
const VISIBLE_BLOCKS = Math.ceil(canvas.height / BLOCK_HEIGHT) + 1;
const HIT_Y = canvas.height - 100; // 判定線位置

// 遊戲邏輯變數
// 遊戲邏輯變數
const KEYS = ['d', 'f', 'j', 'k'];
let stepQueue = [];     // 儲存接下來的方塊位置 (0-3)
let currentStep = 0;    // 當前要打擊的方塊在 stepQueue 中的 index
let drawOffset = 0;     // 視覺捲動偏移量
let isPlaying = false;
let isGameOver = false;
let hasStarted = false; // New: Wait for first key press

// 時間與狀態
let startTime = 0;
let timeLeft = 30;      // 秒
let score = 0;

// 懲罰機制
let isFrozen = false;
let freezeEndTime = 0;
const PENALTY_DURATION = 1000; // 1秒

// 初始化
function initGame() {
    isPlaying = true;
    isGameOver = false;
    isFrozen = false;
    hasStarted = false; // Reset start flag
    penaltyOverlay.style.display = 'none';
    score = 0;
    timeLeft = 30;
    currentStep = 0;
    drawOffset = 0;
    stepQueue = [];

    // 預先生成足夠的方塊 (比如先生成1000個，不夠再加)
    for (let i = 0; i < 1000; i++) {
        addRandomStep();
    }

    AudioController.noteIndex = 0; // Reset melody
    updateUI();
    // Don't set startTime here anymore. Wait for first key.
    draw();
    requestAnimationFrame(gameLoop);
}

function addRandomStep() {
    // 避免過於單調，可以加一點邏輯，這裡先純隨機
    stepQueue.push(Math.floor(Math.random() * LANE_COUNT));
}

// 監聽輸入
document.addEventListener('keydown', (e) => {
    if (!isPlaying) {
        if (e.code === 'Space') initGame();
        return;
    }
    if (isFrozen) return; // 冷卻中

    const key = e.key.toLowerCase();
    const laneIndex = KEYS.indexOf(key);

    if (laneIndex !== -1) {
        // First key press triggers start
        if (!hasStarted) {
            hasStarted = true;
            startTime = performance.now();
        }

        // 檢查是否是當前目標方塊
        const targetLane = stepQueue[currentStep];

        if (laneIndex === targetLane) {
            // 正確！
            handleCorrectHit();
        } else {
            // 錯誤！
            handleMistake();
        }
    }
});

function handleCorrectHit() {
    score++;
    currentStep++;
    AudioController.playNextNote(); // Play melody note

    // 如果快用完了再生成
    if (currentStep > stepQueue.length - 100) {
        for (let i = 0; i < 100; i++) addRandomStep();
    }
}

function handleMistake() {
    isFrozen = true;
    freezeEndTime = performance.now() + PENALTY_DURATION;
    penaltyOverlay.style.display = 'flex';
    AudioController.playError(); // Play error sound

    // 震動效果 (可選)
    canvas.style.transform = "translateX(5px)";
    setTimeout(() => canvas.style.transform = "none", 50);
}

function gameLoop(timestamp) {
    if (!isPlaying) return;

    // Check if game has started
    if (!hasStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 更新時間
    const elapsed = timestamp - startTime;
    // 倒數計時
    let remaining = 30 - (elapsed / 1000);

    // 如果在冷卻中，檢查是否解凍，並且懲罰時間要算進去 (倒數照常走)
    if (isFrozen) {
        if (timestamp >= freezeEndTime) {
            isFrozen = false;
            penaltyOverlay.style.display = 'none';
        }
    }

    if (remaining <= 0) {
        remaining = 0;
        endGame();
    }
    timeLeft = remaining;

    // 繪製
    draw();
    updateUI();

    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 軌道線
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, canvas.height);
        ctx.stroke();
    }

    // 判定線 (Hit Line)
    // 在 Block Rush 模式下，判斷線其實就是"當前磚塊"應該在的位置
    // 我們設定目標磚塊就在 Hit Line 上
    ctx.fillStyle = '#444';
    ctx.fillRect(0, HIT_Y, canvas.width, 2);

    // 繪製方塊
    // 我們只繪製 currentStep 開始往後的 N 個方塊
    // 位置計算：
    // 第 0 個 (currentStep) 應該在 HIT_Y 上方 (準備被消除) 
    // 或者更直觀的 UI：目標方塊就在底部，打掉後整個列表下移。
    // 為了像 "別踩白塊兒"，最下面的方塊在 HIT_Y 位置。

    for (let i = 0; i < VISIBLE_BLOCKS; i++) {
        const index = currentStep + i;
        if (index >= stepQueue.length) break;

        const lane = stepQueue[index];
        const x = lane * LANE_WIDTH;
        // y 座標：最下面一個 (i=0) 在 HIT_Y - BLOCK_HEIGHT
        // 可是玩家要看到它走過來嗎？不需要，這是按鍵遊戲，不是墜落遊戲。
        // 我們讓 i=0 的方塊固定在一個"等待打擊區"。
        // 為了視覺連續性，我們繪製從下往上堆疊
        const y = HIT_Y - (i + 1) * BLOCK_HEIGHT + 10; // +10 微調

        // 樣式
        if (i === 0) {
            ctx.fillStyle = '#3498db'; // 當前目標：亮藍色
            // 增加一點高亮提示
            if (!isFrozen) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#3498db';
            }
        } else {
            ctx.fillStyle = '#555'; // 後續方塊：灰色
            ctx.shadowBlur = 0;
        }

        ctx.fillRect(x + 5, y + 5, LANE_WIDTH - 10, BLOCK_HEIGHT - 10);

        // 文字提示 (可選)
        if (i === 0) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(KEYS[lane].toUpperCase(), x + LANE_WIDTH / 2, y + BLOCK_HEIGHT / 2);
        }
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Game Over 覆蓋層
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TIME UP!', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.fillText(`Total Steps: ${score}`, canvas.width / 2, canvas.height / 2 + 40);

        // 評價
        let rank = "C";
        if (score > 100) rank = "A";
        else if (score > 60) rank = "B";

        ctx.fillStyle = '#aaa';
        ctx.font = '20px Arial';
        ctx.fillText(`Rank: ${rank}`, canvas.width / 2, canvas.height / 2 + 80);

        ctx.font = '16px Arial';
        ctx.fillText('Press Restart Button', canvas.width / 2, canvas.height / 2 + 130);
    } else if (!isPlaying) {
        // Start Screen
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PRESS SPACE', canvas.width / 2, canvas.height / 2);
        ctx.fillText('TO START RUSH', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function endGame() {
    isPlaying = false;
    isGameOver = true;
    isFrozen = false; // Reset freeze state
    penaltyOverlay.style.display = 'none'; // Ensure overlay is hidden
    draw(); // show final frame

    // Submit Score
    submitScore('keyboard', score);
}

function submitScore(gameId, score) {
    fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, score: score }),
    });
}

function updateUI() {
    scoreEl.innerText = score;
    timeEl.innerText = timeLeft.toFixed(2);
}

// -------------------------------------------------------------------------
// Audio Controller
// -------------------------------------------------------------------------
const AudioController = {
    ctx: null,
    melody: [],
    noteIndex: 0,
    isMuted: false,

    // Note Frequencies
    notes: {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
        'C6': 1046.50, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'G#3': 207.65, 'G#4': 415.30
    },

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initMelody();
        }
    },

    initMelody() {
        // Rick Roll (Never Gonna Give You Up) - MIDI (G Major)
        // 1 note = 1 hit.
        const m = [
            // 1. Ne-ver gon-na give you up (D E G E B A G) -> 62, 64, 67, 64, 71, 69, 67
            62, 64, 67, 64, 71, 69, 67,

            // 2. Ne-ver gon-na let you down (D E G E A G E) -> 62, 64, 67, 64, 69, 67, 64
            62, 64, 67, 64, 69, 67, 64,

            // 3. Ne-ver gon-na run a-round and de-sert you (D E G A B A G F# E D D) -> 11 notes
            62, 64, 67, 69, 71, 69, 67, 66, 64, 62, 62,

            // 4. Ne-ver gon-na make you cry (D E G E B A G) -> 62, 64, 67, 64, 71, 69, 67
            62, 64, 67, 64, 71, 69, 67,

            // 5. Ne-ver gon-na say good-bye (D E G E G5 F#5 G5) -> 62, 64, 67, 64, 79, 78, 79
            // (Note: F#5 is 78, G5 is 79)
            62, 64, 67, 64, 79, 78, 79,

            // 6. Ne-ver gon-na tell a lie and hurt you (D E G A B A G F# E D D) -> 11 notes
            62, 64, 67, 69, 71, 69, 67, 66, 64, 62, 62
        ];
        this.melody = m;
        this.noteIndex = 0;
    },

    playNextNote() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const midiNote = this.melody[this.noteIndex % this.melody.length];
        // Convert MIDI to Frequency: f = 440 * 2^((d-69)/12)
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        // Use Sine wave for less "electronic" sound, more flute/piano-ish
        this.playTone(freq, 'sine', 0.2);
        this.noteIndex++;
    },

    playError() {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        // Low thud instead of Buzz
        this.playTone(100, 'square', 0.2);
    },

    playTone(freq, type, duration, delay = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

        // Envelope: Piano-like Attack and Decay
        const now = this.ctx.currentTime + delay;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Quick Attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Smooth Decay

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    }
};

// 初始畫面
draw();
AudioController.init(); // Try init silently, browser might block until interaction

// -------------------------------------------------------------------------
// Modification End
// -------------------------------------------------------------------------
