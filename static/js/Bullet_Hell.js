
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');

// 遊戲狀態
let score = 0;
let startTime = Date.now();
let isGameOver = false;
let animationId;
let bullets = [];
let bulletSpeedBase = 1; // 基礎速度
let bulletInterval = 100; // 產生頻率
let frameCount = 0;
let nextGreenSpawnTime = 0; // 下次產生綠色子彈的時間 (ms)

// 玩家設定
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 5,
    color: 'yellow',
    faceColor: 'black'
};

// 按鍵狀態
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});




function createBullet() {
    // 根據分數增加難度 (每 100 分增加速度)
    const difficultyMultiplier = 1 + Math.floor(score / 100) * 0.5;
    const speed = bulletSpeedBase * difficultyMultiplier;

    // 定義 8 個方向 (dx, dy)
    // 0: Down (0, 1)
    // 1: Up (0, -1)
    // 2: Right (1, 0)
    // 3: Left (-1, 0)
    // 4: Down-Right (0.707, 0.707)
    // 5: Down-Left (-0.707, 0.707)
    // 6: Up-Right (0.707, -0.707)
    // 7: Up-Left (-0.707, -0.707)

    // 定義每個方向可用的生成邊界 (Sides: 0=Top, 1=Bottom, 2=Left, 3=Right)
    const directions = [
        { dx: 0, dy: speed, validSides: [0] }, // Down -> Spawn at Top
        { dx: 0, dy: -speed, validSides: [1] }, // Up -> Spawn at Bottom
        { dx: speed, dy: 0, validSides: [2] }, // Right -> Spawn at Left
        { dx: -speed, dy: 0, validSides: [3] }, // Left -> Spawn at Right

        { dx: speed * 0.707, dy: speed * 0.707, validSides: [0, 2] }, // Down-Right -> Spawn at Top or Left
        { dx: -speed * 0.707, dy: speed * 0.707, validSides: [0, 3] }, // Down-Left -> Spawn at Top or Right
        { dx: speed * 0.707, dy: -speed * 0.707, validSides: [1, 2] }, // Up-Right -> Spawn at Bottom or Left
        { dx: -speed * 0.707, dy: -speed * 0.707, validSides: [1, 3] } // Up-Left -> Spawn at Bottom or Right
    ];

    // 隨機選一個方向
    const dir = directions[Math.floor(Math.random() * directions.length)];

    // 從該方向合法的邊界中隨機選一個
    const side = dir.validSides[Math.floor(Math.random() * dir.validSides.length)];

    let spawnX, spawnY;

    if (side === 0) { // Top
        spawnX = Math.random() * canvas.width;
        spawnY = -10;
    } else if (side === 1) { // Bottom
        spawnX = Math.random() * canvas.width;
        spawnY = canvas.height + 10;
    } else if (side === 2) { // Left
        spawnX = -10;
        spawnY = Math.random() * canvas.height;
    } else { // Right
        spawnX = canvas.width + 10;
        spawnY = Math.random() * canvas.height;
    }

    bullets.push({
        x: spawnX,
        y: spawnY,
        dx: dir.dx,
        dy: dir.dy,
        radius: 6,
        color: 'red',
        type: 'normal'
    });
}

function createGreenBullet() {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    // 1. 速度成長: 每30秒翻倍 (Base * 2^(t/30))，2分鐘(120s)停止
    const growthTime = Math.min(elapsedSeconds, 120);
    const speedMultiplier = Math.pow(2, growthTime / 30);
    const speed = (bulletSpeedBase * 2) * speedMultiplier;

    // 隨機邊界起點
    const spawnSide = Math.floor(Math.random() * 4);
    let startX, startY;
    if (spawnSide === 0) { startX = Math.random() * canvas.width; startY = -10; } // Top
    else if (spawnSide === 1) { startX = canvas.width + 10; startY = Math.random() * canvas.height; } // Right
    else if (spawnSide === 2) { startX = Math.random() * canvas.width; startY = canvas.height + 10; } // Bottom
    else { startX = -10; startY = Math.random() * canvas.height; } // Left

    // 計算指向玩家的初始角度
    const angle = Math.atan2(player.y - startY, player.x - startX);

    // 隨機曲線方向與半徑 (Angular Speed 決定半徑: R = v / w)
    // w (curveSpeed) 越小，半徑越大
    const curveDir = Math.random() < 0.5 ? 1 : -1;
    const randomCurve = Math.random() * 0.04 + 0.01; // 0.01 ~ 0.05

    bullets.push({
        x: startX,
        y: startY,
        angle: angle,
        speed: speed,
        curveSpeed: randomCurve * curveDir,
        radius: 8,
        color: '#00FF00',
        type: 'green'
    });
}

function updateGreenSpawn() {
    const now = Date.now();
    if (now >= nextGreenSpawnTime) {
        createGreenBullet();

        // 頻率成長 logic
        const elapsedSeconds = (now - startTime) / 1000;
        let freqMultiplier = Math.pow(2, elapsedSeconds / 60);

        let minInterval = 1000 / freqMultiplier;
        let maxInterval = 10000 / freqMultiplier;

        if (maxInterval <= 3000 && minInterval <= 1000) {
            minInterval = 1000;
            maxInterval = 3000;
        } else {
            if (minInterval < 1000) minInterval = 1000;
            if (maxInterval < 3000) maxInterval = 3000;
        }

        const nextInterval = Math.random() * (maxInterval - minInterval) + minInterval;
        nextGreenSpawnTime = now + nextInterval;
    }
}

function updatePlayer() {
    if (keys.ArrowUp && player.y - player.radius > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y + player.radius < canvas.height) player.y += player.speed;
    if (keys.ArrowLeft && player.x - player.radius > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x + player.radius < canvas.width) player.x += player.speed;
}

function drawPlayer() {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 畫臉
    ctx.fillStyle = player.faceColor;
    ctx.beginPath();
    ctx.arc(player.x - 5, player.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 5, player.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x, player.y + 2, 8, 0, Math.PI, false);
    ctx.stroke();
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        if (b.type === 'green') {
            b.angle += b.curveSpeed;
            b.x += Math.cos(b.angle) * b.speed;
            b.y += Math.sin(b.angle) * b.speed;
        } else {
            b.x += b.dx;
            b.y += b.dy;
        }

        // 碰撞檢測
        const dx = player.x - b.x;
        const dy = player.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + b.radius) {
            gameOver();
        }

        // 移除超出畫面的子彈
        if (b.x < -100 || b.x > canvas.width + 100 || b.y < -100 || b.y > canvas.height + 100) {
            bullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    for (const b of bullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateScoreAndTime() {
    if (isGameOver) return;

    const now = Date.now();
    const elapsedMs = now - startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    timeElement.innerText =
        (minutes < 10 ? "0" + minutes : minutes) + ":" +
        (seconds < 10 ? "0" + seconds : seconds);
}


setInterval(() => {
    if (!isGameOver) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const minutes = Math.floor(elapsedSeconds / 60);
        const pointsToAdd = 1 + minutes;

        score += pointsToAdd;
        scoreElement.innerText = score;
    }
}, 1000);


function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "50px Arial";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);

    ctx.font = "30px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 + 50);

    submitScore(score);
}

function submitScore(finalScore) {
    fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: 'Bullet_Hell', score: finalScore }),
    })
        .then(response => response.json())
        .catch((error) => { console.error('Error:', error); });
}

function gameLoop() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayer();
    drawPlayer();

    // 產生紅色子彈
    frameCount++;
    if (frameCount % bulletInterval === 0) {
        createBullet();
    }

    // 產生綠色子彈邏輯
    updateGreenSpawn();

    updateBullets();
    drawBullets();
    updateScoreAndTime();

    animationId = requestAnimationFrame(gameLoop);
}

// 初始化綠色子彈時間
nextGreenSpawnTime = Date.now() + Math.random() * 9000 + 1000;

gameLoop();
