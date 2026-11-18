export function TelemetryLogTable({ logs }) {
  const fmt = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(1) : '--');

  return (
    <section className="panel col-12" aria-label="Log Pembacaan Terbaru">
      <div className="card-head">
        <label className="lbl">Log Pembacaan Terbaru</label>
        <span className="stale-text">Maks. 50 baris</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th className="num">Suhu (&deg;C)</th>
              <th className="num">Kelembapan (%)</th>
              <th className="num">Tanah (%)</th>
              <th className="num">Level Air (%)</th>
              <th>Pompa</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-log">
                  Menunggu data sensor&hellip; Masukkan IP ESP32 lalu klik <strong>Hubungkan</strong>, atau aktifkan <strong>Mode Simulasi</strong>.
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.ts}>
                  <td className="time">{new Date(row.ts).toLocaleTimeString('id-ID')}</td>
                  <td className="num">{fmt(row.temp)}</td>
                  <td className="num">{fmt(row.hum)}</td>
                  <td className="num">{fmt(row.soil)}</td>
                  <td className="num">{fmt(row.tank)}</td>
                  <td>
                    <span className={`status-badge ${row.pump ? 'ok' : ''}`}>
                      {row.pump ? 'ON' : 'OFF'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
