# Setup Firebase Realtime Database

Web dashboard ini memakai Firebase Realtime Database. Dashboard login memakai Firebase Anonymous Authentication. Perangkat ESP32 juga harus dapat membaca perintah dan menulis telemetri ke struktur data yang sama.

## 1. Buat dan konfigurasi Firebase

1. Buat project di Firebase Console, tambahkan aplikasi Web, dan aktifkan **Realtime Database**.
2. Catat `apiKey`, `authDomain`, `databaseURL`, `projectId`, dan `appId` dari konfigurasi aplikasi Web. `databaseURL` harus URL database yang benar untuk region project.
3. Di **Authentication → Sign-in method**, aktifkan **Anonymous**.
4. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya. `VITE_FIREBASE_DEVICE_ID` harus sama dengan ID yang dipakai ESP32.
5. Jalankan `npm install`, lalu `npm run dev`. Setelah mengubah `.env.local`, restart server Vite.

Contoh `.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=project-id.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://project-id-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DEVICE_ID=esp32-kebun-01
```

## 2. Aturan Realtime Database

Jangan biarkan database memakai aturan test mode atau akses publik. Untuk prototipe yang mensyaratkan login Firebase, aturan minimum dapat membatasi akses ke pengguna yang sudah terautentikasi:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

Aturan ini cocok untuk prototipe tertutup. Untuk deployment, batasi akses berdasarkan UID pengguna/perangkat dan jangan mengandalkan `deviceId` sebagai rahasia. ESP32 juga harus terautentikasi agar aturan di atas mengizinkan aksesnya.

## 3. Format data yang dipakai dashboard

Ganti `esp32-kebun-01` dengan ID perangkatmu. Dashboard mendengarkan `devices/{deviceId}/live`:

```json
{
  "temp": 26.8,
  "hum": 48,
  "soil": 41,
  "tank": 64,
  "pump": false,
  "mode": "auto",
  "pumpSeconds": 0,
  "ts": 1795000000000,
  "thresholds": { "soil": 38, "tank": 10 }
}
```

Nama alternatif yang didukung antara lain `temperature`, `humidity`, `soil_moisture`, `water_level`, `irrigation_pump`, dan `pump_mode`.

Dashboard menulis perintah pompa ke `devices/{deviceId}/commands/pump` dengan `mode` bernilai `auto`, `manual_on`, atau `manual_off`; ambang ditulis ke `devices/{deviceId}/config/thresholds`. Firmware ESP32 harus mendengarkan dua lokasi ini, menerapkan perubahan, lalu mempublikasikan status aktual terbaru di `live`.

Dashboard terbuka dalam Mode Simulasi agar tampil seperti mockup. Simulasi hanya menghasilkan data di browser. Untuk menguji Firebase, klik tombol status/gear di header, pilih **Firebase Realtime Database**, isi Device ID, lalu klik **Hubungkan**. Firmware ESP32 harus mendukung struktur data di atas agar telemetri nyata dan perintah pompa berfungsi.
