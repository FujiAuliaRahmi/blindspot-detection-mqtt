// server.js
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path'); // <-- [1] TAMBAHAN PENTING

const app = express();
// [4] Port disesuaikan untuk Vercel, dengan fallback ke 5000 untuk lokal
const port = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- [2] TAMBAHAN PENTING UNTUK MENYAJIKAN WEBSITE ---
// Memberitahu Express untuk menyajikan file statis (seperti script.js, style.css)
// dari dalam folder 'frontend'.
app.use(express.static(path.join(__dirname, 'frontend')));

// --- Inisialisasi Database SQLite ---
// [5] Perbaikan path database untuk Vercel.
// Vercel hanya memperbolehkan penulisan di direktori /tmp
const dbPath = process.env.VERCEL ? '/tmp/blindspot.db' : './blindspot.db';
let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log(`Terhubung ke database SQLite di: ${dbPath}`);
});


// Buat tabel jika belum ada (tidak ada perubahan di sini)
db.serialize(() => {
    // Tabel untuk deteksi objek
    db.run(`CREATE TABLE IF NOT EXISTS object_detection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Tabel untuk jarak ultrasonik
    db.run(`CREATE TABLE IF NOT EXISTS ultrasonic_distance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        distance_cm REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Tabel untuk status LED
    db.run(`CREATE TABLE IF NOT EXISTS led_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Inisialisasi status LED jika tabel kosong
    db.get("SELECT COUNT(*) AS count FROM led_status", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }
        if (row.count === 0) {
            db.run("INSERT INTO led_status (status) VALUES (?)", ["OFF"], function(err) {
                if (err) {
                    console.error("Error inserting initial LED status:", err.message);
                } else {
                    console.log("Initial LED status 'OFF' inserted.");
                }
            });
        }
    });

    console.log('Tabel database dicek/dibuat.');
});

// --- Endpoint API (TIDAK ADA PERUBAHAN SAMA SEKALI) ---

// 1. Menerima data deteksi objek
app.post('/detection_upload', (req, res) => {
    const { object_name } = req.body;
    if (!object_name) {
        return res.status(400).json({ error: 'object_name is required' });
    }
    db.run(`INSERT INTO object_detection (object_name) VALUES (?)`, [object_name], function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.status(201).json({ message: 'Detection data received', id: this.lastID });
    });
});

// 2. Menerima data jarak ultrasonik
app.post('/distance_upload', (req, res) => {
    const { distance_cm } = req.body;
    if (typeof distance_cm === 'undefined') {
        return res.status(400).json({ error: 'distance_cm is required' });
    }
    db.run(`INSERT INTO ultrasonic_distance (distance_cm) VALUES (?)`, [distance_cm], function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.status(201).json({ message: 'Distance data received', id: this.lastID });
    });
});

// 3. Menyediakan data deteksi objek
app.get('/detection', (req, res) => {
    db.get(`SELECT object_name, timestamp FROM object_detection ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(row || { object: "Tidak Ada Data", timestamp: null });
    });
});

// 4. Menyediakan data jarak
app.get('/distance', (req, res) => {
    db.get(`SELECT distance_cm, timestamp FROM ultrasonic_distance ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(row || { distance_cm: "--", timestamp: null });
    });
});

// 5. Menyediakan status LED
app.get('/led/status', (req, res) => {
    db.get(`SELECT status, timestamp FROM led_status ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(row || { status: "OFF", timestamp: null });
    });
});

// 6. Menyediakan perintah LED
app.get('/led/command', (req, res) => {
    db.get(`SELECT status FROM led_status ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json(row || { command: "OFF" });
    });
});

// 7. Mengupdate status LED
app.post('/led/update', (req, res) => {
    const { status } = req.body;
    if (!status || (status.toUpperCase() !== 'ON' && status.toUpperCase() !== 'OFF')) {
        return res.status(400).json({ error: 'Status must be ON or OFF' });
    }
    db.run(`INSERT INTO led_status (status) VALUES (?)`, [status.toUpperCase()], function(err) {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.status(201).json({ message: `LED status set to ${status.toUpperCase()}`, id: this.lastID });
    });
});


// --- [3] TAMBAHAN PENTING UNTUK MENYAJIKAN HALAMAN UTAMA ---
// Rute ini harus berada di bawah semua rute API
// Ini akan mengirimkan file index.html sebagai "fallback" untuk semua permintaan GET
// yang tidak cocok dengan rute API di atas. Inilah yang memperbaiki "Cannot GET /"
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});


// --- Mulai Server ---
app.listen(port, () => {
    console.log(`API Blind Spot berjalan di http://localhost:${port}`);
});

// [6] Menambahkan ini untuk kompatibilitas Vercel
module.exports = app;

// Fungsi bantu getIpAddress tidak diperlukan di Vercel, jadi bisa diabaikan atau dihapus.