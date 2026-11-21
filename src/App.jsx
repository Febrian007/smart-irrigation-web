import React, { useState, useEffect, useMemo } from 'react';
import { useIrrigation } from './hooks/useIrrigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Cloud,
  Download,
  Droplet,
  FlaskConical,
  History,
  LayoutDashboard,
  LineChart,
  Network,
  Power,
  RefreshCw,
  Save,
  Settings,
  Sliders,
  Wifi,
  X,
} from 'lucide-react';
import {
  AnimatedNumber,
  Card,
  IconBadge,
  LevelBar,
  Pill,
  PulseDot,
  PumpOrb,
  Segmented,
  SENSORS,
  SensorChart,
  SoilGauge,
  Sparkline,
  TONE,
  WaveTank,
} from './components/night';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Grafik', icon: LineChart },
  { id: 'history', label: 'History', icon: History },
  { id: 'control', label: 'Kontrol & Kalibrasi', icon: Sliders },
];

const PUMP_OPTIONS = [
  { id: 'AUTO', label: 'AUTO', icon: RefreshCw, color: TONE.brand },
  { id: 'ON', label: 'ON', icon: Power, color: TONE.mint },
  { id: 'OFF', label: 'OFF', icon: CircleStop, color: TONE.coral },
];

const modeName = (mode) => (mode === 'AUTO' ? 'Otomatis' : `Paksa ${mode}`);

const formatDuration = (sec) => {
  if (!sec || sec < 60) return `${sec || 0} dtk`;
  return `${Math.floor(sec / 60)} mnt ${sec % 60} dtk`;
};

function SectionTitle({ icon, color = TONE.brand, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IconBadge icon={icon} color={color} />
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-2xl border border-line bg-night p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`pressable min-h-9 rounded-xl px-3 text-xs font-bold ${
            value === o.id ? 'bg-brand text-night' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Kartu pompa: bulatan beriak, pilihan mode meluncur, konfirmasi sebelum kirim. */
function PumpCard({ running, mode, seconds, soilThreshold, pendingMode, onPick, onConfirm, onCancel, footer }) {
  return (
    <Card glow={running ? TONE.mint : null} className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <PumpOrb on={running} iconOn={Droplet} iconOff={Power} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-ink">Pompa Siram</h2>
          <p className="text-xs text-ink-2">
            Mode {mode === 'AUTO' ? 'AUTO' : 'MANUAL'} · aktif {formatDuration(seconds)}
          </p>
        </div>
        <Pill color={running ? TONE.mint : TONE.muted} pulse={running}>
          {running ? 'POMPA ON' : 'POMPA OFF'}
        </Pill>
      </div>

      <Segmented
        label="Mode pompa"
        options={PUMP_OPTIONS}
        value={mode}
        onChange={(id) => {
          if (id !== mode) onPick(id);
        }}
      />

      {pendingMode ? (
        <div className="rise-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/10 p-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Ubah mode ke {modeName(pendingMode)}?
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="pressable min-h-9 rounded-xl bg-brand px-4 text-xs font-bold text-night"
            >
              Ya, ubah
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="pressable min-h-9 rounded-xl border border-line px-3 text-xs font-bold text-ink-2 hover:text-ink"
            >
              Batal
            </button>
          </span>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-ink-2">
          {mode === 'AUTO'
            ? `Pompa menyala otomatis saat kelembapan tanah di bawah ${soilThreshold}%.`
            : `Mode manual aktif (${modeName(mode)}). Pilih AUTO untuk kembali otomatis.`}
        </p>
      )}
      {footer}
    </Card>
  );
}

function ThresholdSlider({ id, label, value, onChange, min, max, color, alertColor, current, below, hint }) {
  const live = current !== null && current !== undefined;
  const tone = live && below ? alertColor : color;
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <span className="tabular text-[28px] font-extrabold leading-none tracking-tight" style={{ color }}>
          {value}
          <span className="text-sm">%</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider mt-2"
        style={{ '--fill': fill, '--tone': color }}
      />
      <LevelBar value={live ? current : null} threshold={value} color={tone} />
      <p className="mt-2 text-xs font-medium leading-relaxed" style={{ color: live && below ? alertColor : TONE.muted }}>
        {hint}
      </p>
    </div>
  );
}

export default function App() {
  const {
    state: irrigation,
    setSource,
    connect,
    toggleSimulation,
    sendPumpCommand,
    saveThresholds,
  } = useIrrigation();

  // Koneksi & Simulasi
  const isSimulation = irrigation.simActive;
  const dataSource = irrigation.source;
  const [espIp, setEspIp] = useState(irrigation.url);
  const [firebaseDeviceId, setFirebaseDeviceId] = useState(irrigation.deviceId);
  const isConnected = irrigation.connStatus === 'online';
  const [showConnModal, setShowConnModal] = useState(false);
  const lastUpdatedSec = irrigation.ageSec;

  // Data sensor saat ini (null = belum ada pembacaan)
  const sensors = {
    soil: irrigation.readings.soil,
    tank: irrigation.readings.tank,
    temp: irrigation.readings.temp,
    humidity: irrigation.readings.hum,
  };
  const live = sensors.soil !== null && sensors.soil !== undefined;

  // Kontrol pompa & kalibrasi
  const pumpMode = irrigation.mode === 'manual_on' ? 'ON' : irrigation.mode === 'manual_off' ? 'OFF' : 'AUTO';
  const [pendingMode, setPendingMode] = useState(null);
  const soilThreshold = irrigation.thresholds.soil;
  const tankThreshold = irrigation.thresholds.tank;
  const [inputSoilThresh, setInputSoilThresh] = useState(soilThreshold);
  const [inputTankThresh, setInputTankThresh] = useState(tankThreshold);
  useEffect(() => {
    setInputSoilThresh(soilThreshold);
    setInputTankThresh(tankThreshold);
  }, [soilThreshold, tankThreshold]);
  const [toastMsg, setToastMsg] = useState(null);

  const [activeChartSensors, setActiveChartSensors] = useState({
    soil: true,
    tank: true,
    temp: true,
    humidity: true,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('LIVE');
  const [pumpLogFilter, setPumpLogFilter] = useState('ALL');

  // Riwayat untuk grafik & tabel log (lama → baru)
  const history = useMemo(() => {
    if (!irrigation.logs.length) return [];
    return [...irrigation.logs].reverse().map((row) => ({
      time: new Date(row.ts).toLocaleTimeString('id-ID', { hour12: false }),
      soil: row.soil ?? 0,
      tank: row.tank ?? 0,
      temp: row.temp ?? 0,
      humidity: row.hum ?? 0,
      pump: row.pump ? 'ON' : 'OFF',
    }));
  }, [irrigation.logs]);

  // Status pompa aktual (proteksi tangki kosong ikut dihitung)
  const isPumpRunning = useMemo(() => {
    if (irrigation.readings.tank !== null && irrigation.readings.tank <= tankThreshold) return false;
    return irrigation.pump;
  }, [irrigation.pump, irrigation.readings.tank, tankThreshold]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveCalibration = async (e) => {
    e.preventDefault();
    const sVal = Math.max(0, Math.min(100, Number(inputSoilThresh) || 0));
    const tVal = Math.max(0, Math.min(100, Number(inputTankThresh) || 0));
    try {
      await saveThresholds({ soil: sVal, tank: tVal });
      setInputSoilThresh(sVal);
      setInputTankThresh(tVal);
      triggerToast('Ambang batas kalibrasi berhasil disimpan!');
    } catch (error) {
      triggerToast(error.message || 'Gagal menyimpan ambang batas');
    }
  };

  const confirmPumpChange = async () => {
    if (!pendingMode) return;
    try {
      await sendPumpCommand(
        pendingMode === 'AUTO'
          ? { type: 'mode', value: 'auto' }
          : { type: 'pump', value: pendingMode === 'ON' ? 'on' : 'off' },
      );
      triggerToast(`Mode pompa diubah ke ${modeName(pendingMode)}`);
    } catch (error) {
      triggerToast(error.message || 'Perintah pompa gagal dikirim');
    }
    setPendingMode(null);
  };

  const toggleChartSensor = (key) => {
    setActiveChartSensors((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[key]) return prev; // minimal 1 sensor aktif
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Data grafik sesuai rentang waktu
  const filteredChartData = useMemo(() => {
    if (timeRange === 'LIVE' || !live) return history;
    const now = new Date();
    const stepMs = timeRange === '15M' ? 60 * 1000 : timeRange === '1H' ? 5 * 60 * 1000 : 2 * 3600 * 1000;
    const points = [];
    for (let i = 11; i >= 0; i--) {
      const t = new Date(now.getTime() - i * stepMs);
      const timeStr = timeRange === '24H' ? `${String(t.getHours()).padStart(2, '0')}:00` : t.toTimeString().slice(0, 5);
      points.push({
        time: timeStr,
        soil: Number((sensors.soil + Math.sin(i * 0.7) * 5).toFixed(1)),
        tank: Number(Math.min(100, Math.max(5, sensors.tank + (11 - i) * 0.4)).toFixed(1)),
        temp: Number((sensors.temp + Math.cos(i * 0.5) * 1.4).toFixed(1)),
        humidity: Number((sensors.humidity + Math.sin(i * 0.4) * 4).toFixed(1)),
      });
    }
    return points;
  }, [timeRange, history, live, sensors.soil, sensors.tank, sensors.temp, sensors.humidity]);

  const sensorStats = useMemo(() => {
    const result = {};
    Object.keys(SENSORS).forEach((k) => {
      const vals = filteredChartData.map((d) => d[k]);
      if (!vals.length) {
        result[k] = { min: '--', max: '--', avg: '--' };
        return;
      }
      result[k] = {
        min: Math.min(...vals).toFixed(1),
        max: Math.max(...vals).toFixed(1),
        avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
      };
    });
    return result;
  }, [filteredChartData]);

  const filteredLogs = useMemo(() => {
    const reversed = [...history].reverse();
    if (pumpLogFilter === 'ALL') return reversed;
    return reversed.filter((row) => row.pump === pumpLogFilter);
  }, [history, pumpLogFilter]);

  const handleExportCSV = () => {
    const header = 'Waktu,Suhu (C),Kelembapan Udara (%),Kelembapan Tanah (%),Level Tangki (%),Pompa\n';
    const rows = filteredLogs
      .map((r) => `${r.time},${r.temp},${r.humidity},${r.soil},${r.tank},${r.pump}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat-irigasi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('File CSV riwayat berhasil diunduh!');
  };

  const handleConnect = async () => {
    try {
      await connect({ url: espIp, deviceId: firebaseDeviceId });
      setShowConnModal(false);
      triggerToast(dataSource === 'firebase' ? 'Menghubungkan ke Firebase…' : `Menghubungkan ke ${espIp}…`);
    } catch (error) {
      triggerToast(error.message || 'Koneksi gagal');
    }
  };

  const handleSimulationToggle = () => {
    toggleSimulation();
    triggerToast(isSimulation ? 'Mode simulasi dimatikan' : 'Mode simulasi diaktifkan');
  };

  // Turunan untuk tampilan
  const connColor = isSimulation ? TONE.brand : isConnected ? TONE.mint : TONE.amber;
  const connLabel = isSimulation
    ? 'Mode Simulasi Aktif'
    : isConnected
    ? dataSource === 'firebase'
      ? `Firebase (${firebaseDeviceId})`
      : `ESP32 (${espIp.replace(/^https?:\/\//, '')})`
    : irrigation.connInfo || 'Belum terhubung';
  const soilDry = live && sensors.soil < soilThreshold;
  const soilColor = soilDry ? TONE.amber : TONE.mint;
  const tankLow = live && sensors.tank !== null && sensors.tank <= tankThreshold;
  const tankColor = tankLow ? TONE.coral : TONE.brand;
  const hot = live && sensors.temp > 35;
  const spark = (key) => history.map((h) => h[key]);

  return (
    <div className="min-h-screen font-sans text-ink">
      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          className="rise-in fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-line bg-panel-hi px-4 py-3 text-sm font-semibold text-ink shadow-2xl"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal koneksi */}
      {showConnModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConnModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conn-title"
            className="rise-in w-full max-w-md rounded-t-[28px] border border-line bg-panel p-6 shadow-2xl sm:rounded-[28px]"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconBadge icon={Wifi} color={TONE.brand} />
                <h3 id="conn-title" className="text-lg font-extrabold tracking-tight">
                  Koneksi Sistem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnModal(false)}
                aria-label="Tutup"
                className="pressable flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-panel-hi hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div role="group" aria-label="Sumber data" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-night p-1">
                {[
                  { id: 'sse', label: 'Lokal (ESP32)', icon: Network },
                  { id: 'firebase', label: 'Jarak Jauh (Firebase)', icon: Cloud },
                ].map((s) => {
                  const Icon = s.icon;
                  const selected = dataSource === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSource(s.id)}
                      className={`pressable flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold ${
                        selected ? 'bg-brand text-night' : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="conn-target" className="mb-1.5 block text-xs font-semibold text-ink-2">
                  {dataSource === 'firebase' ? 'Firebase Device ID' : 'Alamat IP ESP32'}
                </label>
                <input
                  id="conn-target"
                  type="text"
                  value={dataSource === 'firebase' ? firebaseDeviceId : espIp}
                  onChange={(e) =>
                    dataSource === 'firebase' ? setFirebaseDeviceId(e.target.value) : setEspIp(e.target.value)
                  }
                  placeholder={dataSource === 'firebase' ? 'esp32-kebun-01' : 'http://192.168.137.10'}
                  className="h-12 w-full rounded-2xl border border-line bg-night px-4 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand"
                />
              </div>

              <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!isSimulation) toggleSimulation();
                    setShowConnModal(false);
                    triggerToast('Beralih ke Mode Simulasi');
                  }}
                  className="pressable min-h-12 rounded-2xl border border-line px-4 text-sm font-bold text-ink hover:bg-panel-hi"
                >
                  Gunakan Simulasi
                </button>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-night"
                >
                  <Wifi className="h-4 w-4" aria-hidden="true" />
                  Hubungkan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-night/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="h-11 w-11 shrink-0 overflow-hidden rounded-[14px] border border-line"
              style={{ boxShadow: '0 0 20px -4px rgba(139, 147, 255, 0.55)' }}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f56b8" />
                    <stop offset="55%" stopColor="#28358a" />
                    <stop offset="100%" stopColor="#0e6478" />
                  </linearGradient>
                  <radialGradient id="dropGrad" cx="35%" cy="55%" r="60%">
                    <stop offset="0%" stopColor="#48d5a8" />
                    <stop offset="55%" stopColor="#14a77b" />
                    <stop offset="100%" stopColor="#0d8763" />
                  </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#logoBgGrad)" />
                <path
                  d="M50 30 C50 30 30 53 30 65 C30 76 39 84 50 84 C61 84 70 76 70 65 C70 53 50 30 50 30 Z"
                  fill="url(#dropGrad)"
                />
                <path
                  d="M50 49 C49 34 39 28 26 28 C27 42 36 50 48.2 51.5 L48.2 66 C48.2 67.2 49 68 50 68 C51 68 51.8 67.2 51.8 66 L51.8 51.5 C64 50 73 42 74 28 C61 28 51 34 50 49 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold leading-tight tracking-tight sm:text-lg">
                Smart Irrigation Monitor
              </h1>
              <p className="flex items-center gap-2 text-xs text-ink-2">
                <PulseDot color={connColor} active={live} size={6} />
                <span className="truncate">{connLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConnModal(true)}
              aria-label="Atur koneksi perangkat"
              className="pressable flex h-11 items-center gap-2 rounded-full border border-line bg-panel px-3.5 text-xs font-bold text-ink hover:border-brand/60"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Koneksi</span>
            </button>
            <button
              type="button"
              onClick={handleSimulationToggle}
              aria-pressed={isSimulation}
              className={`pressable flex h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-bold ${
                isSimulation
                  ? 'border-brand bg-brand text-night shadow-[0_0_20px_-4px_rgba(139,147,255,0.7)]'
                  : 'border-line bg-panel text-ink hover:border-brand/60'
              }`}
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Simulasi
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        {/* Peringatan tangki */}
        {tankLow && (
          <div className="rise-in flex items-center gap-3 rounded-2xl border border-coral/50 bg-coral/10 px-4 py-3 text-sm font-bold text-coral">
            <PulseDot color={TONE.coral} size={9} />
            PERINGATAN: Level air tangki di bawah ambang batas! Segera isi ulang.
          </div>
        )}

        {/* Navigasi tab */}
        <div className="flex flex-col justify-between gap-3 rounded-[26px] border border-line bg-panel p-1.5 sm:flex-row sm:items-center">
          <nav aria-label="Bagian" className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pressable flex min-h-12 shrink-0 items-center gap-2 rounded-[20px] px-4 text-sm font-bold ${
                    isActive ? 'bg-brand text-night' : 'text-ink-2 hover:bg-panel-hi hover:text-ink'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {tab.id === 'history' && !isActive && history.length > 0 && (
                    <span className="tabular rounded-full bg-brand/15 px-1.5 text-[11px] font-extrabold text-brand">
                      {history.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-3 px-3 pb-1.5 sm:justify-end sm:pb-0">
            <Pill color={isPumpRunning ? TONE.mint : TONE.muted} pulse={isPumpRunning}>
              POMPA {isPumpRunning ? 'ON' : 'OFF'} · {pumpMode}
            </Pill>
            <span className="flex items-center gap-1.5 text-xs text-ink-2">
              <RefreshCw
                className={`h-3.5 w-3.5 text-mint ${live ? 'animate-spin' : ''}`}
                style={{ animationDuration: '4s' }}
                aria-hidden="true"
              />
              {lastUpdatedSec === null || lastUpdatedSec === undefined ? 'belum ada data' : `${lastUpdatedSec} dtk lalu`}
            </span>
          </div>
        </div>

        {/* ==================== DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div key="dashboard" className="rise-in space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Kartu utama: tanah */}
              {live ? (
                <Card glow={soilColor} className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6 lg:col-span-5">
                  <SoilGauge value={sensors.soil} threshold={soilThreshold} color={soilColor} />
                  <div className="w-full min-w-0 flex-1">
                    <Pill color={soilColor} pulse>
                      {soilDry ? 'KERING' : 'LEMBAP'}
                    </Pill>
                    <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight">
                      {soilDry ? 'Tanah kering' : 'Tanah lembap'}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">
                      {isPumpRunning
                        ? 'Pompa sedang menyiram lahan.'
                        : soilDry
                        ? `Di bawah ambang ${soilThreshold}%, lahan perlu disiram.`
                        : `Di atas ambang ${soilThreshold}%, belum perlu disiram.`}
                    </p>
                    <div className="mt-3">
                      <Sparkline values={spark('soil')} color={soilColor} height={44} />
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="flex flex-col justify-center gap-4 p-6 lg:col-span-5">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={Activity} color={TONE.brand} size={46} />
                    <h2 className="text-xl font-extrabold tracking-tight">Belum ada data sensor</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-2">
                    Hubungkan ke ESP32 atau nyalakan Mode Simulasi untuk melihat dashboard bekerja.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowConnModal(true)}
                      className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-night"
                    >
                      <Wifi className="h-4 w-4" aria-hidden="true" />
                      Hubungkan
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulationToggle}
                      className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line text-sm font-bold text-ink hover:bg-panel-hi"
                    >
                      <FlaskConical className="h-4 w-4" aria-hidden="true" />
                      Simulasi
                    </button>
                  </div>
                </Card>
              )}

              {/* Suhu, kelembapan udara, tangki */}
              <div className="grid grid-cols-2 gap-5 lg:col-span-7">
                {[
                  {
                    key: 'temp',
                    color: hot ? TONE.coral : TONE.amber,
                    badge: hot ? 'Panas' : 'Normal',
                    badgeColor: hot ? TONE.coral : TONE.mint,
                  },
                  { key: 'humidity', color: TONE.sky, badge: 'Udara', badgeColor: TONE.sky },
                ].map((t) => {
                  const cfg = SENSORS[t.key];
                  return (
                    <Card key={t.key} className="flex flex-col p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <IconBadge icon={cfg.icon} color={t.color} size={38} />
                        {live && (
                          <Pill color={t.badgeColor} dot={false}>
                            {t.badge}
                          </Pill>
                        )}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-ink-2">{cfg.label}</p>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <AnimatedNumber
                          value={live ? sensors[t.key] : null}
                          className="text-3xl font-extrabold leading-tight tracking-tight"
                        />
                        <span className="text-sm font-bold text-ink-2">{cfg.unit}</span>
                      </div>
                      <div className="mt-auto pt-2">
                        <Sparkline values={spark(t.key)} color={t.color} />
                      </div>
                    </Card>
                  );
                })}

                <Card glow={tankLow ? TONE.coral : null} className="col-span-2 flex items-center gap-5 p-4 sm:p-5">
                  <WaveTank
                    level={live ? sensors.tank : null}
                    threshold={tankThreshold}
                    color={tankColor}
                    className="h-[108px] w-[84px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-2">{SENSORS.tank.label}</p>
                      {live && (
                        <Pill color={tankLow ? TONE.coral : TONE.mint} pulse={tankLow}>
                          {tankLow ? 'RENDAH' : 'AMAN'}
                        </Pill>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <AnimatedNumber
                        value={live ? sensors.tank : null}
                        className="text-4xl font-extrabold leading-tight tracking-tight"
                      />
                      <span className="text-base font-bold text-ink-2">%</span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-ink-3">Ambang &lt; {tankThreshold}%</p>
                    <div className="mt-2">
                      <Sparkline values={spark('tank')} color={tankColor} height={28} />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Card className="p-5 sm:p-6 lg:col-span-2">
                <SectionTitle icon={Activity} title="Tren Sensor Real-Time">
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className="pressable min-h-9 rounded-xl px-2 text-xs font-bold text-brand hover:underline"
                  >
                    Buka Grafik Lengkap →
                  </button>
                </SectionTitle>
                <div className="mt-4">
                  <SensorChart data={history} activeSensors={activeChartSensors} />
                </div>
              </Card>

              <PumpCard
                running={isPumpRunning}
                mode={pumpMode}
                seconds={irrigation.pumpSeconds}
                soilThreshold={soilThreshold}
                pendingMode={pendingMode}
                onPick={setPendingMode}
                onConfirm={confirmPumpChange}
                onCancel={() => setPendingMode(null)}
                footer={
                  <button
                    type="button"
                    onClick={() => setActiveTab('control')}
                    className="pressable mt-auto min-h-9 text-center text-xs font-bold text-brand hover:underline"
                  >
                    Atur Kalibrasi Ambang Batas →
                  </button>
                }
              />
            </div>
          </div>
        )}

        {/* ==================== GRAFIK ==================== */}
        {activeTab === 'analytics' && (
          <div key="analytics" className="rise-in space-y-5">
            <Card className="p-5 sm:p-6">
              <SectionTitle
                icon={LineChart}
                title="Analitik & Grafik Semua Sensor"
                subtitle="Pilih rentang waktu dan nyalakan atau matikan sensor untuk membandingkan data"
              >
                <ChipGroup
                  label="Rentang waktu"
                  value={timeRange}
                  onChange={setTimeRange}
                  options={[
                    { id: 'LIVE', label: 'Live' },
                    { id: '15M', label: '15 Menit' },
                    { id: '1H', label: '1 Jam' },
                    { id: '24H', label: '24 Jam' },
                  ]}
                />
              </SectionTitle>

              <div className="my-5 flex flex-wrap items-center gap-2">
                {Object.entries(SENSORS).map(([key, cfg]) => {
                  const active = activeChartSensors[key];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleChartSensor(key)}
                      className={`pressable flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 text-xs font-bold ${
                        active ? 'text-night' : 'border-line bg-night text-ink-2 hover:text-ink'
                      }`}
                      style={active ? { background: cfg.color, borderColor: cfg.color } : undefined}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              <SensorChart data={filteredChartData} activeSensors={activeChartSensors} />
            </Card>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(SENSORS).map(([key, cfg]) => (
                <Card key={key} className="p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <IconBadge icon={cfg.icon} color={cfg.color} size={34} />
                    <span className="text-sm font-bold">{cfg.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Min', value: sensorStats[key].min },
                      { label: 'Rata-rata', value: sensorStats[key].avg, accent: true },
                      { label: 'Maks', value: sensorStats[key].max },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-line bg-night px-1 py-2">
                        <div className="text-[11px] font-semibold text-ink-2">{s.label}</div>
                        <div className="tabular text-sm font-extrabold" style={s.accent ? { color: cfg.color } : undefined}>
                          {s.value}
                          {s.value !== '--' && cfg.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ==================== HISTORY ==================== */}
        {activeTab === 'history' && (
          <Card key="history" className="rise-in overflow-hidden">
            <div className="border-b border-line p-5 sm:px-6">
              <SectionTitle
                icon={History}
                title="Riwayat Pembacaan Sensor"
                subtitle={`Menampilkan ${filteredLogs.length} catatan telemetri tersimpan`}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <ChipGroup
                    label="Filter status pompa"
                    value={pumpLogFilter}
                    onChange={setPumpLogFilter}
                    options={[
                      { id: 'ALL', label: 'Semua' },
                      { id: 'ON', label: 'Pompa ON' },
                      { id: 'OFF', label: 'Pompa OFF' },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="pressable flex min-h-11 items-center gap-2 rounded-2xl bg-mint px-4 text-xs font-bold text-night"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export CSV
                  </button>
                </div>
              </SectionTitle>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-night/60 text-[11px] font-bold uppercase tracking-wider text-ink-2">
                    <th className="px-6 py-3.5">Waktu</th>
                    <th className="px-4 py-3.5">Suhu (°C)</th>
                    <th className="px-4 py-3.5">Kelembapan Udara (%)</th>
                    <th className="px-4 py-3.5">Kelembapan Tanah (%)</th>
                    <th className="px-4 py-3.5">Level Air (%)</th>
                    <th className="px-6 py-3.5 text-right">Status Pompa</th>
                  </tr>
                </thead>
                <tbody className="tabular divide-y divide-line/60 font-mono text-sm">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center font-sans text-ink-2">
                        Belum ada data riwayat untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((row, idx) => (
                      <tr key={`${row.time}-${idx}`} className="transition-colors hover:bg-panel-hi/50">
                        <td className="px-6 py-3 font-semibold text-ink">{row.time}</td>
                        <td className="px-4 py-3 font-semibold text-amber">{row.temp}</td>
                        <td className="px-4 py-3 font-semibold text-sky">{row.humidity}</td>
                        <td className="px-4 py-3 font-semibold text-mint">{row.soil}</td>
                        <td className="px-4 py-3 font-semibold text-brand">{row.tank}</td>
                        <td className="px-6 py-3 text-right font-sans">
                          <Pill color={row.pump === 'ON' ? TONE.mint : TONE.muted} dot={false}>
                            {row.pump}
                          </Pill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ==================== KONTROL & KALIBRASI ==================== */}
        {activeTab === 'control' && (
          <div key="control" className="rise-in grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <PumpCard
              running={isPumpRunning}
              mode={pumpMode}
              seconds={irrigation.pumpSeconds}
              soilThreshold={soilThreshold}
              pendingMode={pendingMode}
              onPick={setPendingMode}
              onConfirm={confirmPumpChange}
              onCancel={() => setPendingMode(null)}
              footer={
                <div className="flex items-center justify-between rounded-2xl border border-line bg-night px-4 py-3 text-xs">
                  <span className="text-ink-2">Proteksi tangki kosong</span>
                  <span className="font-bold text-mint">Aktif (&lt; {tankThreshold}%)</span>
                </div>
              }
            />

            <Card as="form" onSubmit={handleSaveCalibration} className="space-y-5 p-5 sm:p-6">
              <SectionTitle
                icon={Sliders}
                title="Kalibrasi Ambang Batas"
                subtitle="Atur batas otomatis pompa & peringatan tangki"
              />
              <ThresholdSlider
                id="thr-soil"
                label="Ambang Kelembapan Tanah"
                value={inputSoilThresh}
                onChange={setInputSoilThresh}
                min={10}
                max={85}
                color={TONE.mint}
                alertColor={TONE.amber}
                current={live ? sensors.soil : null}
                below={live && sensors.soil < inputSoilThresh}
                hint={
                  !live
                    ? 'Pompa AUTO menyala bila kelembapan tanah di bawah ambang ini.'
                    : sensors.soil < inputSoilThresh
                    ? `Saat ini ${sensors.soil.toFixed(1)}%, di bawah ambang: pompa AUTO menyala.`
                    : `Saat ini ${sensors.soil.toFixed(1)}%, di atas ambang: pompa AUTO mati.`
                }
              />
              <div className="border-t border-line" />
              <ThresholdSlider
                id="thr-tank"
                label="Ambang Level Air Tangki"
                value={inputTankThresh}
                onChange={setInputTankThresh}
                min={5}
                max={50}
                color={TONE.brand}
                alertColor={TONE.coral}
                current={live ? sensors.tank : null}
                below={live && sensors.tank < inputTankThresh}
                hint={
                  !live
                    ? 'Peringatan muncul bila level air tangki di bawah ambang ini.'
                    : sensors.tank < inputTankThresh
                    ? `Saat ini ${sensors.tank.toFixed(1)}%, di bawah ambang: peringatan aktif.`
                    : `Saat ini ${sensors.tank.toFixed(1)}%, tangki masih aman.`
                }
              />
              <button
                type="submit"
                className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-night"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Simpan Ambang ke ESP32
              </button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
