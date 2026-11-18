export function TopBar({ source, simActive, connStatus, connInfo }) {
  const isFb = source === 'firebase' && !simActive;
  const srcName = simActive ? 'Simulasi' : isFb ? 'Firebase' : 'Lokal (SSE)';

  let dotClass = 'dot';
  if (connStatus === 'online') dotClass += ' online';
  else if (connStatus === 'connecting') dotClass += ' warn';
  else if (connStatus === 'error') dotClass += ' danger';

  return (
    <header className="topbar">
      <h1 className="topbar-title">Irigasi Otomatis</h1>
      <div className="live-indicator" aria-live="polite">
        <span className={dotClass} />
        <span>{srcName} &bull; {connInfo}</span>
      </div>
    </header>
  );
}
