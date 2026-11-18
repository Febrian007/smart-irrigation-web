function Sparkline({ data, width }) {
  if (!data || data.length < 2) {
    return <svg className="sparkline" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = 28 - ((v - min) / span) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} />
    </svg>
  );
}

export function SensorCard({
  label,
  value,
  unit,
  minValid = 0,
  maxValid = 100,
  history,
  compact = false,
  className = '',
  gauge,
}) {
  const isNull = value === null || value === undefined;
  const isInvalid = !isNull && (Number.isNaN(value) || value < minValid || value > maxValid);
  const isValid = !isNull && !isInvalid;

  let badgeText = 'Menunggu';
  let badgeClass = 'status-badge';
  let fillClass = 'gauge-fill';

  if (isInvalid) {
    badgeText = 'Bermasalah';
  } else if (isValid && gauge) {
    const triggered = value < gauge.threshold;
    badgeText = triggered ? gauge.warnText : gauge.okText;
    badgeClass = `status-badge ${triggered ? gauge.warnLevel : 'ok'}`;
    if (triggered) fillClass += gauge.warnLevel === 'danger' ? ' is-danger' : ' is-warn';
  }

  return (
    <section className={`panel sensor-card ${className}`} aria-label={label}>
      <div className="card-head">
        <label className="lbl">{label}</label>
        {gauge && <span className={badgeClass}>{badgeText}</span>}
      </div>

      <div className={`sensor-val ${compact ? 'compact' : ''} ${isInvalid ? 'is-err' : ''}`} aria-live="polite">
        {isInvalid ? (
          'Sensor bermasalah'
        ) : (
          <>
            {isNull ? '--' : value.toFixed(1)}
            <span className="unit">{unit}</span>
          </>
        )}
      </div>

      {gauge && (
        <div className="gauge-wrap">
          <div className="gauge-track">
            <div className={fillClass} style={{ width: isValid ? `${value}%` : '0%' }} />
            <div className="gauge-marker" style={{ left: `${gauge.threshold}%` }} />
          </div>
          <div className="gauge-meta">
            <span>0%</span>
            <span>{gauge.label}: <strong>{gauge.threshold}</strong>%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      <Sparkline data={history} width={compact ? 180 : 240} />
    </section>
  );
}
