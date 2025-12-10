from flask import Flask, render_template, request, redirect, session
import sqlite3

app = Flask(__name__)
app.secret_key = "your-secret-key"

# -----------------------------
# 主頁
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")

# -----------------------------
# 登入 / 註冊
# -----------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # 處理登入
        pass
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        # 處理註冊
        pass
    return render_template("register.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# -----------------------------
# 排行榜
# -----------------------------
@app.route("/leaderboard")
def leaderboard():
    return render_template("leaderboard.html")

# -----------------------------
# 遊戲頁面
# -----------------------------
@app.route("/game")
def game(gid):
    
    return render_template("game.html")

# -----------------------------
# 遊戲分數 API
# -----------------------------
@app.route("/api/score", methods=["POST"])
def save_score():
    data = request.json
    game_id = data["game_id"]
    score = data["score"]
    user = session["user"]
    # TODO: save into DB
    return {"status": "success"}

# -----------------------------
# 打磚塊遊戲
# -----------------------------
@app.route("/game_block")
def game_block():
    return render_template("block.html")

# -----------------------------
# 彈幕遊戲
# -----------------------------
@app.route("/game_Bullet_Hell")
def game_Bullet_Hell():
    return render_template("Bullet_Hell.html")

@app.route("/game_snake")
def game_snake():
    return render_template("snake.html")

@app.route("/game_keyboard")
def game_keyboard():
    return render_template("keyboard.html")

@app.route("/game_dino")
def game_dino():
    return render_template("dino.html")

@app.route("/game_twister")
def game_twister():
    return render_template("twister.html")



if __name__ == "__main__":
    app.run(debug=True, port=5000)

