from flask import Flask, render_template, request, redirect, session, jsonify
import sqlite3
import database

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
    error = None
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        
        user = database.verify_user(username, password)
        if user:
            session["user"] = user
            return redirect("/")
        else:
            error = "Invalid username or password"
            
    return render_template("login.html", error=error)

@app.route("/register", methods=["GET", "POST"])
def register():
    error = None
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        confirm = request.form["confirm_password"]
        
        if password != confirm:
            error = "Passwords do not match"
        else:
            if database.add_user(username, password):
                return redirect("/login")
            else:
                error = "Username already exists"
                
    return render_template("register.html", error=error)

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
    if "user" not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    data = request.json
    game_id = data.get("game_id")
    score = data.get("score")
    user_id = session["user"]["id"]
    
    if game_id and score is not None:
        database.add_score(user_id, game_id, score)
        return jsonify({"status": "success"})
    
    return jsonify({"status": "error", "message": "Invalid data"}), 400

@app.route("/api/leaderboard/<game_name>")
def get_leaderboard(game_name):
    scores = database.get_top_scores(game_name)
    return jsonify(scores)

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



@app.route("/game_lottery")
def game_lottery():
    return render_template("lottery.html")

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5006)

