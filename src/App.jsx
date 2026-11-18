import { useState } from 'react';
import { useIrrigation } from './hooks/useIrrigation';
import { TopBar } from './components/TopBar';
import { ConnectionBar } from './components/ConnectionBar';
import { SensorCard } from './components/SensorCard';
import { PumpControlCard } from './components/PumpControlCard';
import { ThresholdFormCard } from './components/ThresholdFormCard';
import { TelemetryLogTable } from './components/TelemetryLogTable';

export default function App() {
  const { state, setSource, connect, toggleSimulation, sendPumpCommand, saveThresholds } = useIrrigation();
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const tankLow = state.readings.tank !== null && state.readings.tank < state.thresholds.tank;
  const connBadgeClass =
    state.connStatus === 'online'
      ? 'status-badge ok'
      : state.connStatus === 'connecting'
      ? 'status-badge warn'
      : state.connStatus === 'error'
      ? 'status-badge danger'
      : 'status-badge';

  return (
    <div className="container">
      <TopBar
        source={state.source}
        simActive={state.simActive}
        connStatus={state.connStatus}
        connInfo={state.connInfo}
      />

      <ConnectionBar
        source={state.source}
        initialUrl={state.url}
        deviceId={state.deviceId}
        simActive={state.simActive}
        onSourceChange={setSource}
        onConnect={connect}
        onToggleSim={() => {
          toggleSimulation();
          showToast(state.simActive ? 'Mode Simulasi dimatikan' : 'Mode Simulasi diaktifkan');
        }}
      />

      <div className="meta-strip">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className={connBadgeClass} aria-live="polite">{state.connInfo}</span>
          {tankLow && <span className="status-badge danger">Tangki di bawah ambang</span>}
        </div>
        <span className={`stale-text ${state.isStale ? 'is-stale' : ''}`}>
          {state.ageSec === null ? 'Terakhir diperbarui: --' : `Terakhir diperbarui ${state.ageSec} detik lalu`}
        </span>
      </div>

      <main className="grid-12">
        <SensorCard
          className="col-5 tone-mint"
          label="Kelembapan Tanah"
          value={state.readings.soil}
          unit="%"
          history={state.history.soil}
          gauge={{
            threshold: state.thresholds.soil,
            label: 'Ambang siram',
            warnText: 'Perlu siram',
            okText: 'Normal',
            warnLevel: 'warn',
          }}
        />

        <SensorCard
          className="col-5 tone-primary"
          label="Level Air Tangki"
          value={state.readings.tank}
          unit="%"
          history={state.history.tank}
          gauge={{
            threshold: state.thresholds.tank,
            label: 'Batas aman',
            warnText: 'Hampir kosong',
            okText: 'Aman',
            warnLevel: 'danger',
          }}
        />

        <div className="climate-stack">
          <SensorCard
            className="tone-amber"
            label="Suhu"
            value={state.readings.temp}
            unit="°C"
            minValid={-39}
            maxValid={85}
            history={state.history.temp}
            compact
          />
          <SensorCard
            className="tone-sky"
            label="Kelembapan Udara"
            value={state.readings.hum}
            unit="%"
            history={state.history.hum}
            compact
          />
        </div>

        <PumpControlCard
          pump={state.pump}
          mode={state.mode}
          pumpPending={state.pumpPending}
          pumpError={state.pumpError}
          pumpSeconds={state.pumpSeconds}
          onCommand={async (cmd) => {
            try {
              await sendPumpCommand(cmd);
            } catch {
              showToast('Perintah pompa gagal dikirim');
            }
          }}
        />

        <ThresholdFormCard thresholds={state.thresholds} onSave={saveThresholds} />

        <TelemetryLogTable logs={state.logs} />
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
