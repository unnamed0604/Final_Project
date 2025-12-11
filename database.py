import sqlite3
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_NAME = "database.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with tables if they don't exist."""
    conn = get_db()
    c = conn.cursor()
    
    # Create Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create Scores Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized.")

def add_user(username, password):
    """Register a new user. Returns True if successful, False if username exists."""
    conn = get_db()
    c = conn.cursor()
    password_hash = generate_password_hash(password)
    
    try:
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def verify_user(username, password):
    """Verify user credentials. Returns user dict (id, username) if valid, else None."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        return {'id': user['id'], 'username': user['username']}
    return None

def add_score(user_id, game_name, score):
    """Save a score record."""
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO scores (user_id, game_name, score) VALUES (?, ?, ?)", (user_id, game_name, score))
    conn.commit()
    conn.close()

def get_top_scores(game_name, limit=10):
    """Get top scores for a specific game."""
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT u.username, s.score, s.timestamp 
        FROM scores s
        JOIN users u ON s.user_id = u.id
        WHERE s.game_name = ?
        ORDER BY s.score DESC
        LIMIT ?
    ''', (game_name, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]
