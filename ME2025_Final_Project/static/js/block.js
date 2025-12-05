
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 遊戲變數
let score = 0;
let wave = 1;
let isGameOver = false;
let animationId;

// 擋板
const paddle = {
    width: 100,
    height: 15,
    x: canvas.width / 2 - 50,
    y: canvas.height - 30,
    speed: 8,
    dx: 0,
    color: '#0095DD'
};

// 球
const ball = {
    x: canvas.width / 2,
    y: paddle.y - 10,
    radius: 8,
    speed: 4, // 初始速度調降 (原為 5)
    dx: 4,
    dy: -4,
    color: '#0095DD',
    isAttached: true // 球是否黏在擋板上
};

// 磚塊設定
const stringRowCount = 5;
const brickColumnCount = 9;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 50;
const brickOffsetLeft = 35;

let bricks = [];

function initBricks() {
    bricks = []; // 清空陣列
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < stringRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
    }
}
initBricks();

// 監聽器 (已移除 Mouse 相關監聽)
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (ball.isAttached) {
            ball.isAttached = false;
            // 發射時給予隨機一點的水平速度，避免死板
            ball.dx = ball.speed * (Math.random() < 0.5 ? 1 : -1);
            ball.dy = -ball.speed;
        }
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < stringRowCount; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                // 根據行數給顏色
                ctx.fillStyle = `hsl(${r * 40}, 70%, 50%)`;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function collisionDetection() {
    let activeBricks = 0;

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < stringRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                activeBricks++;
                if (ball.x > b.x && ball.x < b.x + brickWidth && ball.y > b.y && ball.y < b.y + brickHeight) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    score += wave; // 分數根據目前 Wave 決定
                    scoreElement.innerText = score;
                    activeBricks--;
                }
            }
        }
    }

    // 檢查是否該波次結束 (磚塊全清)
    if (activeBricks === 0) {
        // 下一波
        wave++;
        resetGameForNextWave();
    }
}

function resetGameForNextWave() {
    ball.isAttached = true;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;

    // 重生磚塊
    initBricks();

    // 可選：每波增加一點球速
    // ball.speed += 0.5;
}

function drawMessage(text, color, subtext) {
    ctx.font = "40px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    if (subtext) {
        ctx.font = "20px Arial";
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 40);
    }
}

function drawWaveInfo() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText("Wave: " + wave, canvas.width - 8, 20);
}

function update() {
    if (isGameOver) {
        drawMessage("GAME OVER", "red", "Click Restart to play again");
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    drawWaveInfo();
    collisionDetection();

    // 球移動邏輯
    if (!ball.isAttached) {
        // 碰到左右牆壁
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        // 碰到頂部
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        } else if (ball.y + ball.dy > canvas.height - ball.radius) {
            // 碰到擋板
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
                // 強制向上反彈，避免卡住
                ball.dy = -Math.abs(ball.dy);

                // 增加一點難度：根據擊球點改變 X 軸速度
                const hitPoint = ball.x - (paddle.x + paddle.width / 2);
                ball.dx = hitPoint * (0.15 * (ball.speed / 4)); // 稍微調整係數以適應不同速度
            } else if (ball.y - ball.radius > canvas.height) {
                // 掉到底部
                isGameOver = true;
            }
        }

        ball.x += ball.dx;
        ball.y += ball.dy;
    } else {
        // 跟隨擋板
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius;

        // 提示按空白鍵
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Press SPACE to Start", canvas.width / 2, canvas.height / 2 + 50);
    }

    // 鍵盤控制擋板
    if (rightPressed && paddle.x < canvas.width - paddle.width) {
        paddle.x += paddle.speed;
    } else if (leftPressed && paddle.x > 0) {
        paddle.x -= paddle.speed;
    }

    if (ball.isAttached) {
        ball.x = paddle.x + paddle.width / 2;
    }

    requestAnimationFrame(update);
}

update();
