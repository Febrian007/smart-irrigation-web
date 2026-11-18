import React, { useState, useEffect, useMemo } from 'react';
import { useIrrigation } from './hooks/useIrrigation';
import {
  Droplets,
  Thermometer,
  Wind,
  Waves,
  Power,
  Settings,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  Square,
  Clock,
  X,
  LayoutDashboard,
  LineChart,
  History,
  Download
} from 'lucide-react';

// Komponen Grafik SVG Responsif & Interaktif tanpa library eksternal berat
const SensorChart = ({ data, activeSensors, isDark }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const sensorConfig = {
    soil: { label: 'Kelembapan Tanah', color: '#10b981', unit: '%' },
    tank: { label: 'Level Air Tangki', color: '#3b82f6', unit: '%' },
    temp: { label: 'Suhu Udara', color: '#f59e0b', unit: '°C' },
    humidity: { label: 'Kelembapan Udara', color: '#8b5cf6', unit: '%' },
  };

  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Skala Y tetap 0 - 100 karena mayoritas persentase & suhu berkisar 0-100
  const maxVal = 100;
  const minVal = 0;

  const getX = (index) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartHeight - ((clamped - minVal) / (maxVal - minVal)) * chartHeight;
  };

  // Membuat path halus (Catmull-Rom / Bezier sederhana)
  const createSmoothPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Grid Horizontal */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isDark ? '#1e293b' : '#e2e8f0'}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className={`text-[11px] font-mono ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Label Sumbu X (Waktu) */}
        {data.map((item, idx) => {
          // Tampilkan label setiap beberapa titik agar tidak bertumpuk
          const step = Math.ceil(data.length / 6);
          if (idx % step !== 0 && idx !== data.length - 1) return null;
          const x = getX(idx);
          return (
            <text
              key={idx}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className={`text-[11px] font-mono ${isDark ? 'fill-slate-400' : 'fill-slate-500'}`}
            >
              {item.time}
            </text>
          );
        })}

        {/* Garis & Area per Sensor Aktif */}
        {Object.entries(sensorConfig).map(([key, cfg]) => {
          if (!activeSensors[key]) return null;
          const points = data.map((d, i) => ({ x: getX(i), y: getY(d[key]) }));
          const linePath = createSmoothPath(points);
          const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${
            padding.top + chartHeight
          } L ${points[0]?.x || 0} ${padding.top + chartHeight} Z`;

          return (
            <g key={key}>
              <defs>
                <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity={isDark ? '0.25' : '0.18'} />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#grad-${key})`} />
              <path
                d={linePath}
                fill="none"
                stroke={cfg.color}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* Garis Vertikal Hover & Titik Aktif */}
        {hoverIndex !== null && data[hoverIndex] && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke={isDark ? '#475569' : '#94a3b8'}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {Object.entries(sensorConfig).map(([key, cfg]) => {
              if (!activeSensors[key]) return null;
              return (
                <circle
                  key={key}
                  cx={getX(hoverIndex)}
                  cy={getY(data[hoverIndex][key])}
                  r="4.5"
                  fill={cfg.color}
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* Area Interaktif Transparan untuk Hover */}
        {data.map((_, idx) => {
          const sliceWidth = chartWidth / Math.max(1, data.length);
          const x = getX(idx) - sliceWidth / 2;
          return (
            <rect
              key={idx}
              x={Math.max(padding.left, x)}
              y={padding.top}
              width={sliceWidth}
              height={chartHeight}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          );
        })}
      </svg>

      {/* Tooltip Melayang saat Hover */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className={`absolute top-2 right-4 z-10 p-3 rounded-xl border shadow-lg backdrop-blur-md text-xs transition-all pointer-events-none ${
            isDark
              ? 'bg-slate-900/90 border-slate-700 text-slate-200'
              : 'bg-white/95 border-slate-200 text-slate-700'
          }`}
        >
          <div className="font-mono font-semibold mb-1.5 pb-1 border-b border-slate-500/20 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Pukul {data[hoverIndex].time}
          </div>
          <div className="space-y-1">
            {Object.entries(sensorConfig).map(([key, cfg]) => {
              if (!activeSensors[key]) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label}:
                  </span>
                  <span className="font-mono font-bold">
                    {data[hoverIndex][key]}
                    {cfg.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const {
    state: irrigation,
    setSource,
    connect,
    toggleSimulation,
    sendPumpCommand,
    saveThresholds,
  } = useIrrigation();
  // Tema Light / Dark
  const [isDark, setIsDark] = useState(() => localStorage.getItem('irrigation-theme') === 'dark');
  useEffect(() => {
    localStorage.setItem('irrigation-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Koneksi & Simulasi
  const isSimulation = irrigation.simActive;
  const dataSource = irrigation.source;
  const [espIp, setEspIp] = useState(irrigation.url);
  const [firebaseDeviceId, setFirebaseDeviceId] = useState(irrigation.deviceId);
  const isConnected = irrigation.connStatus === 'online';
  const [showConnModal, setShowConnModal] = useState(false);
  const lastUpdatedSec = irrigation.ageSec ?? 0;

  // Data Sensor Saat Ini
  const sensors = {
    soil: irrigation.readings.soil ?? 40.3,
    tank: irrigation.readings.tank ?? 64,
    temp: irrigation.readings.temp ?? 26.8,
    humidity: irrigation.readings.hum ?? 47.7,
  };

  // Kontrol Pompa & Kalibrasi
  const pumpMode = irrigation.mode === 'manual_on' ? 'ON' : irrigation.mode === 'manual_off' ? 'OFF' : 'AUTO';
  const [pendingMode, setPendingMode] = useState(null);
  const soilThreshold = irrigation.thresholds.soil;
  const tankThreshold = irrigation.thresholds.tank;
  const [inputSoilThresh, setInputSoilThresh] = useState(String(soilThreshold));
  const [inputTankThresh, setInputTankThresh] = useState(String(tankThreshold));
  useEffect(() => {
    setInputSoilThresh(String(soilThreshold));
    setInputTankThresh(String(tankThreshold));
  }, [soilThreshold, tankThreshold]);
  const [toastMsg, setToastMsg] = useState(null);

  // Filter Sensor pada Grafik
  const [activeChartSensors, setActiveChartSensors] = useState({
    soil: true,
    tank: true,
    temp: true,
    humidity: true,
  });

  // Tab Navigasi Utama di Bagian Atas
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'analytics' | 'history' | 'control'
  const [timeRange, setTimeRange] = useState('LIVE'); // 'LIVE' | '15M' | '1H' | '24H'
  const [pumpLogFilter, setPumpLogFilter] = useState('ALL'); // 'ALL' | 'ON' | 'OFF'

  // Riwayat Data untuk Grafik & Tabel Log
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

  // Status Pompa Aktual (berdasarkan mode & ambang batas)
  const isPumpRunning = useMemo(() => {
    if (irrigation.readings.tank !== null && sensors.tank <= tankThreshold) return false;
    return irrigation.pump;
  }, [irrigation.pump, irrigation.readings.tank, sensors.tank, tankThreshold]);

  // Helper Notifikasi Toast
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Simpan Kalibrasi
  const handleSaveCalibration = async (e) => {
    e.preventDefault();
    const sVal = Math.max(0, Math.min(100, Number(inputSoilThresh) || 0));
    const tVal = Math.max(0, Math.min(100, Number(inputTankThresh) || 0));
    try {
      await saveThresholds({ soil: sVal, tank: tVal });
      setInputSoilThresh(String(sVal));
      setInputTankThresh(String(tVal));
      triggerToast('Ambang batas kalibrasi berhasil disimpan!');
    } catch (error) {
      triggerToast(error.message || 'Gagal menyimpan ambang batas');
    }
  };

  // Konfirmasi Perubahan Mode Pompa
  const confirmPumpChange = async () => {
    if (!pendingMode) return;
    try {
      await sendPumpCommand(pendingMode === 'AUTO'
        ? { type: 'mode', value: 'auto' }
        : { type: 'pump', value: pendingMode === 'ON' ? 'on' : 'off' });
      triggerToast(`Mode pompa diubah ke ${pendingMode === 'AUTO' ? 'Otomatis' : `Paksa ${pendingMode}`}`);
    } catch (error) {
      triggerToast(error.message || 'Perintah pompa gagal dikirim');
    }
    setPendingMode(null);
  };

  const toggleChartSensor = (key) => {
    setActiveChartSensors((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[key]) return prev; // Minimal 1 sensor aktif
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Data Grafik yang disesuaikan dengan Filter Rentang Waktu
  const filteredChartData = useMemo(() => {
    if (timeRange === 'LIVE') return history;
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
  }, [timeRange, history, sensors]);

  // Statistik Min / Max / Rata-rata untuk Tab Analitik
  const sensorStats = useMemo(() => {
    const keys = ['soil', 'tank', 'temp', 'humidity'];
    const result = {};
    keys.forEach((k) => {
      const vals = filteredChartData.map((d) => d[k]);
      const min = Math.min(...vals).toFixed(1);
      const max = Math.max(...vals).toFixed(1);
      const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
      result[k] = { min, max, avg };
    });
    return result;
  }, [filteredChartData]);

  // Filter Log History berdasarkan Status Pompa
  const filteredLogs = useMemo(() => {
    const reversed = [...history].reverse();
    if (pumpLogFilter === 'ALL') return reversed;
    return reversed.filter((row) => row.pump === pumpLogFilter);
  }, [history, pumpLogFilter]);

  // Export CSV Sederhana untuk Tab History
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

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-200/75 text-slate-800'
      }`}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-xl animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Pengaturan Koneksi ESP32 */}
      {showConnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-lg">Konfigurasi Koneksi ESP32</h3>
              </div>
              <button
                onClick={() => setShowConnModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                  Sumber Data
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => setSource(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                >
                  <option value="firebase">Firebase Realtime Database</option>
                  <option value="sse">Lokal (SSE ESP32)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                  {dataSource === 'firebase' ? 'Firebase Device ID' : 'Alamat IP ESP32'}
                </label>
                <input
                  type="text"
                  value={dataSource === 'firebase' ? firebaseDeviceId : espIp}
                  onChange={(e) => dataSource === 'firebase' ? setFirebaseDeviceId(e.target.value) : setEspIp(e.target.value)}
                  placeholder={dataSource === 'firebase' ? 'esp32-kebun-01' : 'http://192.168.137.10'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => {
                    if (!isSimulation) toggleSimulation();
                    setShowConnModal(false);
                    triggerToast('Beralih ke Mode Simulasi');
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Gunakan Simulasi
                </button>
                <button
                  onClick={() => {
                    handleConnect();
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
                >
                  Hubungkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navbar / Header */}
      <header
        className={`sticky top-0 z-30 border-b transition-colors ${
          isDark
            ? 'bg-indigo-950 border-indigo-900 text-white shadow-lg shadow-indigo-950/40'
            : 'bg-indigo-700 border-indigo-800 text-white shadow-md shadow-indigo-900/20'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md ring-1 ring-white/25 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
                {/* Latar Belakang Kotak Membulat */}
                <rect width="100" height="100" rx="22" fill="url(#logoBgGrad)" />
                {/* Tetesan Air Hijau */}
                <path
                  d="M50 30 C50 30 30 53 30 65 C30 76 39 84 50 84 C61 84 70 76 70 65 C70 53 50 30 50 30 Z"
                  fill="url(#dropGrad)"
                />
                {/* Tunas Daun & Batang Putih */}
                <path
                  d="M50 49 C49 34 39 28 26 28 C27 42 36 50 48.2 51.5 L48.2 66 C48.2 67.2 49 68 50 68 C51 68 51.8 67.2 51.8 66 L51.8 51.5 C64 50 73 42 74 28 C61 28 51 34 50 49 Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white">
                Smart Irrigation
              </h1>
              <p className="text-xs text-indigo-200">
                Panel Kontrol & Telemetri IoT
              </p>
            </div>
          </div>

          {/* Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pill Status Koneksi */}
            <button
              onClick={() => setShowConnModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isSimulation
                  ? 'bg-amber-400/20 border-amber-300/40 text-amber-100 hover:bg-amber-400/30'
                  : isConnected
                  ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100 hover:bg-emerald-400/30'
                  : 'bg-rose-500/25 border-rose-300/40 text-rose-100'
              }`}
              title="Klik untuk mengatur koneksi perangkat"
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isSimulation ? 'bg-amber-300' : isConnected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isSimulation ? 'Mode Simulasi' : dataSource === 'firebase' ? `Firebase (${firebaseDeviceId})` : `ESP32 (${espIp.replace('http://', '')})`}
              </span>
              <span className="sm:hidden">{isSimulation ? 'Simulasi' : dataSource === 'firebase' ? 'Firebase' : 'ESP32'}</span>
              <Settings className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Tombol Toggle Simulasi Cepat */}
            <button
              onClick={handleSimulationToggle}
              className="p-2 rounded-xl border bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-medium transition-all"
              title={isSimulation ? 'Jeda Simulasi' : 'Jalankan Simulasi'}
            >
              {isSimulation ? <Square className="w-4 h-4 text-amber-300" /> : <Play className="w-4 h-4 text-emerald-300" />}
            </button>

            {/* Toggle Light / Dark Mode */}
            <button
              onClick={() => setIsDark(!isDark)}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl border bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-100" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Navigation Tabs (Dashboard, Grafik, History, Kontrol) */}
        <div
          className={`p-2 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/30'
          }`}
        >
          {/* Menu Tab */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'analytics', label: 'Grafik', icon: LineChart },
              { id: 'history', label: 'History', icon: History },
              { id: 'control', label: 'Kontrol & Kalibrasi', icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Info Status Singkat & Waktu Pembaruan */}
          <div className="flex items-center justify-between sm:justify-end gap-3 px-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">Pompa:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  isPumpRunning
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : isDark
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isPumpRunning ? 'ON' : 'OFF'} ({pumpMode})
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" style={{ animationDuration: '4s' }} />
              <span>{lastUpdatedSec}d lalu</span>
            </div>
          </div>
        </div>

        {/* ==================== TAB 1: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 4 Kartu Sensor Utama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Kartu 1: Kelembapan Tanah */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                      Kelembapan Tanah
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      sensors.soil < soilThreshold
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-emerald-500/15 text-emerald-500'
                    }`}
                  >
                    {sensors.soil < soilThreshold ? 'Kering' : 'Normal'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-extrabold tracking-tight">{sensors.soil}</span>
                  <span className="text-sm font-medium opacity-60">%</span>
                </div>

                <div className="mt-4">
                  <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-visible">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${sensors.soil}%` }}
                    />
                    <div
                      className="absolute -top-1 w-0.5 h-4 bg-rose-500"
                      style={{ left: `${soilThreshold}%` }}
                      title={`Ambang siram: ${soilThreshold}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] opacity-60 mt-1.5 font-mono">
                    <span>0%</span>
                    <span className="text-emerald-500 font-semibold">Ambang: {soilThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Kartu 2: Level Air Tangki */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Waves className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                      Level Air Tangki
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      sensors.tank <= tankThreshold
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-blue-500/15 text-blue-500'
                    }`}
                  >
                    {sensors.tank <= tankThreshold ? 'Kritis' : 'Aman'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-extrabold tracking-tight">{sensors.tank}</span>
                  <span className="text-sm font-medium opacity-60">%</span>
                </div>

                <div className="mt-4">
                  <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-visible">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${sensors.tank}%` }}
                    />
                    <div
                      className="absolute -top-1 w-0.5 h-4 bg-amber-500"
                      style={{ left: `${tankThreshold}%` }}
                      title={`Batas aman: ${tankThreshold}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] opacity-60 mt-1.5 font-mono">
                    <span>0%</span>
                    <span className="text-blue-500 font-semibold">Batas: {tankThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Kartu 3: Suhu Udara */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                      Suhu Udara
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500">
                    Optimal
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-extrabold tracking-tight">{sensors.temp}</span>
                  <span className="text-sm font-medium opacity-60">°C</span>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-500/10 flex items-center justify-between text-xs opacity-70">
                  <span>Rentang ideal</span>
                  <span className="font-mono font-medium">22°C – 32°C</span>
                </div>
              </div>

              {/* Kartu 4: Kelembapan Udara */}
              <div
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                      <Wind className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-75">
                      Kelembapan Udara
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-500">
                    Stabil
                  </span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-extrabold tracking-tight">{sensors.humidity}</span>
                  <span className="text-sm font-medium opacity-60">%</span>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-500/10 flex items-center justify-between text-xs opacity-70">
                  <span>Titik embun</span>
                  <span className="font-mono font-medium">~15.2°C</span>
                </div>
              </div>
            </div>

            {/* Ringkasan Grafik & Kontrol Cepat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div
                className={`lg:col-span-2 p-5 sm:p-6 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-bold text-base">Tren Sensor Real-Time</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="text-xs font-semibold text-indigo-500 hover:underline"
                  >
                    Buka Grafik Lengkap →
                  </button>
                </div>
                <SensorChart data={history} activeSensors={activeChartSensors} isDark={isDark} />
              </div>

              {/* Kartu Aksi Cepat Pompa */}
              <div
                className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">Status & Aksi Pompa</h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPumpRunning
                          ? 'bg-emerald-500 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isPumpRunning ? 'MENYALA' : 'MATI'}
                    </span>
                  </div>

                  <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Mode saat ini: <strong>{pumpMode}</strong>. Sistem otomatis menyiram saat kelembapan tanah turun di bawah{' '}
                    <strong>{soilThreshold}%</strong>.
                  </p>

                  <div className="space-y-2">
                    {[
                      { id: 'AUTO', label: 'Mode Otomatis (Rekomendasi)' },
                      { id: 'ON', label: 'Paksa Nyalakan Pompa' },
                      { id: 'OFF', label: 'Paksa Matikan Pompa' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => {
                          if (btn.id !== pumpMode) setPendingMode(btn.id);
                        }}
                        className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-all ${
                          pumpMode === btn.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{btn.label}</span>
                        {pumpMode === btn.id && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {pendingMode ? (
                  <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-2 text-xs">
                    <span>Ubah ke {pendingMode}?</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={confirmPumpChange}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold"
                      >
                        Ya
                      </button>
                      <button
                        onClick={() => setPendingMode(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-500/20 font-semibold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveTab('control')}
                    className="mt-4 w-full py-2 text-xs font-semibold text-indigo-500 hover:underline text-center"
                  >
                    Atur Kalibrasi Ambang Batas →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: GRAFIK & ANALITIK ==================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-bold text-lg">Analitik & Grafik Semua Sensor</h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Pilih rentang waktu dan nyalakan/matikan sensor tertentu untuk membandingkan data
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Rentang Waktu */}
                  <div
                    className={`inline-flex p-1 rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/70'
                    }`}
                  >
                    {[
                      { id: 'LIVE', label: 'Live' },
                      { id: '15M', label: '15 Menit' },
                      { id: '1H', label: '1 Jam' },
                      { id: '24H', label: '24 Jam' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTimeRange(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          timeRange === t.id
                            ? isDark
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'bg-white text-slate-900 shadow-sm'
                            : isDark
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Garis Sensor */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {[
                  { key: 'soil', label: 'Kelembapan Tanah (%)', color: '#10b981' },
                  { key: 'tank', label: 'Level Air Tangki (%)', color: '#3b82f6' },
                  { key: 'temp', label: 'Suhu Udara (°C)', color: '#f59e0b' },
                  { key: 'humidity', label: 'Kelembapan Udara (%)', color: '#8b5cf6' },
                ].map((item) => {
                  const active = activeChartSensors[item.key];
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleChartSensor(item.key)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? isDark
                            ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                            : 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm'
                          : 'opacity-45 border-transparent hover:opacity-75'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <SensorChart data={filteredChartData} activeSensors={activeChartSensors} isDark={isDark} />
            </div>

            {/* Ringkasan Statistik Min / Avg / Max */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'soil', title: 'Kelembapan Tanah', unit: '%', color: 'text-emerald-500' },
                { key: 'tank', title: 'Level Tangki', unit: '%', color: 'text-blue-500' },
                { key: 'temp', title: 'Suhu Udara', unit: '°C', color: 'text-amber-500' },
                { key: 'humidity', title: 'Kelembapan Udara', unit: '%', color: 'text-violet-500' },
              ].map((s) => (
                <div
                  key={s.key}
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-70 mb-2">{s.title}</div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                      <div className="text-[10px] opacity-60 font-sans">MIN</div>
                      <div className="text-sm font-bold">{sensorStats[s.key].min}{s.unit}</div>
                    </div>
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                      <div className="text-[10px] opacity-60 font-sans">RATA2</div>
                      <div className={`text-sm font-bold ${s.color}`}>{sensorStats[s.key].avg}{s.unit}</div>
                    </div>
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-50'}`}>
                      <div className="text-[10px] opacity-60 font-sans">MAX</div>
                      <div className="text-sm font-bold">{sensorStats[s.key].max}{s.unit}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: HISTORY / LOG ==================== */}
        {activeTab === 'history' && (
          <div
            className={`rounded-2xl border overflow-hidden transition-all ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
            }`}
          >
            <div className="p-5 sm:px-6 border-b border-slate-300/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg">Riwayat Pembacaan Sensor (History)</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Menampilkan {filteredLogs.length} catatan telemetri tersimpan
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Status Pompa */}
                <div
                  className={`inline-flex p-1 rounded-xl border ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200/70'
                  }`}
                >
                  {[
                    { id: 'ALL', label: 'Semua' },
                    { id: 'ON', label: 'Pompa ON' },
                    { id: 'OFF', label: 'Pompa OFF' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPumpLogFilter(f.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        pumpLogFilter === f.id
                          ? isDark
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Tombol Export CSV */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`text-[11px] font-semibold uppercase tracking-wider border-b ${
                      isDark
                        ? 'bg-slate-800/50 text-slate-400 border-slate-800'
                        : 'bg-slate-50 text-slate-500 border-slate-200/80'
                    }`}
                  >
                    <th className="py-3.5 px-6">Waktu</th>
                    <th className="py-3.5 px-4">Suhu (°C)</th>
                    <th className="py-3.5 px-4">Kelembapan Udara (%)</th>
                    <th className="py-3.5 px-4">Kelembapan Tanah (%)</th>
                    <th className="py-3.5 px-4">Level Air (%)</th>
                    <th className="py-3.5 px-6 text-right">Status Pompa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10 text-xs sm:text-sm font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center font-sans opacity-60">
                        Belum ada data riwayat untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((row, idx) => (
                      <tr
                        key={`${row.time}-${idx}`}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-6 font-medium">{row.time}</td>
                        <td className="py-3 px-4 text-amber-500 font-semibold">{row.temp}</td>
                        <td className="py-3 px-4 text-violet-500 font-semibold">{row.humidity}</td>
                        <td className="py-3 px-4 text-emerald-500 font-semibold">{row.soil}</td>
                        <td className="py-3 px-4 text-blue-500 font-semibold">{row.tank}</td>
                        <td className="py-3 px-6 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold ${
                              row.pump === 'ON'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : isDark
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.pump}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: KONTROL & KALIBRASI ==================== */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Kontrol Pompa */}
            <div
              className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isPumpRunning
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Power className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">
                        Pompa {isPumpRunning ? 'ON' : 'OFF'} ({pumpMode})
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {pumpMode === 'AUTO'
                          ? `Otomatis menyala jika tanah < ${soilThreshold}%`
                          : `Mode manual aktif (Paksa ${pumpMode})`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      isPumpRunning
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPumpRunning ? 'AKTIF' : 'SIAGA'}
                  </span>
                </div>

                {/* Tombol Pilihan Mode */}
                <div className="grid grid-cols-3 gap-2.5 my-4">
                  {[
                    { id: 'AUTO', label: 'Otomatis', activeClass: 'bg-indigo-600 text-white border-indigo-600' },
                    { id: 'ON', label: 'Paksa ON', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
                    { id: 'OFF', label: 'Paksa OFF', activeClass: 'bg-rose-600 text-white border-rose-600' },
                  ].map((btn) => {
                    const isSelected = pumpMode === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => {
                          if (btn.id !== pumpMode) setPendingMode(btn.id);
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                          isSelected
                            ? `${btn.activeClass} shadow-md`
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kotak Konfirmasi Inline */}
              {pendingMode ? (
                <div
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Konfirmasi ubah mode ke{' '}
                      <strong>{pendingMode === 'AUTO' ? 'Otomatis' : `Paksa ${pendingMode}`}</strong>?
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={confirmPumpChange}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                    >
                      Ya, Ubah
                    </button>
                    <button
                      onClick={() => setPendingMode(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                    isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>Proteksi Tangki Kosong:</span>
                  <span className="font-semibold text-emerald-500">Aktif (&lt; {tankThreshold}%)</span>
                </div>
              )}
            </div>

            {/* Panel Kalibrasi Ambang Kontrol */}
            <form
              onSubmit={handleSaveCalibration}
              className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300/90 shadow-md shadow-slate-300/35'
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Kalibrasi Ambang Kontrol</h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Atur batas pemicu penyiraman otomatis & batas aman air
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                      Ambang Tanah (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputSoilThresh}
                        onChange={(e) => setInputSoilThresh(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                            : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs opacity-50 font-mono">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-70 mb-1.5">
                      Batas Tangki (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inputTankThresh}
                        onChange={(e) => setInputTankThresh(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold outline-none transition-all ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                            : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                        }`}
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs opacity-50 font-mono">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
                >
                  Simpan Kalibrasi
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
