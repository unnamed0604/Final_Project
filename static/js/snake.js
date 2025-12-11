const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 遊戲參數
const gridSize = 20; // 每一格的大小
const tileCount = canvas.width / gridSize; // 橫向/縱向格數 (假設正方形)

// 遊戲變數
let score = 0;
let gameSpeed = 100; // 更新頻率 (ms)
let isGameRunning = false;
let isGameOver = false;
let gameLoopId;

// 蛇
let snake = [
    { x: 10, y: 10 }, // 頭
    { x: 9, y: 10 },  // 身體
    { x: 8, y: 10 }   // 尾巴
];
let velocity = { x: 1, y: 0 }; // 初始向右
let nextVelocity = { x: 1, y: 0 }; // 緩衝下一次轉向，防止快速按鍵導致自我碰撞

// 食物
let food = { x: 15, y: 15 };

// 初始化
function initGame() {
    spawnFood();
    draw();
    drawMessage("Press SPACE to Start", "white");
}

// 監聽鍵盤
document.addEventListener('keydown', keyDownHandler);

function keyDownHandler(e) {
    const key = e.key.toLowerCase();

    // 支援 WASD 與 方向鍵
    if (key === 'arrowup' || key === 'w') {
        if (velocity.y !== 1) nextVelocity = { x: 0, y: -1 };
    } else if (key === 'arrowdown' || key === 's') {
        if (velocity.y !== -1) nextVelocity = { x: 0, y: 1 };
    } else if (key === 'arrowleft' || key === 'a') {
        if (velocity.x !== 1) nextVelocity = { x: -1, y: 0 };
    } else if (key === 'arrowright' || key === 'd') {
        if (velocity.x !== -1) nextVelocity = { x: 1, y: 0 };
    } else if (key === ' ' || key === 'spacebar') {
        if (isGameOver) {
            location.reload();
        } else {
            toggleGame();
        }
    }
}

function toggleGame() {
    if (isGameRunning) {
        clearInterval(gameLoopId);
        isGameRunning = false;
        drawMessage("PAUSED", "yellow");
    } else {
        isGameRunning = true;
        gameLoopId = setInterval(gameLoop, gameSpeed);
    }
}

function gameLoop() {
    update();
    draw();
    // 確保 Game Over 訊息在繪製完蛇之後才畫上去
    if (isGameOver) {
        drawMessage("GAME OVER", "red", "Press Space to Restart");
    }
}

function update() {
    if (isGameOver) return;

    // 應用轉向
    velocity = nextVelocity;

    // 計算新頭部位置
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // 1. 檢查撞牆
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }

    // 2. 檢查撞自己
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // 移動蛇：加入新頭部
    snake.unshift(head);

    // 3. 檢查吃食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.innerText = score;
        spawnFood();
        // 難度增加：稍微加快速度
        if (gameSpeed > 50) {
            clearInterval(gameLoopId);
            gameSpeed -= 2;
            gameLoopId = setInterval(gameLoop, gameSpeed);
        }
    } else {
        // 沒吃到食物，移除尾巴
        snake.pop();
    }
}

function draw() {
    // 背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 畫蛇
    ctx.fillStyle = 'lime';
    for (let i = 0; i < snake.length; i++) {
        // 頭部顏色稍微不同
        if (i === 0) ctx.fillStyle = '#00FF00';
        else ctx.fillStyle = '#00AA00';

        ctx.fillRect(snake[i].x * gridSize, snake[i].y * gridSize, gridSize - 2, gridSize - 2);
    }

    // 畫食物
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function spawnFood() {
    // 隨機位置，不能生成在蛇身上
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * tileCount);
        food.y = Math.floor(Math.random() * tileCount);

        validPosition = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                validPosition = false;
                break;
            }
        }
    }
}

function gameOver() {
    isGameOver = true;
    isGameRunning = false;
    clearInterval(gameLoopId);
    // 不要在這裡 drawMessage，讓 gameLoop 最後畫，避免被 draw() 覆蓋

    // Submit Score
    submitScore('snake', score);
}

function drawMessage(text, color, subtext) {
    ctx.fillStyle = color;
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    if (subtext) {
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 40);
    }
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

// 啟動
initGame();
