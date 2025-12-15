const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// 遊戲參數
const GRAVITY = 1.8; // 再加大重力 (1.2 -> 1.8) 讓動作更俐落
const JUMP_FORCE = -20; // 加大起跳爆發力 (-16 -> -20)，維持高度但縮短滯空時間
const GROUND_Y = canvas.height - 100;
const SPEED_INITIAL = 10; // 初始速度回復為 10

// 音效系統
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); // 增加跳躍音量 (0.05 -> 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); // 降低死亡音量 (0.2 -> 0.1)
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
}

// 遊戲狀態
let gameSpeed = SPEED_INITIAL;
let score = 0;
let isGameRunning = false;
let isGameOver = false;
let animationId;
let spawnTimer = 0;

// 物件定義
// Load Player Image
const playerImg = new Image();
playerImg.src = '/static/images/steve.png';

class Player {
    constructor() {
        this.h = 80;
        // 修正 Steve 變形問題：保持圖片原始比例
        if (playerImg.complete && playerImg.naturalHeight !== 0) {
            this.w = this.h * (playerImg.naturalWidth / playerImg.naturalHeight);
        } else {
            this.w = 80; // Fallback default
        }

        this.x = 50;
        this.y = GROUND_Y - this.h;
        this.dy = 0; // 垂直速度
        this.isGrounded = true;
        // this.color = '#4CAF50'; // Green (No longer needed)
    }

    update() {
        // 跳躍/重力物理
        if (this.isGrounded && keys['Jump']) {
            this.dy = JUMP_FORCE;
            this.isGrounded = false;
            playSound('jump');
        }

        this.y += this.dy;

        if (!this.isGrounded) {
            this.dy += GRAVITY;
        }

        // 落地檢測
        if (this.y >= GROUND_Y - this.h) {
            this.y = GROUND_Y - this.h;
            this.dy = 0;
            this.isGrounded = true;
        }
    }

    draw() {
        if (playerImg.complete) {
            ctx.drawImage(playerImg, this.x, this.y, this.w, this.h);

            // Debug: 顯示實際碰撞框 (測試用，可註解掉)
            // ctx.strokeStyle = 'red';
            // ctx.lineWidth = 1;
            // ctx.strokeRect(this.x + 15, this.y + 5, this.w - 30, this.h - 5);
        } else {
            // Fallback if image not loaded yet
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

// Load Obstacle Images
const slimeImg = new Image();
slimeImg.src = '/static/images/slime.png';
const zombieImg = new Image();
zombieImg.src = '/static/images/zombie.png';

class Obstacle {
    constructor() {
        this.x = canvas.width;
        this.y = GROUND_Y; // 預設先設在地面，後面會扣除高度
        this.markedForDeletion = false;

        // 隨機決定是 史萊姆 (矮) 還是 殭屍 (高)
        const type = Math.random() < 0.5 ? 'slime' : 'zombie';
        this.type = type;

        if (type === 'slime') {
            // 史萊姆高度隨機範圍加大
            // 小的維持 45，大的可以到 95 (接近極限跳躍高度 110)
            this.h = 45 + Math.random() * 50;

            // 保持比例
            if (slimeImg.complete && slimeImg.naturalHeight !== 0) {
                this.w = this.h * (slimeImg.naturalWidth / slimeImg.naturalHeight);
            } else {
                this.w = this.h; // Fallback to square
            }
        } else {
            // 殭屍高度隨機 (85 ~ 100)
            this.h = 85 + Math.random() * 15;

            // 保持比例
            if (zombieImg.complete && zombieImg.naturalHeight !== 0) {
                this.w = this.h * (zombieImg.naturalWidth / zombieImg.naturalHeight);
            } else {
                // 一般殭屍比例約為 1:2
                this.w = this.h * 0.5;
            }
        }

        // 稍微往下移一些，消除浮空感 (+5)
        this.y = GROUND_Y - this.h + 5;

        // this.color = '#DD2C00'; // No longer needed
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.w < 0) {
            this.markedForDeletion = true;
            score++; // 通過障礙加分
            scoreEl.innerText = score;
        }
    }

    draw() {
        if (this.type === 'slime' && slimeImg.complete) {
            ctx.drawImage(slimeImg, this.x, this.y, this.w, this.h);
        } else if (this.type === 'zombie' && zombieImg.complete) {
            ctx.drawImage(zombieImg, this.x, this.y, this.w, this.h);
        } else {
            // Fallback
            ctx.fillStyle = this.type === 'slime' ? '#00FF00' : '#FF0000';
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
}

let player;
let obstacles = [];
let keys = {};

// 輸入監聽
window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        keys['Jump'] = true;
    }
    // 開始遊戲
    if (!isGameRunning && (e.code === 'Space' || e.code === 'ArrowUp')) {
        initGame();
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        keys['Jump'] = false;
    }
});

function initGame() {
    if (isGameRunning) return;

    player = new Player();
    obstacles = [];
    score = 0;
    scoreEl.innerText = 0;
    gameSpeed = SPEED_INITIAL;
    // spawnTimer = 0;
    // 給玩家一點緩衝時間，不要一開始就生成障礙物 (60 frames = 1秒)
    spawnTimer = 60;
    bgX = 0; // Reset background position

    isGameRunning = true;
    isGameOver = false;
    animate();
}

function spawnObstacle() {
    // 隨機生成間隔
    spawnTimer--;
    if (spawnTimer <= 0) {
        obstacles.push(new Obstacle());

        // --- 最終極限版密度調整 (God Mode) ---
        // 目標：在後期 (Speed 30+) 達到人類反應極限

        // 1. 最小安全間隔 (Min Frames) 
        // 滯空約 22 frames。為了提高難度，我們在高速時將容錯壓到最低。
        // Speed < 30: 25 frames (還有一點點緩衝)
        // Speed >= 30: 23 frames (幾乎必須完美接跳，容錯僅 1 frame)
        let minFrames = 25;
        if (gameSpeed >= 30) minFrames = 23;

        // 2. 最大間隔 (Max Frames)
        // 延伸計算範圍到 Speed 50
        const speedProgress = (gameSpeed - SPEED_INITIAL) / (50 - SPEED_INITIAL); // 0.0 ~ 1.0

        // Max 從 120 (輕鬆) 縮減到 25 (幾乎跟 min 一樣)
        let currentMaxFrames = 120 - (speedProgress * (120 - 25));

        // 防呆: 保持極小的隨機性 (2~5 frames user 體感不明顯，但能打破固定節奏)
        if (currentMaxFrames < minFrames + 3) currentMaxFrames = minFrames + 3;

        // 3. 生成下一次的 Timer
        spawnTimer = minFrames + Math.random() * (currentMaxFrames - minFrames);

        // 隨著分數增加，生成速度變快
        if (gameSpeed < 50) {
            gameSpeed += 0.3;
        }
    }
}

function checkCollision() {
    // 定義較小的碰撞箱 (Hitbox) 以更貼近角色圖片實體 (去除透明邊緣)
    // Steve 變大了 (80x80)，調整縮邊比例
    const hitX = player.x + 20; // 左右各內縮 20
    const hitY = player.y + 5;
    const hitW = player.w - 40; // 80 - 20 - 20 = 40寬
    const hitH = player.h - 5;  // 80 - 5 = 75高

    for (let obs of obstacles) {
        let obsHitX, obsHitW, obsHitY, obsHitH;

        if (obs.type === 'slime') {
            // 史萊姆通常比較小，且圖片可能有透明邊緣
            // 大幅內縮判定框，讓玩家感覺"稍微碰到一點沒關係"
            const padding = obs.w * 0.2; // 內縮 20%
            obsHitX = obs.x + padding;
            obsHitW = obs.w - (padding * 2);
            obsHitY = obs.y + padding; // 上面也內縮，避免看起來跳過去了卻死掉
            obsHitH = obs.h - padding;
        } else {
            // 殭屍比較瘦長，左右內縮，上下稍微寬容
            const xPadding = obs.w * 0.15;
            const yPadding = 5;
            obsHitX = obs.x + xPadding;
            obsHitW = obs.w - (xPadding * 2);
            obsHitY = obs.y + yPadding;
            obsHitH = obs.h - yPadding; // 腳底貼地重要
        }

        // AABB 碰撞檢測 (使用修正後的 Hitbox)
        if (
            hitX < obsHitX + obsHitW &&
            hitX + hitW > obsHitX &&
            hitY < obsHitY + obsHitH &&
            hitY + hitH > obsHitY
        ) {
            return true;
        }
    }
    return false;
}

// Load Background Image
const bgImg = new Image();
bgImg.src = '/static/images/minecraft_bg.jpg';
let bgX = 0;

// FPS Control
let lastTime = 0;
const fpsInterval = 1000 / 60;

function animate(timestamp) {
    if (!isGameRunning) return;

    // Request next frame first
    animationId = requestAnimationFrame(animate);

    if (!lastTime) lastTime = timestamp;
    const elapsed = timestamp - lastTime;

    // Only update if enough time has passed (60 FPS)
    if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);

        // 改用天空色填充背景，這樣即使有 1px 的縫隙也不會透出黑色
        ctx.fillStyle = '#92C2F7';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 繪製捲動背景
        if (bgImg.complete) {
            // 算出圖片縮放比例以填滿高度
            // 假設圖片是完整的背景（天空+地面），我們讓它高度適配 Canvas
            // 但為了像素感，也許保持原比例或 fill

            // 這裡採用簡單的無縫捲動邏輯
            const scale = canvas.height / bgImg.height;
            const scaledWidth = bgImg.width * (canvas.height / bgImg.height); // 保持比例填滿高度

            // 移動背景 X
            bgX -= gameSpeed * 0.5; // 背景移動速度比障礙物慢一點點，製造視差 (Parallax)，或一樣快
            // 這裡如果是地板，應該跟障礙物一樣快
            // 讓我們設為跟 gameSpeed 一樣，因為它是地板

            // 重置
            if (bgX <= -scaledWidth) {
                bgX = 0;
            }

            // 畫兩張圖來銜接
            // 稍微拉伸寬度確保沒有縫隙
            // 為了消除接縫，加上 1px 的重疊 (overlap)
            // 使用 Math.floor 或 ceil 取整數坐標也可以減少接縫，但重疊最保險
            ctx.drawImage(bgImg, Math.floor(bgX), 0, scaledWidth + 1, canvas.height);
            ctx.drawImage(bgImg, Math.floor(bgX + scaledWidth), 0, scaledWidth + 1, canvas.height);

            if (bgX + scaledWidth < canvas.width) {
                ctx.drawImage(bgImg, Math.floor(bgX + scaledWidth * 2), 0, scaledWidth + 1, canvas.height);
            }

        } else {
            // Fallback: 畫地面
            ctx.beginPath();
            ctx.moveTo(0, GROUND_Y);
            ctx.lineTo(canvas.width, GROUND_Y);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        player.update();
        player.draw();

        spawnObstacle();

        obstacles.forEach(obs => {
            obs.update();
            obs.draw();
        });

        obstacles = obstacles.filter(obs => !obs.markedForDeletion);

        if (checkCollision()) {
            gameOver();
        }
    }
}

function gameOver() {
    if (!isGameOver) playSound('die'); // 防止重複播放

    isGameRunning = false;
    isGameOver = true;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText('Press Restart Button to Try Again', canvas.width / 2, canvas.height / 2 + 50);

    // Submit Score
    submitScore('dino', score);
}

function submitScore(gameId, score) {
    fetch('/api/score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            game_id: gameId,
            score: score
        }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                console.log("Score saved!");
            } else {
                console.log("Score not saved (Not logged in or error)");
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

// 初始畫面繪製
function drawStartScreen() {
    // 1. 清除畫面 (改為填充天空色以防縫隙)
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#92C2F7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 畫背景 (靜態)
    if (bgImg.complete) {
        const scaledWidth = bgImg.width * (canvas.height / bgImg.height);
        ctx.drawImage(bgImg, 0, 0, scaledWidth + 1, canvas.height);
        ctx.drawImage(bgImg, Math.floor(scaledWidth), 0, scaledWidth + 1, canvas.height); // 補滿右邊
    } else {
        ctx.fillStyle = '#87CEEB'; // Sky fallback
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 3. 畫地板線 (可選，如果背景已經有地板)
    // ctx.beginPath();
    // ctx.moveTo(0, GROUND_Y);
    // ctx.lineTo(canvas.width, GROUND_Y);
    // ctx.strokeStyle = '#555';
    // ctx.lineWidth = 2;
    // ctx.stroke();

    // 4. 畫主角 (靜態)
    // 尚未 initGame 所以 player 可能為 null，我們手動畫圖
    if (playerImg.complete) {
        // x=50, w=80, h=80 (from Player class)
        // y = GROUND_Y - 80
        ctx.drawImage(playerImg, 50, GROUND_Y - 80, 80, 80);
    } else {
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(50, GROUND_Y - 80, 80, 80);
    }

    // 5. 半透明遮罩 + 文字
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; // 稍微淺一點讓背景透出來
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';

    // Add shadow text
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0; // reset
}

// 確保圖片載入後重畫一次，避免黑屏
bgImg.onload = drawStartScreen;
playerImg.onload = drawStartScreen;

// 為了保險起見 (如果圖片有快取)，延遲也執行一次
setTimeout(drawStartScreen, 100);
drawStartScreen();
