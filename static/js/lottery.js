document.addEventListener('DOMContentLoaded', () => {
    // 遊戲設定
    const GAME_DURATION = 60; // 遊戲時間 (秒)

    // DOM 元素
    const timerDisplay = document.getElementById('timer-value');
    const scoreDisplay = document.getElementById('score-value');
    const drawBtn = document.getElementById('draw-btn');
    const resultDisplay = document.getElementById('result-display');
    const cells = document.querySelectorAll('.grid-cell');
    const gameMessage = document.getElementById('game-message');
    const messageBox = document.getElementById('message-box');

    // 遊戲變數
    let score = 0;
    let timeLeft = GAME_DURATION;
    let timerInterval = null;
    let isPlaying = false;
    let hasStarted = false;
    let isAnimating = false;

    // 數字顏色狀態 (Key: 數字 1-9, Value: 'green', 'red', 'yellow', or '')
    let cellColors = {};

    // 初始化
    function init() {
        score = 0;
        timeLeft = GAME_DURATION;
        hasStarted = false;
        isPlaying = false;
        isAnimating = false;

        updateDisplay();

        // 重置格子的樣式
        cells.forEach(cell => {
            cell.className = 'grid-cell'; // reset classes
        });

        // 初始化顏色
        randomizeColors();

        resultDisplay.textContent = '-';
        drawBtn.disabled = false;
        drawBtn.textContent = "抽獎 (G)";
    }

    // 更新顯示
    function updateDisplay() {
        scoreDisplay.textContent = score;
        timerDisplay.textContent = timeLeft;
    }

    // 開始遊戲計時
    function startTimer() {
        if (hasStarted) return;

        hasStarted = true;
        isPlaying = true;
        messageBox.style.display = 'block';
        gameMessage.textContent = "遊戲中...";

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
            }
            updateDisplay();

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    // 結束遊戲
    function endGame() {
        clearInterval(timerInterval);
        isPlaying = false;
        // 確保動畫結束後才完全鎖定，如果剛好在動畫中結束，draw邏輯會處理
        if (!isAnimating) {
            drawBtn.disabled = true;
            drawBtn.textContent = "遊戲結束";
        }
        gameMessage.textContent = "時間到！";
        // 為了避免 alert 阻擋 UI 更新，延遲一下
        setTimeout(() => {
            alert(`遊戲結束！你的總分是：${score}`);

            // 傳送分數到後端
            fetch('/api/score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_id: 'Lottery',
                    score: score
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        console.log('Score saved successfully!');
                    } else {
                        console.error('Error saving score:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });


        }, 100);
    }

    // 隨機分配顏色
    function randomizeColors() {
        // 先清除所有顏色 class
        cells.forEach(cell => {
            cell.classList.remove('green', 'red', 'yellow');
        });

        // 為每個數字 1-9 分配顏色
        for (let i = 1; i <= 9; i++) {
            const rand = Math.random();
            let color = '';

            // 機率設定: 15% 綠, 15% 紅, 10% 黃, 60% 無
            if (rand < 0.15) color = 'green';
            else if (rand < 0.30) color = 'red';
            else if (rand < 0.40) color = 'yellow';

            cellColors[i] = color;

            if (color) {
                const cell = document.querySelector(`.grid-cell[data-number="${i}"]`);
                if (cell) cell.classList.add(color);
            }
        }
    }

    // 抽獎邏輯 (含動畫)
    function draw() {
        if (!hasStarted) {
            startTimer();
        }

        if ((!isPlaying && timeLeft <= 0) || isAnimating) return;

        isAnimating = true;
        drawBtn.disabled = true; // 鎖定按鈕

        // 重置結果顯示區的顏色 (避免殘留上一次的顏色)
        resultDisplay.className = '';

        // 動畫效果：快速跳動數字
        let animateCount = 0;
        const maxAnimateFrames = 10; // 動畫跑幾次 (每次 100ms => 1秒)
        const animateInterval = setInterval(() => {
            // 隨機亮起一個格子作為視覺效果
            const randNum = Math.floor(Math.random() * 9) + 1;
            highlightCell(randNum, false); // false = 不要持久，只是動畫閃爍
            resultDisplay.textContent = randNum;

            animateCount++;
            if (animateCount >= maxAnimateFrames) {
                clearInterval(animateInterval);
                finalizeDraw();
            }
        }, 100);
    }

    // 結算抽獎
    function finalizeDraw() {
        // 如果遊戲在動畫期間結束了
        if (timeLeft <= 0) {
            isAnimating = false;
            drawBtn.disabled = true;
            drawBtn.textContent = "遊戲結束";
            return;
        }

        // 決定最終數字
        const drawnNumber = Math.floor(Math.random() * 9) + 1;
        resultDisplay.textContent = drawnNumber;
        highlightCell(drawnNumber, true); // true = 最終結果

        // 應用顏色效果
        const color = cellColors[drawnNumber];
        let effectMsg = "";

        // 更新結果顯示區的顏色
        resultDisplay.className = ''; // 清除舊 class
        if (color) {
            resultDisplay.classList.add(color);
        }

        if (color === 'green') {
            timeLeft += 3;
            effectMsg = " (+3秒)";
            // 視覺提示
            showFloatingText(drawnNumber, "+3s", "green");
        } else if (color === 'red') {
            score -= drawnNumber;
            effectMsg = " (扣分)";
            showFloatingText(drawnNumber, `-${drawnNumber}`, "red");
        } else if (color === 'yellow') {
            score += drawnNumber * 2;
            effectMsg = " (雙倍!)";
            showFloatingText(drawnNumber, `+${drawnNumber * 2}`, "yellow");
        } else {
            score += drawnNumber; // 普通
        }

        updateDisplay();

        // 變更所有格子顏色 (下一輪使用)
        randomizeColors();

        // 解鎖
        isAnimating = false;
        drawBtn.disabled = false;
        drawBtn.focus(); // 保持 focus 以便連打 (如果需要)
    }

    // 格子亮起效果
    function highlightCell(number, isFinal) {
        // 移除所有 active
        cells.forEach(cell => cell.classList.remove('active'));

        const targetCell = document.querySelector(`.grid-cell[data-number="${number}"]`);
        if (targetCell) {
            targetCell.classList.add('active');

            // 如果不是最終結果，動畫後會自動被下一次 active 移除，或者我們可以用 timeout 移除
            // 為了讓動畫流暢，這裡不做移除，交給下一次 highlight 處理
        }
    }

    // 顯示浮動文字 (簡易實作)
    function showFloatingText(number, text, colorType) {
        // 這裡可以實作更複雜的動畫，目前先印在 console 或更改 message
        const toggleColor = {
            'green': '#2ecc71',
            'red': '#e74c3c',
            'yellow': '#f1c40f'
        };
        gameMessage.textContent = `抽到 ${number}${text ? " " + text : ""}`;
        gameMessage.style.color = toggleColor[colorType] || '#fff';

        // 1秒後恢復
        setTimeout(() => {
            gameMessage.textContent = "遊戲中...";
            gameMessage.style.color = '#fff';
        }, 1500);
    }

    // 按鈕動畫
    function animateButton() {
        drawBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            drawBtn.style.transform = 'scale(1)';
        }, 100);
    }

    // 事件監聽
    drawBtn.addEventListener('click', draw);

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.key.toLowerCase() === 'g') {
            // 防止 Enter 觸發 click 導致重複
            e.preventDefault();
            draw();
        }
    });

    // 初始化
    init();
});
