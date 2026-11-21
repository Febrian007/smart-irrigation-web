import React, { useEffect, useId, useRef, useState } from 'react';
import { Clock, Droplets, Sprout, Thermometer, Waves } from 'lucide-react';

// Warna & label sensor: sama dengan aplikasi Flutter.
export const SENSORS = {
  soil: { label: 'Kelembapan Tanah', short: 'Tanah', color: '#2EE6A6', unit: '%', icon: Sprout },
  tank: { label: 'Level Air Tangki', short: 'Air', color: '#8B93FF', unit: '%', icon: Waves },
  temp: { label: 'Suhu Udara', short: 'Suhu', color: '#FFB648', unit: '°C', icon: Thermometer },
  humidity: { label: 'Kelembapan Udara', short: 'Udara', color: '#4CC2FF', unit: '%', icon: Droplets },
};

export const TONE = {
  brand: '#8B93FF',
  mint: '#2EE6A6',
  amber: '#FFB648',
  coral: '#FF6B7A',
  sky: '#4CC2FF',
  muted: '#A9B4CF',
};

const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Kartu dasar; `glow` memberi cahaya berwarna sesuai status. */
export function Card({ glow, className = '', children, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`rounded-3xl border bg-panel transition-[border-color,box-shadow] duration-300 ${className}`}
      style={{
        borderColor: glow ? alpha(glow, 0.45) : '#25324F',
        boxShadow: glow ? `0 0 34px -8px ${alpha(glow, 0.35)}` : 'none',
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PulseDot({ color, active = true, size = 7 }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {active && (
        <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: color }} />
      )}
      <span className="relative rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

export function Pill({ color, pulse = false, dot = true, children }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap"
      style={{ background: alpha(color, 0.14), color }}
    >
      {dot && <PulseDot color={color} active={pulse} size={6} />}
      {children}
    </span>
  );
}

export function IconBadge({ icon: Icon, color, size = 40 }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center transition-colors duration-300"
      style={{ width: size, height: size, borderRadius: size * 0.32, background: alpha(color, 0.14), color }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />
    </span>
  );
}

/** Angka yang bergulir halus menuju nilai baru; `null` tampil sebagai "--". */
export function AnimatedNumber({ value, digits = 1, className = '' }) {
  const [shown, setShown] = useState(value ?? 0);
  const fromRef = useRef(value ?? 0);

  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setShown(current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={`tabular ${className}`}>
      {value === null || value === undefined ? '--' : shown.toFixed(digits)}
    </span>
  );
}

/** Gauge busur 270° dengan penanda ambang batas. */
export function SoilGauge({ value, threshold, color, size = 190 }) {
  const gid = useId();
  const live = value !== null && value !== undefined;
  const c = size / 2;
  const r = c - 20;
  const progress = live ? Math.max(0, Math.min(100, value)) : 0;
  const tickAngle = 135 + 270 * (Math.max(0, Math.min(100, threshold)) / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        live
          ? `Kelembapan tanah ${value.toFixed(1)} persen, ambang ${threshold} persen`
          : 'Kelembapan tanah belum ada data'
      }
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#4CC2FF" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <g transform={`rotate(135 ${c} ${c})`} fill="none" strokeLinecap="round" strokeWidth="15">
          <circle cx={c} cy={c} r={r} pathLength="100" stroke="#1B2640" strokeDasharray="75 100" />
          {progress > 0.5 && (
            <circle
              cx={c}
              cy={c}
              r={r}
              pathLength="100"
              stroke={`url(#${gid})`}
              strokeDasharray={`${progress * 0.75} 100`}
              style={{
                transition: 'stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                filter: `drop-shadow(0 0 9px ${alpha(color, 0.65)})`,
              }}
            />
          )}
        </g>
        <line
          x1={c + r - 12}
          y1={c}
          x2={c + r + 12}
          y2={c}
          stroke="#F2F5FF"
          strokeWidth="3.5"
          strokeLinecap="round"
          transform={`rotate(${tickAngle} ${c} ${c})`}
          style={{ transition: 'transform 0.3s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <AnimatedNumber value={live ? value : null} className="text-[42px] font-extrabold leading-none tracking-tight text-ink" />
          <span className="text-lg font-bold text-ink-2">%</span>
        </div>
        <span className="mt-1.5 text-xs font-semibold text-ink-2">Soil Moisture</span>
      </div>
    </div>
  );
}

const WAVE_PATH =
  'M0 8 C 12.5 0, 37.5 0, 50 8 S 87.5 16, 100 8 S 137.5 0, 150 8 S 187.5 16, 200 8 V 24 H 0 Z';

/** Tangki dengan permukaan air bergelombang yang terus bergerak. */
export function WaveTank({ level, threshold, color, className = '' }) {
  const live = level !== null && level !== undefined;
  const pct = live ? Math.max(0, Math.min(100, level)) : 0;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-[22px] border-[1.5px] border-line bg-night ${className}`}
      role="img"
      aria-label={live ? `Tangki terisi ${level.toFixed(1)} persen` : 'Tangki belum ada data'}
    >
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: `${pct}%`, transition: 'height 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        {pct > 0.5 && (
          <>
            <svg
              className="wave-slow absolute -top-2.5 left-0 h-4"
              style={{ width: '200%' }}
              viewBox="0 0 200 24"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={WAVE_PATH} fill={alpha(color, 0.35)} />
            </svg>
            <svg
              className="wave absolute -top-2 left-0 h-4"
              style={{ width: '200%' }}
              viewBox="0 0 200 24"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={WAVE_PATH} fill={color} />
            </svg>
            <div
              className="absolute inset-x-0 bottom-0 top-1.5"
              style={{ background: `linear-gradient(to bottom, ${color}, ${alpha(color, 0.55)})` }}
            />
          </>
        )}
      </div>
      <div
        className="absolute inset-x-2 border-t-2 border-dashed border-ink/85"
        style={{ bottom: `${threshold}%`, transition: 'bottom 0.3s ease-out' }}
      />
    </div>
  );
}

function smoothPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  return d;
}

/** Grafik mini tanpa sumbu untuk tren singkat di dalam kartu. */
export function Sparkline({ values, color, height = 36 }) {
  const gid = useId();
  const w = 200;
  const clean = values.filter((v) => typeof v === 'number');
  if (clean.length < 2) {
    return (
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={height / 2} x2={w} y2={height / 2} stroke={alpha(color, 0.25)} strokeWidth="2" />
      </svg>
    );
  }
  let lo = Math.min(...clean);
  let hi = Math.max(...clean);
  if (hi - lo < 1) {
    const mid = (hi + lo) / 2;
    lo = mid - 0.5;
    hi = mid + 0.5;
  }
  const pad = 4;
  const pts = clean.map((v, i) => ({
    x: (w * i) / (clean.length - 1),
    y: pad + (height - 2 * pad) * (1 - (v - lo) / (hi - lo)),
  }));
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w} ${height} L 0 ${height} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Grafik riwayat interaktif: arahkan kursor atau geser jari untuk membaca nilai. */
export function SensorChart({ data, activeSensors }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const uid = useId();

  const width = 800;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 34, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index) =>
    data.length <= 1 ? padding.left : padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (val) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padding.top + chartHeight - (clamped / 100) * chartHeight;
  };

  const pick = (e) => {
    if (data.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, i)));
  };

  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-night text-sm text-ink-3">
        Menunggu data sensor…
      </div>
    );
  }

  const active = Object.entries(SENSORS).filter(([key]) => activeSensors[key]);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const labelStep = Math.ceil(data.length / 6);

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-pan-y overflow-visible"
        role="img"
        aria-label="Grafik riwayat sensor"
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={padding.left} y1={getY(tick)} x2={width - padding.right} y2={getY(tick)} stroke="#25324F" strokeWidth="1" />
            <text x={padding.left - 10} y={getY(tick) + 4} textAnchor="end" className="fill-ink-3 font-mono text-[11px]">
              {tick}
            </text>
          </g>
        ))}

        {data.map((item, idx) =>
          idx % labelStep !== 0 && idx !== data.length - 1 ? null : (
            <text key={idx} x={getX(idx)} y={height - 8} textAnchor="middle" className="fill-ink-3 font-mono text-[11px]">
              {item.time}
            </text>
          ),
        )}

        {active.map(([key, cfg]) => {
          const points = data.map((d, i) => ({ x: getX(i), y: getY(d[key]) }));
          const line = smoothPath(points);
          const base = padding.top + chartHeight;
          return (
            <g key={key}>
              <defs>
                <linearGradient id={`${uid}-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line} L ${points[points.length - 1].x} ${base} L ${points[0].x} ${base} Z`} fill={`url(#${uid}-${key})`} />
              <path
                d={line}
                fill="none"
                stroke={cfg.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${alpha(cfg.color, 0.55)})` }}
              />
            </g>
          );
        })}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#7C88A6"
              strokeWidth="1.2"
            />
            {active.map(([key, cfg]) => (
              <circle key={key} cx={getX(hoverIndex)} cy={getY(hovered[key])} r="5" fill={cfg.color} stroke="#111A2C" strokeWidth="2.5" />
            ))}
          </g>
        )}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute right-3 top-1 z-10 rounded-2xl border border-line bg-panel-hi/95 p-3 text-xs text-ink shadow-xl backdrop-blur">
          <div className="mb-1.5 flex items-center gap-1.5 border-b border-line pb-1.5 font-mono font-semibold">
            <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
            Pukul {hovered.time}
          </div>
          <div className="space-y-1">
            {active.map(([key, cfg]) => (
              <div key={key} className="flex items-center justify-between gap-5">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                  {cfg.label}
                </span>
                <span className="tabular font-mono font-bold">
                  {Number(hovered[key]).toFixed(1)}
                  {cfg.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pilihan mode pompa dengan penanda yang meluncur ke pilihan aktif. */
export function Segmented({ options, value, onChange, label }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const current = options[index];
  return (
    <div
      role="group"
      aria-label={label}
      className="relative grid h-14 rounded-[18px] border border-line bg-night p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-[14px]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
          background: current.color,
          boxShadow: `0 0 18px -4px ${alpha(current.color, 0.7)}`,
          transition: 'transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1), background-color 0.3s, box-shadow 0.3s',
        }}
      />
      {options.map((o) => {
        const Icon = o.icon;
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.id)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-[14px] text-sm font-extrabold tracking-wide transition-colors ${
              selected ? 'text-night' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bulatan pompa: riak air menyebar selama pompa menyala. */
export function PumpOrb({ on, iconOn: IconOn, iconOff: IconOff }) {
  const Icon = on ? IconOn : IconOff;
  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      {on && (
        <>
          <span className="ripple absolute inset-0 rounded-full bg-mint" />
          <span className="ripple ripple-delay absolute inset-0 rounded-full bg-mint" />
        </>
      )}
      <span
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${
          on ? 'bg-mint text-night' : 'bg-panel-hi text-ink-2'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </span>
  );
}

/** Batang 0–100%: isi = pembacaan saat ini, garis putih = ambang. */
export function LevelBar({ value, threshold, color }) {
  const live = value !== null && value !== undefined;
  return (
    <div className="relative h-[18px]" aria-hidden="true">
      <div className="absolute inset-x-0 top-1.5 h-1.5 rounded-full bg-panel-hi" />
      {live && (
        <div
          className="absolute left-0 top-1.5 h-1.5 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: color,
            transition: 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s',
          }}
        />
      )}
      <div
        className="absolute top-0 h-[18px] w-[3px] rounded-sm bg-ink"
        style={{ left: `calc(${Math.max(0, Math.min(100, threshold))}% - 1.5px)` }}
      />
    </div>
  );
}
