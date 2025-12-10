const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// 遊戲參數
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_Y = canvas.height - 50; // 地面位置
const SPEED_INITIAL = 5;

// 遊戲狀態
let gameSpeed = SPEED_INITIAL;
let score = 0;
let isGameRunning = false;
let isGameOver = false;
let animationId;
let spawnTimer = 0;

// 物件定義
class Player {
    constructor() {
        this.w = 50;
        this.h = 50;
        this.x = 50;
        this.y = GROUND_Y - this.h;
        this.dy = 0; // 垂直速度
        this.isGrounded = true;
        this.color = '#4CAF50'; // Green
    }

    update() {
        // 跳躍/重力物理
        if (this.isGrounded && keys['Jump']) {
            this.dy = JUMP_FORCE;
            this.isGrounded = false;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Obstacle {
    constructor() {
        this.w = 30 + Math.random() * 30; // 寬度隨機
        this.h = 40 + Math.random() * 40; // 高度隨機
        this.x = canvas.width;
        this.y = GROUND_Y - this.h;
        this.color = '#DD2C00'; // Red
        this.markedForDeletion = false;
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
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
    spawnTimer = 0;

    isGameRunning = true;
    isGameOver = false;
    animate();
}

function spawnObstacle() {
    // 隨機生成間隔
    spawnTimer--;
    if (spawnTimer <= 0) {
        obstacles.push(new Obstacle());
        spawnTimer = 60 + Math.random() * 60; // 60~120 frames

        // 隨著分數增加，生成速度變快
        if (gameSpeed < 15) {
            gameSpeed += 0.1;
        }
    }
}

function checkCollision() {
    for (let obs of obstacles) {
        // AABB 碰撞檢測
        if (
            player.x < obs.x + obs.w &&
            player.x + player.w > obs.x &&
            player.y < obs.y + obs.h &&
            player.y + player.h > obs.y
        ) {
            return true;
        }
    }
    return false;
}

function animate() {
    if (!isGameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 畫地面
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();

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
    } else {
        animationId = requestAnimationFrame(animate);
    }
}

function gameOver() {
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
}

// 初始畫面
ctx.fillStyle = '#333';
ctx.font = '30px Arial';
ctx.textAlign = 'center';
ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);

// 畫個地板預覽
ctx.beginPath();
ctx.moveTo(0, GROUND_Y);
ctx.lineTo(canvas.width, GROUND_Y);
ctx.strokeStyle = '#555';
ctx.lineWidth = 2;
ctx.stroke();
