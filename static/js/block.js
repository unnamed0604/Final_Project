
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

let rightPressed = false;
let leftPressed = false;

// --- 音效系統 (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// 簡單的 8-bit 音效產生器
function playSound(type, freq, duration) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type; // 'square', 'sawtooth', 'triangle', 'sine'
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // 音量包絡 (Envelope)
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); // 防止網頁捲動

        // 如果遊戲結束，按下空白鍵重新開始
        if (isGameOver) {
            location.reload();
            return;
        }

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
                    score += wave;
                    scoreElement.innerText = score;
                    activeBricks--;

                    // 音效: 高音短促 (8-bit style)
                    playSound('square', 600 + Math.random() * 200, 0.1);

                    // 難度提升：每打掉一個磚塊，球速增加，擋板也變快
                    ball.speed += 0.15; // 球速微幅增加
                    paddle.speed += 0.1; // 擋板速度微幅增加 (跟上球速)

                    // 重新正規化速度向量 (確保 dx, dy 符合新的 speed)
                    // 保持原本的方向 (Angle)，但長度變長
                    let angle = Math.atan2(ball.dy, ball.dx);
                    ball.dx = Math.cos(angle) * ball.speed;
                    ball.dy = Math.sin(angle) * ball.speed;
                }
            }
        }
    }

    // 檢查是否該波次結束 (磚塊全清)
    if (activeBricks === 0) {
        // 下一波
        wave++;
        // 過關獎勵：稍微重置一點速度 (可選，或繼續變快)
        // 為了避免過快，每波結束可以稍微降一點點回氣，或者保持
        // 這裡選擇不重置
        resetGameForNextWave();
    }
}

function resetGameForNextWave() {
    ball.isAttached = true;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;

    // 重生磚塊
    initBricks();

    // Wave 增加時的額外提速 (可選)
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
        drawMessage("GAME OVER", "red", "Press SPACE to Restart");
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
        // 碰到頂部
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        }
        // 碰到擋板 (Paddle Collision)
        // 判斷球的下緣是否接觸到擋板的上緣
        else if (
            ball.dy > 0 && // 球必須是向下掉
            ball.y + ball.radius >= paddle.y && // 球碰到了擋板高度
            ball.y - ball.radius <= paddle.y + paddle.height && // 球還沒完全穿過擋板
            ball.x + ball.radius >= paddle.x && // 水平範圍判定
            ball.x - ball.radius <= paddle.x + paddle.width
        ) {
            // 強制設定球的位置在擋板上方，避免黏住或穿透
            ball.y = paddle.y - ball.radius;

            // --- 新的反彈物理 ---
            // 透過擊球點決定反彈角度 (Rebound Angle)，而非直接加減 DX
            // 1. 計算擊球點相對於板子中心的偏移量 (範圍 -1 ~ 1)
            let center = paddle.x + paddle.width / 2;
            let hitPoint = ball.x - center;
            let normalizeHit = hitPoint / (paddle.width / 2);

            // 2. 決定反彈角度 (最大 60度 = PI/3)
            let bounceAngle = normalizeHit * (Math.PI / 3);

            // 3. 根據角度重新計算向量，確保合速度恆等於 ball.speed
            // 注意：這裡必須強制設為往上 (-y)，不能用 atan2(原本的向下向量)
            ball.dx = ball.speed * Math.sin(bounceAngle);
            ball.dy = -ball.speed * Math.cos(bounceAngle);

            // 音效: 低音 (Bounce)
            playSound('triangle', 300, 0.15);
        }
        // 掉到底部 (Game Over)
        else if (ball.y - ball.radius > canvas.height) {
            isGameOver = true;
            // Submit Score
            submitScore('block', score);
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

function submitScore(gameId, score) {
    fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, score: score }),
    });
}

update();
