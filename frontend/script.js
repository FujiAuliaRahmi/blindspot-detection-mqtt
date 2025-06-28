// frontend/script.js

// --- Konfigurasi IP dan Endpoint ---
const ESP32_CAM_IP = "http://192.168.239.99"; // GANTI JIKA IP ESP32-CAM ANDA BERBEDA

// --- Konfigurasi MQTT ---
const MQTT_BROKER_HOST = "test.mosquitto.org"; // Hostname broker publik (bisa test.mqtt.org atau test.mosquitto.org)
const MQTT_BROKER_PORT = 8080; // Port WebSocket untuk broker publik (untuk browser)
const MQTT_CLIENT_ID = "web_client_" + parseInt(Math.random() * 10000); // ID klien unik

// Topik MQTT (PASTIKAN 'YOUR_UNIQUE_ID' DIGANTI & SAMA DENGAN FIRMWARE ESP ANDA!)
const YOUR_UNIQUE_ID = "skripsi_fuji"; // GANTI INI DENGAN ID UNIK ANDA!
// Menggunakan variabel YOUR_UNIQUE_ID untuk membentuk topik
const TOPIC_OBJECT_DETECTION = `${YOUR_UNIQUE_ID}/blindspot/detection`;
const TOPIC_ULTRASONIC_DISTANCE = `${YOUR_UNIQUE_ID}/blindspot/distance`;
const TOPIC_LED_STATUS = `${YOUR_UNIQUE_ID}/blindspot/led_status`; // Untuk menerima status LED dari ESP

// --- Referensi Elemen HTML ---
const esp32CamStream = document.getElementById("esp32CamStream");
const esp32CamStreamMobile = document.getElementById("esp32CamStreamMobile");
const startSystemButton = document.getElementById("startSystem");
const stopSystemButton = document.getElementById("stopSystem");

const systemStatusIndicator = document.getElementById("systemStatus");
const statusIcon = systemStatusIndicator.querySelector('.bx'); 
const statusText = systemStatusIndicator.querySelector('span');

const objectDetectionLabel = document.getElementById("objectDetectionLabel");
const ultrasonicDistance = document.getElementById("ultrasonicDistance");
const ledStatus = document.getElementById("ledStatus");

const objectDetectionLabelMobile = document.getElementById("objectDetectionLabelMobile");
const ultrasonicDistanceMobile = document.getElementById("ultrasonicDistanceMobile");
const ledStatusMobile = document.getElementById("ledStatusMobile");

const latestObjectData = document.getElementById("latestObjectData");
// const latestObjectTimestamp = document.getElementById("latestObjectTimestamp"); 
const latestDistanceData = document.getElementById("latestDistanceData");
// const latestDistanceTimestamp = document.getElementById("latestDistanceTimestamp"); 

// --- Variabel Global MQTT ---
let mqttClient = null; // Klien MQTT Paho

// --- Helper Functions ---
function updateSystemStatus(status) {
    if (status === "online") {
        systemStatusIndicator.classList.remove("bg-red-600");
        systemStatusIndicator.classList.add("bg-green-600");
        statusIcon.classList.remove('bx-power-off');
        statusIcon.classList.add('bx-check-circle');
        statusText.innerText = "ONLINE";
    } else { // status === "offline"
        systemStatusIndicator.classList.remove("bg-green-600");
        systemStatusIndicator.classList.add("bg-red-600");
        statusIcon.classList.remove('bx-check-circle');
        statusIcon.classList.add('bx-power-off');
        statusText.innerText = "OFFLINE";
    }
}

// Fungsi formatTimestamp dikomentari karena biasanya tidak digunakan dengan MQTT payload sederhana
// function formatTimestamp(isoString) { /* ... */ }


// --- Fungsi untuk Mengatur Video Stream dari ESP32-CAM ---
function startESP32CamStream() {
    esp32CamStream.src = `${ESP32_CAM_IP}/stream`;
    esp32CamStreamMobile.src = `${ESP32_CAM_IP}/stream`;
    console.log("ESP32-CAM stream dimulai dari:", ESP32_CAM_IP);
}

function stopESP32CamStream() {
    esp32CamStream.src = "";
    esp32CamStreamMobile.src = "";
    console.log("ESP32-CAM stream dihentikan.");
}

// --- Fungsi MQTT Client ---

/**
 * Menghubungkan ke broker MQTT.
 */
function connectMqtt() {
    // Pastikan Paho.MQTT sudah dimuat dan tersedia
    if (typeof Paho === 'undefined' || typeof Paho.MQTT === 'undefined' || typeof Paho.MQTT.Client === 'undefined') {
        console.error("Paho MQTT client library not loaded. Retrying in 1 second...");
        // Coba lagi setelah jeda, memberi waktu Paho untuk memuat
        setTimeout(connectMqtt, 1000); 
        return;
    }

    // Inisialisasi klien Paho MQTT
    mqttClient = new Paho.MQTT.Client(MQTT_BROKER_HOST, Number(MQTT_BROKER_PORT), MQTT_CLIENT_ID);

    // Atur callback handlers untuk event MQTT
    mqttClient.onConnectionLost = onConnectionLost;
    mqttClient.onMessageArrived = onMessageArrived;

    // Coba hubungkan klien ke broker
    console.log(`Mencoba terhubung ke MQTT broker: ${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT} dengan Client ID: ${MQTT_CLIENT_ID}`);
    mqttClient.connect({
        onSuccess: onConnect, 
        onFailure: onFailure,
        useSSL: false 
    });
}

/**
 * Callback saat koneksi MQTT berhasil.
 */
function onConnect() {
    console.log("Terhubung ke broker MQTT!");
    updateSystemStatus("online"); 

    // Berlangganan ke topik-topik yang relevan setelah koneksi berhasil
    mqttClient.subscribe(TOPIC_OBJECT_DETECTION);
    mqttClient.subscribe(TOPIC_ULTRASONIC_DISTANCE);
    mqttClient.subscribe(TOPIC_LED_STATUS);
    console.log(`Berlangganan topik: ${TOPIC_OBJECT_DETECTION}, ${TOPIC_ULTRASONIC_DISTANCE}, ${TOPIC_LED_STATUS}`);
}

/**
 * Callback saat koneksi MQTT gagal.
 * @param {Object} responseObject - Objek respons kegagalan.
 */
function onFailure(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error("Gagal terhubung ke broker MQTT: " + responseObject.errorMessage);
        updateSystemStatus("offline");
    }
}

/**
 * Callback saat koneksi MQTT terputus.
 * @param {Object} responseObject - Objek respons koneksi terputus.
 */
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Koneksi MQTT terputus: " + responseObject.errorMessage);
        updateSystemStatus("offline");
        // Coba sambung ulang setelah beberapa detik
        setTimeout(connectMqtt, 5000); 
    }
}

/**
 * Callback saat ada pesan MQTT masuk.
 * Memparsing pesan dan memperbarui UI berdasarkan topik.
 * @param {Paho.MQTT.Message} message - Objek pesan MQTT.
 */
function onMessageArrived(message) {
    console.log(`Pesan MQTT diterima - Topik: ${message.destinationName}, Pesan: ${message.payloadString}`);

    // Logika untuk deteksi objek
    if (message.destinationName === TOPIC_OBJECT_DETECTION) {
        const detectedObject = message.payloadString || "Tidak Terdeteksi";
        objectDetectionLabel.innerText = `Deteksi Objek: ${detectedObject}`;
        objectDetectionLabelMobile.innerText = `Deteksi Objek: ${detectedObject}`;
        latestObjectData.innerText = detectedObject;
    } 
    // Logika untuk jarak ultrasonik
    else if (message.destinationName === TOPIC_ULTRASONIC_DISTANCE) {
        const distanceValue = parseFloat(message.payloadString);
        const distance = !isNaN(distanceValue) ? `${distanceValue.toFixed(1)}` : "--";
        ultrasonicDistance.innerText = `Jarak: ${distance} cm`;
        ultrasonicDistanceMobile.innerText = `Jarak: ${distance} cm`;
        latestDistanceData.innerText = `${distance} cm`;
    } 
    // Logika untuk status LED
    else if (message.destinationName === TOPIC_LED_STATUS) {
        const status = message.payloadString.toUpperCase() || "UNKNOWN";
        ledStatus.innerText = `LED: ${status}`;
        ledStatusMobile.innerText = `LED: ${status}`;
    }
}

// --- Event Listener untuk Tombol Kontrol Sistem ---

/**
 * Event listener untuk tombol "Mulai Sistem".
 * Memulai stream video dan koneksi MQTT.
 */
startSystemButton.addEventListener("click", () => {
    // Hentikan koneksi MQTT yang mungkin sudah berjalan untuk mencegah duplikasi
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.disconnect();
        console.log("Koneksi MQTT lama dihentikan.");
    }
    
    startESP32CamStream(); // Mulai stream video
    connectMqtt();         // Mulai koneksi MQTT
    console.log("Sistem dimulai. Memulai koneksi MQTT.");
});

/**
 * Event listener untuk tombol "Stop Sistem".
 * Menghentikan stream video dan koneksi MQTT, serta mereset UI.
 */
stopSystemButton.addEventListener("click", () => {
    stopESP32CamStream();       // Hentikan stream video
    
    // Putuskan koneksi MQTT jika aktif
    if (mqttClient && mqttClient.isConnected()) {
        mqttClient.disconnect();
        console.log("Koneksi MQTT dihentikan.");
    }
    updateSystemStatus("offline"); // Perbarui status UI ke OFFLINE

    console.log("Sistem dihentikan.");
    // Reset teks label dan data card di UI ke kondisi awal
    objectDetectionLabel.innerText = "Deteksi Objek: Menunggu...";
    ultrasonicDistance.innerText = "Jarak: -- cm";
    ledStatus.innerText = "LED: OFF";
    objectDetectionLabelMobile.innerText = "Deteksi Objek: Menunggu...";
    ultrasonicDistanceMobile.innerText = "Jarak: -- cm";
    ledStatusMobile.innerText = "LED: OFF";

    latestObjectData.innerText = "Tidak ada data";
    latestDistanceData.innerText = "-- cm";
});

// --- Inisialisasi Saat Halaman Dimuat ---
/**
 * Fungsi ini akan dipanggil otomatis saat halaman web selesai dimuat.
 * Digunakan untuk mengatur kondisi awal UI.
 */
window.onload = () => {
    stopSystemButton.click(); // Simulasikan klik tombol stop untuk reset UI dan matikan stream/koneksi
};

