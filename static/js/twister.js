const instructionEl = document.getElementById('instruction');
const scoreEl = document.getElementById('score');
const targetDisplay = document.getElementById('target-display');
const heldKeysContainer = document.getElementById('held-keys');
const gameArea = document.getElementById('game-area');
const gameOverScreen = document.getElementById('game-over-screen');
const failReason = document.getElementById('fail-reason');
// const startBtn = document.getElementById('start-btn'); // Removed button
const timerContainer = document.getElementById('timer-container');
const timerBar = document.getElementById('timer-bar');
const livesEl = document.getElementById('lives');

// 遊戲狀態
let isPlaying = false;
let hasStarted = false; // 用於區分是否已經開始過 (或是由 GameOver 狀態等待重開)
let requiredKeys = new Set();
let currentTargetKey = null;
let gameState = 'PRESSING';
let score = 0;
let lives = 3;

// 時間控制
let startTime = 0;
const TIME_LIMIT = 2000;
let animationId;

// 可用按鍵池 (排除系統鍵)
// 可用按鍵池 (排除系統鍵)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// QWERTY 鍵盤座標模擬 (Column, Row)
// 用於計算按鍵之間的物理距離，避免 Ghosting
const KEY_COORDINATES = {
    '1': { x: 0, y: 0 }, '2': { x: 1, y: 0 }, '3': { x: 2, y: 0 }, '4': { x: 3, y: 0 }, '5': { x: 4, y: 0 }, '6': { x: 5, y: 0 }, '7': { x: 6, y: 0 }, '8': { x: 7, y: 0 }, '9': { x: 8, y: 0 }, '0': { x: 9, y: 0 },
    'Q': { x: 0.5, y: 1 }, 'W': { x: 1.5, y: 1 }, 'E': { x: 2.5, y: 1 }, 'R': { x: 3.5, y: 1 }, 'T': { x: 4.5, y: 1 }, 'Y': { x: 5.5, y: 1 }, 'U': { x: 6.5, y: 1 }, 'I': { x: 7.5, y: 1 }, 'O': { x: 8.5, y: 1 }, 'P': { x: 9.5, y: 1 },
    'A': { x: 0.8, y: 2 }, 'S': { x: 1.8, y: 2 }, 'D': { x: 2.8, y: 2 }, 'F': { x: 3.8, y: 2 }, 'G': { x: 4.8, y: 2 }, 'H': { x: 5.8, y: 2 }, 'J': { x: 6.8, y: 2 }, 'K': { x: 7.8, y: 2 }, 'L': { x: 8.8, y: 2 },
    'Z': { x: 1.2, y: 3 }, 'X': { x: 2.2, y: 3 }, 'C': { x: 3.2, y: 3 }, 'V': { x: 4.2, y: 3 }, 'B': { x: 5.2, y: 3 }, 'N': { x: 6.2, y: 3 }, 'M': { x: 7.2, y: 3 }
};

function getDistance(k1, k2) {
    const p1 = KEY_COORDINATES[k1] || { x: 0, y: 0 };
    const p2 = KEY_COORDINATES[k2] || { x: 0, y: 0 };
    // 歐幾里得距離
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function selectWeightedKey(available, held) {
    // 如果目前沒有按住任何鍵，就完全隨機
    if (held.size === 0) {
        return available[Math.floor(Math.random() * available.length)];
    }

    let candidates = [];
    let totalWeight = 0;

    // 計算每個候選鍵的權重
    available.forEach(key => {
        // 找出該鍵與「目前按住的所有鍵」中，最近的那個距離
        // 因為 Ghosting 通常發生在兩個鍵太近的時候 (Matrix限制)
        let minDistance = 999;

        held.forEach(hKey => {
            let d = getDistance(key, hKey);
            if (d < minDistance) minDistance = d;
        });

        // 權重公式：距離越遠，權重越高
        // 基礎權重 1
        // 係數 0.4 讓最大權重比約為 3 倍 ( (1+3.2)/(1+0.4) = 3 )
        let weight = 1 + (minDistance * 0.4);

        candidates.push({ key: key, weight: weight });
        totalWeight += weight;
    });

    // 權重隨機選擇 (Weighted Random Selection)
    let random = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        random -= candidates[i].weight;
        if (random <= 0) {
            return candidates[i].key;
        }
    }
    return candidates[candidates.length - 1].key;
}

// 初始化文字
instructionEl.innerText = "Press ANY KEY to Start!";

// 監聽
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function startGame() {
    if (isPlaying) return;
    isPlaying = true;
    hasStarted = true;
    requiredKeys.clear();
    score = 0;
    lives = 3;
    gameState = 'PRESSING';

    gameArea.style.display = 'block';
    timerContainer.style.display = 'block';
    gameOverScreen.style.display = 'none';

    updateScore();
    updateLives();
    nextRound();
    requestAnimationFrame(gameLoop);
}

function nextRound(forceRelease = false) {
    // 重置時間
    startTime = performance.now();

    // 判斷階段
    // 如果指定強制釋放，或者持有鍵盤 >= 5，切換為放鍵 (RELEASING)
    if (forceRelease || requiredKeys.size >= 5) {
        gameState = 'RELEASING';
        startRefReleaseRound();
    } else {
        gameState = 'PRESSING';
        startPressRound();
    }
}

function startPressRound() {
    // 純隨機選擇 (Random Generation)
    let newKey = '';
    // 找出目前沒按住的
    let availableKeys = ALPHABET.split('').filter(char => !requiredKeys.has(char));

    if (availableKeys.length === 0) {
        gameState = 'RELEASING';
        startRefReleaseRound();
        return;
    }

    // 使用加權隨機邏輯：優先選擇離目前按住鍵較遠的按鍵
    newKey = selectWeightedKey(availableKeys, requiredKeys);
    currentTargetKey = newKey;

    instructionEl.innerText = `Press & HOLD: ${newKey}`;
    instructionEl.style.color = "#ffeb3b"; // Yellow
    targetDisplay.innerText = newKey;
    targetDisplay.style.color = "#ffeb3b";

    renderHeldKeys();
}

function startRefReleaseRound() {
    // 從目前持有的按鍵中，選擇"最早按下的前 3 個"進行隨機移除
    const heldArray = Array.from(requiredKeys);

    // 如果持有數很少 (例如被扣到只剩0或1)，還是要處理
    // 如果剩0，那就不能Release，改為Press
    if (heldArray.length === 0) {
        gameState = 'PRESSING';
        startPressRound();
        return;
    }

    // 取前 3 個作為候選
    const candidates = heldArray.slice(0, 3);
    const keyToRelease = candidates[Math.floor(Math.random() * candidates.length)];

    currentTargetKey = keyToRelease;

    instructionEl.innerText = `RELEASE: ${keyToRelease}`;
    instructionEl.style.color = "#03A9F4"; // Blue
    targetDisplay.innerText = keyToRelease;
    targetDisplay.style.color = "#03A9F4";

    renderHeldKeys();
}

function gameLoop(timestamp) {
    if (!isPlaying) return;

    const elapsed = timestamp - startTime;
    const remaining = Math.max(0, TIME_LIMIT - elapsed);
    const percentage = (remaining / TIME_LIMIT) * 100;

    timerBar.style.width = `${percentage}%`;

    // 顏色變化
    if (percentage < 30) {
        timerBar.style.backgroundColor = '#e74c3c'; // Red
    } else if (percentage < 60) {
        timerBar.style.backgroundColor = '#f1c40f'; // Yellow
    } else {
        timerBar.style.backgroundColor = '#4CAF50'; // Green
    }

    if (remaining <= 0) {
        handleTimeOut();
        // 重新計時在 nextRound 裡做了，但因為 handleTimeOut 會叫 nextRound，所以這裡不需要 return (除非 end game)
        // 注意 handleTimeOut 可能會結束遊戲
        if (!isPlaying) return;

        // Critical Fix: If we are still playing after timeout (lives > 0), we MUST continue the loop!
        requestAnimationFrame(gameLoop);
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function loseLife(reason) {
    lives--;
    updateLives();

    // Visual Feedback
    gameArea.style.backgroundColor = "#3e1a1a";
    setTimeout(() => {
        gameArea.style.backgroundColor = "";
    }, 100);

    if (lives <= 0) {
        endGame(reason || "No lives left!");
    } else {
        // Show warning/damage
        instructionEl.innerText = reason || "Ouch! Lost a life!";
        instructionEl.style.color = "var(--danger-red)";

        // Force next round to recover
        // If we lost a life, usually good to reset tempo or assist player
        // For Key Release error: Key is already gone, so we just continue
        // For Time Out: We force release to clear buffer

        // Simple logic: If we have many keys, force release. If few, press.
        // Actually, let's stick to the TimeOut logic for TimeOut, but for "Wrong Release", we just continue to next round.
    }
}

function handleTimeOut() {
    loseLife("Time Out!");
    if (lives > 0) {
        if (requiredKeys.size === 0) {
            nextRound(false);
        } else {
            nextRound(true);
        }
    }
}

function handleKeyDown(e) {
    // 如果還沒開始且不再遊戲結束畫面 (其實 GameOver 畫面也是 !isPlaying，但通常會 reload)
    // 這裡我們只處理首次載入的 Any Key Start
    if (!isPlaying && !hasStarted) {
        startGame();
        return;
    }

    if (!isPlaying) return;

    // Prevent default for game keys to avoid scrolling/shortcuts
    // e.preventDefault(); 

    const char = e.key.toUpperCase();

    if (gameState === 'PRESSING') {
        if (char === currentTargetKey) {
            requiredKeys.add(char);
            score++;
            updateScore();
            nextRound();
        }
    }

    renderHeldKeys();
}

function handleKeyUp(e) {
    if (!isPlaying) return;

    const char = e.key.toUpperCase();

    if (gameState === 'RELEASING') {
        if (char === currentTargetKey) {
            requiredKeys.delete(char);
            score++;
            updateScore();
            nextRound();
        } else if (requiredKeys.has(char)) {
            // Wrong key released in Release Phase
            requiredKeys.delete(char); // It's physically released, so we must remove it
            loseLife("Wrong key released!");
            if (lives > 0) {
                renderHeldKeys();
                // Check if we still have the target key? 
                // The target was NOT released (since we are in else if). 
                // So we are still waiting for target. 
                // BUT user might be confused. Let's just prompt new round to reset flow?
                // Or user still needs to release the target?
                // Let's force a new round to be safe/clear.
                nextRound();
            }
        }
    } else {
        if (requiredKeys.has(char)) {
            // Key released in Press Phase (Fat finger slip)
            requiredKeys.delete(char);
            loseLife("Don't let go!");

            if (lives > 0) {
                renderHeldKeys();
                // Determine next step. 
                nextRound();
            }
        }
    }
}

function renderHeldKeys() {
    heldKeysContainer.innerHTML = '';
    requiredKeys.forEach(key => {
        const div = document.createElement('div');
        div.className = 'key';

        if (gameState === 'RELEASING' && key === currentTargetKey) {
            div.style.backgroundColor = '#03A9F4';
            div.style.borderColor = '#0288D1';
            div.style.transform = 'scale(1.1)';
        }

        div.innerText = key;
        heldKeysContainer.appendChild(div);
    });
}

function updateScore() {
    scoreEl.innerText = `Score: ${score}`;
}

function updateLives() {
    let hearts = "";
    for (let i = 0; i < lives; i++) hearts += "❤️";
    livesEl.innerText = hearts;

    // 如果想顯示空心愛心
    for (let i = lives; i < 3; i++) livesEl.innerText += "🖤";
}

function endGame(reason) {
    isPlaying = false;
    gameArea.style.display = 'none';
    timerContainer.style.display = 'none';
    gameOverScreen.style.display = 'block';
    // startBtn.style.display = 'inline-block'; // Removed
    // startBtn.innerText = "重新開始";

    const title = document.querySelector("#game-over-screen h2");
    title.innerText = "GAME OVER";
    title.style.color = "#e74c3c";

    failReason.innerText = reason;
    instructionEl.innerText = "Game Over";
    instructionEl.style.color = "#e74c3c";

    // Submit Score
    submitScore('twister', score);
}

function gameWin() {
    isPlaying = false;
    gameArea.style.display = 'none';
    gameOverScreen.style.display = 'block';
    // startBtn.style.display = 'inline-block';
    // startBtn.innerText = "重新開始";

    const title = document.querySelector("#game-over-screen h2");
    title.innerText = "YOU WIN! 🎉";
    title.style.color = "#4CAF50";

    failReason.innerText = "Mac Hardware Limit Reached! You are a Finger Master!";
    instructionEl.innerText = "Victory!";
    instructionEl.style.color = "#4CAF50";

    // Submit Score
    submitScore('twister', score);
}

function submitScore(gameId, score) {
    fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, score: score }),
    });
}
