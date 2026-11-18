import { useEffect, useState } from 'react';

export function ThresholdFormCard({ thresholds, onSave }) {
  const [soil, setSoil] = useState(String(thresholds.soil));
  const [tank, setTank] = useState(String(thresholds.tank));
  const [status, setStatus] = useState(null); // { type: 'ok'|'err', text }

  useEffect(() => {
    setSoil(String(thresholds.soil));
    setTank(String(thresholds.tank));
  }, [thresholds.soil, thresholds.tank]);

  const sNum = Number(soil);
  const tNum = Number(tank);
  const valid =
    soil.trim() !== '' &&
    tank.trim() !== '' &&
    !Number.isNaN(sNum) &&
    !Number.isNaN(tNum) &&
    sNum >= 0 &&
    sNum <= 100 &&
    tNum >= 0 &&
    tNum <= 100;
  const dirty = sNum !== thresholds.soil || tNum !== thresholds.tank;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) {
      setStatus({ type: 'err', text: 'Nilai ambang harus 0–100' });
      return;
    }
    try {
      await onSave({ soil: sNum, tank: tNum });
      setStatus({ type: 'ok', text: 'Tersimpan' });
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus({ type: 'err', text: 'Gagal menyimpan' });
    }
  };

  return (
    <section className="panel col-7" aria-label="Kalibrasi Ambang">
      <div className="card-head">
        <label className="lbl">Kalibrasi Ambang Kontrol</label>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="thresh-grid">
          <div className="field-group">
            <label className="lbl" htmlFor="soilThreshInput">Ambang Tanah (%)</label>
            <input
              id="soilThreshInput"
              className="mono"
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              value={soil}
              onChange={(e) => setSoil(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label className="lbl" htmlFor="tankThreshInput">Ambang Tangki (%)</label>
            <input
              id="tankThreshInput"
              className="mono"
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              value={tank}
              onChange={(e) => setTank(e.target.value)}
            />
          </div>
        </div>
        <div className="thresh-actions">
          <span className={`inline-msg ${status ? status.type : ''}`} aria-live="polite">
            {status?.type === 'ok' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {status?.text || ''}
          </span>
          <button className="btn-accent" type="submit" disabled={!(valid && dirty)}>
            Simpan
          </button>
        </div>
      </form>
    </section>
  );
}
