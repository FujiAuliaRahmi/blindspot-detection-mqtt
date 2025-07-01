# Sistem Deteksi Blind Spot Kendaraan berbasis MQTT dan TensorFlow.js

[![Lisensi MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Proyek Tugas Akhir ini adalah sebuah sistem prototipe untuk mendeteksi objek di area *blind spot* (titik buta) kendaraan menggunakan sensor ultrasonik dan kamera. Sistem mengirimkan data melalui protokol MQTT untuk ditampilkan pada antarmuka web secara *real-time*.

![Screenshot Aplikasi](URL_SCREENSHOT_APLIKASI_ANDA.png)
*Ganti URL di atas dengan link screenshot aplikasi Anda setelah diunggah ke GitHub.*

---

##  Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Instalasi dan Penggunaan](#instalasi-dan-penggunaan)
- [Struktur Folder](#struktur-folder)
- [Lisensi](#lisensi)

## Fitur Utama

-   **Deteksi Jarak:** Menggunakan sensor ultrasonik (JSN-SR04T) untuk mengukur jarak objek di belakang kendaraan.
-   **Peringatan Visual:** Memberikan status jenis objek (mobil, pejalan kaki, dan pengendara motor) pada antarmuka web berdasarkan jarak.
-   **Real-time Dashboard:** Menampilkan data jarak dan status LED secara langsung melalui koneksi MQTT (WebSocket).
-   **Deteksi Objek:** Menggunakan TensorFlow.js dengan model yang sudah dilatih (`best_web_model`) untuk mendeteksi objek via kamera.

## Arsitektur Sistem

Sistem ini terdiri dari beberapa komponen utama:
1.  **Perangkat Keras (ESP32/NodeMCU):** Bertugas membaca data dari sensor ultrasonik dan mempublikasikan data tersebut ke MQTT Broker.
2.  **MQTT Broker:** Bertindak sebagai perantara pesan antara perangkat keras dan aplikasi web. (Sebutkan broker yang Anda gunakan, misal: Mosquitto, HiveMQ Cloud).
3.  **Aplikasi Web (Node.js + Frontend):**
    -   **Backend (`server.js`):** Men-serve halaman web statis.
    -   **Frontend (`script.js`):** Berlangganan (subscribe) ke topik MQTT melalui WebSocket dan menampilkan data yang diterima ke `index.html`.

## Teknologi yang Digunakan

-   **Hardware:** ESP32 / NodeMCU
-   **Sensor:** Sensor Ultrasonik HC-SR04
-   **Backend:** Node.js, Express.js
-   **Frontend:** HTML, CSS (Tailwind CSS via CDN), JavaScript
-   **Komunikasi:** MQTT (via Paho MQTT Client)
-   **Machine Learning:** TensorFlow.js (jika digunakan)

## Instalasi dan Penggunaan

Untuk menjalankan proyek ini di lingkungan lokal, ikuti langkah-langkah berikut:

1.  **Clone repositori ini:**
    ```bash
    git clone [https://github.com/NAMA_USER_ANDA/NAMA_REPO_ANDA.git](https://github.com/NAMA_USER_ANDA/NAMA_REPO_ANDA.git)
    cd NAMA_REPO_ANDA
    ```

2.  **Install dependensi backend:**
    ```bash
    npm install
    ```

3.  **Konfigurasi Koneksi**
    Pastikan untuk menyesuaikan konfigurasi MQTT (Broker, Port, Topik) di dalam file `frontend/script.js`.

4.  **Jalankan server Node.js:**
    ```bash
    node server.js
    ```

5.  Buka browser Anda dan akses `http://localhost:3000` (atau port yang Anda gunakan).

6.  Pastikan perangkat keras (ESP32) Anda sudah berjalan dan terhubung ke MQTT Broker yang sama.

## Struktur Folder

├── frontend/
│   ├── index.html      # Struktur halaman web
│   └── script.js       # Logika utama (koneksi MQTT, update DOM)
├── node_modules/       # (Diabaikan oleh Git)
├── best_web_model/     # Model TensorFlow.js (jika ada)
├── .gitignore          # File yang diabaikan Git
├── package.json        # Dependensi & script proyek
├── server.js           # Server backend Express
└── README.md           # Anda sedang membacanya

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk detailnya.