import { useState } from 'react';

export function ConnectionBar({
  source,
  initialUrl,
  deviceId,
  simActive,
  onSourceChange,
  onConnect,
  onToggleSim,
}) {
  const [url, setUrl] = useState(initialUrl);
  const [firebaseDeviceId, setFirebaseDeviceId] = useState(deviceId);
  const isFb = source === 'firebase' && !simActive;

  return (
    <>
      <section className="panel conn-bar" aria-label="Pengaturan koneksi">
        <div className="field-group">
          <label className="lbl" htmlFor="sourceSelect">Sumber Data</label>
          <select
            id="sourceSelect"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
          >
            <option value="firebase">Jarak Jauh (Firebase)</option>
            <option value="sse">Lokal (SSE ESP32)</option>
          </select>
        </div>

        {!isFb ? (
          <div className="field-group grow">
            <label className="lbl" htmlFor="urlInput">Alamat IP ESP32</label>
            <input
              id="urlInput"
              className="mono"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.137.10"
            />
          </div>
        ) : (
          <div className="field-group" style={{ minWidth: 180 }}>
            <label className="lbl" htmlFor="deviceIdInput">Device ID</label>
            <input id="deviceIdInput" className="mono" type="text" value={firebaseDeviceId} onChange={(e) => setFirebaseDeviceId(e.target.value)} />
          </div>
        )}

        <button
          className="btn-accent"
          type="button"
          disabled={isFb}
          onClick={() => onConnect({ url, deviceId: firebaseDeviceId })}
        >
          Hubungkan
        </button>

        <button
          className="btn-toggle"
          type="button"
          aria-pressed={simActive}
          onClick={onToggleSim}
        >
          Mode Simulasi
        </button>
      </section>

      {isFb && (
        <section className="panel firebase-info" aria-live="polite">
          <h2>Mode Jarak Jauh (Firebase) &mdash; Belum dikonfigurasi</h2>
          <ol>
            <li>Buat proyek di Firebase Console dan aktifkan <strong>Realtime Database</strong>.</li>
            <li>Isi <code>FIREBASE_CONFIG</code> pada <code>src/adapters/irrigationAdapter.js</code>.</li>
            <li>Tentukan <code>deviceId</code> perangkat ESP32 Anda, lalu hubungkan kembali.</li>
          </ol>
        </section>
      )}
    </>
  );
}
