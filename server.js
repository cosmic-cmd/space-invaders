const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ensure the data directory exists (Critical for the PVC mount)
const DATA_DIR = '/data';
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'invaders.db');

// The DB file is created automatically here if it's missing
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('CRITICAL: Could not connect to SQLite:', err.message);
    } else {
        console.log(`AEGIS DATABASE LINKED: ${dbPath}`);
    }
});

// Initialize the table structure
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, 
        score INTEGER, 
        weapon TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET Top Scores
app.get('/api/scores', (req, res) => {
    db.all("SELECT name, score, weapon FROM scores ORDER BY score DESC LIMIT 10", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST New Score
app.post('/api/scores', (req, res) => {
    const { name, score, weapon } = req.body;
    db.run(`INSERT INTO scores (name, score, weapon) VALUES (?, ?, ?)`, [name, score, weapon], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`AEGIS ENGINE ONLINE: Port ${PORT}`);
});