// server.js
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 5000; // Port untuk API Anda

// --- Middleware ---
app.use(cors()); // Aktifkan CORS untuk semua origin (untuk pengembangan)
app.use(bodyParser.json()); // Untuk mem-parsing JSON body dari request
app.use(bodyParser.urlencoded({ extended: true })); // Untuk mem-parsing URL-encoded body

// --- Inisialisasi Database SQLite ---
let db = new sqlite3.Database('./blindspot.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Terhubung ke database SQLite.');
});

// Buat tabel jika belum ada
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
    // Tabel untuk status LED (kita simpan status terakhir di sini)
    db.run(`CREATE TABLE IF NOT EXISTS led_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT, -- 'ON' atau 'OFF'
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

// --- Endpoint API ---

// 1. Menerima data deteksi objek dari ESP32-CAM (HTTP POST)
app.post('/detection_upload', (req, res) => {
    const { object_name } = req.body; // Asumsi ESP32 mengirim JSON: { "object_name": "Kendaraan" }
    if (!object_name) {
        return res.status(400).json({ error: 'object_name is required' });
    }

    db.run(`INSERT INTO object_detection (object_name) VALUES (?)`, [object_name], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Detection data received', id: this.lastID });
    });
});

// 2. Menerima data jarak ultrasonik dari NodeMCU ESP8266 (HTTP POST)
app.post('/distance_upload', (req, res) => {
    const { distance_cm } = req.body; // Asumsi NodeMCU mengirim JSON: { "distance_cm": 123.45 }
    if (typeof distance_cm === 'undefined') {
        return res.status(400).json({ error: 'distance_cm is required' });
    }

    db.run(`INSERT INTO ultrasonic_distance (distance_cm) VALUES (?)`, [distance_cm], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Distance data received', id: this.lastID });
    });
});

// 3. Menyediakan data deteksi objek terbaru untuk Website (HTTP GET)
app.get('/detection', (req, res) => {
    db.get(`SELECT object_name, timestamp FROM object_detection ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ object: row.object_name, timestamp: row.timestamp });
        } else {
            res.json({ object: "Tidak Ada Data", timestamp: null });
        }
    });
});

// 4. Menyediakan data jarak ultrasonik terbaru untuk Website (HTTP GET)
app.get('/distance', (req, res) => {
    db.get(`SELECT distance_cm, timestamp FROM ultrasonic_distance ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ distance_cm: row.distance_cm, timestamp: row.timestamp });
        } else {
            res.json({ distance_cm: "--", timestamp: null });
        }
    });
});

// 5. Menyediakan status LED terbaru untuk Website (HTTP GET)
app.get('/led/status', (req, res) => {
    db.get(`SELECT status, timestamp FROM led_status ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ status: row.status, timestamp: row.timestamp });
        } else {
            res.json({ status: "OFF", timestamp: null }); // Default OFF
        }
    });
});

// 6. Endpoint untuk NodeMCU mengambil perintah LED (HTTP GET)
// NodeMCU akan GET endpoint ini dan mengupdate status LED-nya.
app.get('/led/command', (req, res) => {
    db.get(`SELECT status FROM led_status ORDER BY timestamp DESC LIMIT 1`, (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            res.json({ command: row.status }); // Kirim perintah 'ON' atau 'OFF'
        } else {
            res.json({ command: "OFF" }); // Default command OFF
        }
    });
});

// 7. Endpoint untuk mengupdate status LED dari API (misal dari logika backend, atau admin web)
// Contoh: Anda bisa membuat endpoint `/led/toggle` di website admin yang memanggil API ini.
// Untuk skripsi Anda, mungkin ini akan otomatis berdasarkan data jarak/deteksi.
app.post('/led/update', (req, res) => {
    const { status } = req.body; // Asumsi JSON: { "status": "ON" } atau { "status": "OFF" }
    if (!status || (status.toUpperCase() !== 'ON' && status.toUpperCase() !== 'OFF')) {
        return res.status(400).json({ error: 'Status must be ON or OFF' });
    }

    db.run(`INSERT INTO led_status (status) VALUES (?)`, [status.toUpperCase()], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: `LED status set to ${status.toUpperCase()}`, id: this.lastID });
    });
});


// --- Mulai Server ---
app.listen(port, () => {
    console.log(`API Blind Spot berjalan di http://localhost:${port}`);
    console.log(`IP lokal Anda (jika terhubung ke jaringan): ${getIpAddress()}:${port}`);
});

// Fungsi bantu untuk mendapatkan IP lokal (untuk memudahkan koneksi dari ESP)
function getIpAddress() {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if ('IPv4' === iface.family && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}