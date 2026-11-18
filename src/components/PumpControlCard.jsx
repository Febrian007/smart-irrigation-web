import { useState } from 'react';

function formatMMSS(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function PumpControlCard({ pump, mode, pumpPending, pumpError, pumpSeconds, onCommand }) {
  const [confirmCmd, setConfirmCmd] = useState(null);

  let statusText = `Pompa ${pump ? 'ON' : 'OFF'} (${mode === 'auto' ? 'AUTO' : 'MANUAL'})`;
  if (pumpPending) statusText = 'Menunggu konfirmasi perangkat…';
  else if (pumpError) statusText = `Gagal: ${pumpError}`;

  return (
    <section className="panel col-5 pump-sticky-wrap" aria-label="Kontrol Pompa">
      <div className="pump-header">
        <div className="pump-state">
          <span className={`dot ${pump ? 'online' : ''}`} />
          <span>{statusText}</span>
        </div>
        <span className="pump-timer">{formatMMSS(pumpSeconds)}</span>
      </div>

      <div className="seg-control" role="group" aria-label="Mode pompa">
        <button
          className="btn-seg-auto"
          type="button"
          aria-pressed={mode === 'auto'}
          onClick={() => {
            setConfirmCmd(null);
            onCommand({ type: 'mode', value: 'auto' });
          }}
        >
          Otomatis
        </button>
        <button
          className="btn-seg-on"
          type="button"
          aria-pressed={mode === 'manual_on'}
          onClick={() => setConfirmCmd({ type: 'pump', value: 'on', label: 'Konfirmasi: Paksa pompa ON?' })}
        >
          Paksa ON
        </button>
        <button
          className="btn-seg-off"
          type="button"
          aria-pressed={mode === 'manual_off'}
          onClick={() => setConfirmCmd({ type: 'pump', value: 'off', label: 'Konfirmasi: Paksa pompa OFF?' })}
        >
          Paksa OFF
        </button>
      </div>

      {confirmCmd && (
        <div className="confirm-bar" role="alert">
          <span>{confirmCmd.label}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-accent"
              type="button"
              style={{ minHeight: 36, padding: '4px 12px' }}
              onClick={() => {
                const cmd = confirmCmd;
                setConfirmCmd(null);
                onCommand({ type: cmd.type, value: cmd.value });
              }}
            >
              Ya
            </button>
            <button
              type="button"
              style={{ minHeight: 36, padding: '4px 12px' }}
              onClick={() => setConfirmCmd(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
