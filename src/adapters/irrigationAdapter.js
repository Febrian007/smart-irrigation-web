import { initializeApp, getApps } from '@firebase/app';
import { getAuth, signInAnonymously } from '@firebase/auth';
import { getDatabase, onValue, ref, set, serverTimestamp } from '@firebase/database';

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

function getFirebaseDatabase() {
  if (Object.values(firebaseConfig).some((value) => !value)) {
    throw new Error('Konfigurasi Firebase belum lengkap. Isi file .env terlebih dahulu.');
  }
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return { app, database: getDatabase(app) };
}

export function createSSEAdapter() {
  let es = null;
  let reconnectTimer = null;
  let countdownTimer = null;
  let attempt = 0;
  let baseUrl = '';
  let manualClose = false;
  let readingCb = () => {};
  let statusCb = () => {};

  const normalizeUrl = (u) => {
    let s = (u || '').trim().replace(/\/+$/, '');
    if (s && !s.startsWith('http://') && !s.startsWith('https://')) s = `http://${s}`;
    return s;
  };

  const mapMode = (raw) => {
    if (raw === 'MANUAL_ON') return 'manual_on';
    if (raw === 'MANUAL_OFF') return 'manual_off';
    return 'auto';
  };

  const clearTimers = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  };

  const openStream = () => {
    if (es) { es.close(); es = null; }
    statusCb('connecting', 'Menghubungkan…');
    es = new EventSource(`${baseUrl}/events`);

    es.onopen = () => {
      attempt = 0;
      clearTimers();
      statusCb('online', 'Terhubung');
    };

    es.addEventListener('temperature', (e) => readingCb({ ts: Date.now(), temp: parseFloat(e.data), addLog: false }));
    es.addEventListener('humidity', (e) => readingCb({ ts: Date.now(), hum: parseFloat(e.data), addLog: false }));
    es.addEventListener('soil_moisture', (e) => readingCb({ ts: Date.now(), soil: parseFloat(e.data), addLog: false }));
    es.addEventListener('water_level', (e) => readingCb({ ts: Date.now(), tank: parseFloat(e.data), addLog: false }));
    es.addEventListener('status', (e) => {
      try {
        const d = JSON.parse(e.data);
        readingCb({
          ts: Date.now(),
          temp: Number(d.temperature),
          hum: Number(d.humidity),
          soil: Number(d.soil_moisture),
          tank: Number(d.water_level),
          pump: Boolean(d.irrigation_pump),
          mode: mapMode(d.pump_mode),
          pumpSeconds: Number(d.pump_active_sec || 0),
          thresholds:
            d.soil_threshold !== undefined && d.tank_threshold !== undefined
              ? { soil: Number(d.soil_threshold), tank: Number(d.tank_threshold) }
              : undefined,
          addLog: true,
        });
      } catch (_) {}
    });

    es.onerror = () => {
      if (es) { es.close(); es = null; }
      if (manualClose) return;
      const delaySec = Math.min(30, Math.pow(2, attempt));
      attempt += 1;
      let rem = delaySec;
      statusCb('offline', `Terputus (mencoba lagi dalam ${rem}s)`);
      clearTimers();
      countdownTimer = setInterval(() => {
        rem -= 1;
        if (rem > 0) statusCb('offline', `Terputus (mencoba lagi dalam ${rem}s)`);
      }, 1000);
      reconnectTimer = setTimeout(() => {
        clearTimers();
        if (!manualClose) openStream();
      }, delaySec * 1000);
    };
  };

  return {
    id: 'sse',
    async connect(config) {
      manualClose = false;
      attempt = 0;
      baseUrl = normalizeUrl(config.url);
      if (!baseUrl) {
        statusCb('error', 'Error: Alamat IP kosong');
        return;
      }
      openStream();
    },
    disconnect() {
      manualClose = true;
      clearTimers();
      if (es) { es.close(); es = null; }
      statusCb('offline', 'Belum terhubung');
    },
    onReading(cb) { readingCb = cb; },
    onStatus(cb) { statusCb = cb; },
    async sendCommand(cmd) {
      const stateParam = cmd.type === 'mode' ? 'auto' : cmd.value;
      const res = await fetch(`${baseUrl}/api/pump?state=${encodeURIComponent(stateParam)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      readingCb({
        ts: Date.now(),
        pump: Boolean(d.irrigation_pump),
        mode: mapMode(d.pump_mode),
        pumpSeconds: Number(d.pump_active_sec || 0),
        addLog: false,
      });
    },
    async saveThresholds(t) {
      const res = await fetch(`${baseUrl}/api/thresholds?soil=${encodeURIComponent(t.soil)}&tank=${encodeURIComponent(t.tank)}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      readingCb({
        ts: Date.now(),
        thresholds: { soil: Number(d.soil_threshold), tank: Number(d.tank_threshold) },
        addLog: false,
      });
    },
  };
}

export function createSimulationAdapter() {
  let timer = null;
  let readingCb = () => {};
  let statusCb = () => {};
  const sim = {
    temp: 26.8,
    hum: 48.0,
    soil: 41.0,
    tank: 64.0,
    pump: false,
    mode: 'auto',
    pumpSeconds: 0,
    thresholds: { soil: 38, tank: 10 },
  };
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const tick = () => {
    sim.temp = clamp(+(sim.temp + (Math.random() - 0.5) * 0.4).toFixed(2), 20, 36);
    sim.hum = clamp(+(sim.hum + (Math.random() - 0.5) * 1.2).toFixed(2), 30, 85);

    if (sim.pump) {
      sim.soil = clamp(+(sim.soil + 1.4 + Math.random() * 0.6).toFixed(2), 10, 90);
      sim.tank = clamp(+(sim.tank - 0.4).toFixed(2), 4, 100);
      sim.pumpSeconds += 2;
    } else {
      sim.soil = clamp(+(sim.soil - (0.6 + Math.random() * 0.5)).toFixed(2), 10, 90);
    }

    sim.pump = sim.mode === 'auto' ? sim.soil < sim.thresholds.soil : sim.mode === 'manual_on';

    readingCb({
      ts: Date.now(),
      temp: sim.temp,
      hum: sim.hum,
      soil: sim.soil,
      tank: sim.tank,
      pump: sim.pump,
      mode: sim.mode,
      pumpSeconds: sim.pumpSeconds,
      thresholds: { ...sim.thresholds },
      addLog: true,
    });
  };

  return {
    id: 'simulation',
    async connect() {
      statusCb('online', 'Simulasi aktif');
      tick();
      timer = setInterval(tick, 2000);
    },
    disconnect() {
      if (timer) { clearInterval(timer); timer = null; }
      statusCb('offline', 'Belum terhubung');
    },
    onReading(cb) { readingCb = cb; },
    onStatus(cb) { statusCb = cb; },
    async sendCommand(cmd) {
      if (cmd.type === 'mode' && cmd.value === 'auto') {
        sim.mode = 'auto';
        sim.pump = sim.soil < sim.thresholds.soil;
      } else if (cmd.type === 'pump') {
        sim.mode = cmd.value === 'on' ? 'manual_on' : 'manual_off';
        sim.pump = cmd.value === 'on';
      }
      readingCb({ ts: Date.now(), pump: sim.pump, mode: sim.mode, pumpSeconds: sim.pumpSeconds, addLog: false });
    },
    async saveThresholds(t) {
      sim.thresholds = { soil: t.soil, tank: t.tank };
      if (sim.mode === 'auto') sim.pump = sim.soil < sim.thresholds.soil;
      readingCb({ ts: Date.now(), pump: sim.pump, thresholds: { ...sim.thresholds }, addLog: false });
    },
  };
}

export function createFirebaseAdapter() {
  let statusCb = () => {};
  let readingCb = () => {};
  let unsubscribe = null;
  let database = null;
  let deviceId = '';
  return {
    id: 'firebase',
    async connect(config = {}) {
      try {
        deviceId = (config.deviceId || 'esp32-kebun-01').trim();
        if (!deviceId) throw new Error('Device ID kosong');
        const firebase = getFirebaseDatabase();
        database = firebase.database;
        statusCb('connecting', 'Menghubungkan ke Firebase…');
        await signInAnonymously(getAuth(firebase.app));
        unsubscribe = onValue(
          ref(database, `devices/${deviceId}/live`),
          (snapshot) => {
            const d = snapshot.val();
            if (!d) {
              statusCb('offline', 'Menunggu data perangkat');
              return;
            }
            statusCb('online', 'Terhubung ke Firebase');
            const value = (...keys) => {
              for (const key of keys) if (d[key] !== undefined && d[key] !== null) return Number(d[key]);
              return undefined;
            };
            const rawMode = d.mode || d.pump_mode || 'auto';
            const mode = ({ AUTO: 'auto', MANUAL_ON: 'manual_on', MANUAL_OFF: 'manual_off' })[rawMode] || rawMode;
            const pumpValue = d.pump ?? d.pump_on ?? d.irrigation_pump;
            readingCb({
              ts: d.ts || d.updatedAt || Date.now(),
              temp: value('temp', 'temperature'),
              hum: value('hum', 'humidity'),
              soil: value('soil', 'soil_moisture'),
              tank: value('tank', 'water_level'),
              pump: typeof pumpValue === 'boolean' ? pumpValue : undefined,
              mode,
              pumpSeconds: value('pumpSeconds', 'pump_active_sec'),
              thresholds: d.thresholds || ((d.soil_threshold !== undefined && d.tank_threshold !== undefined)
                ? { soil: Number(d.soil_threshold), tank: Number(d.tank_threshold) }
                : undefined),
              addLog: true,
            });
          },
          (error) => statusCb('error', `Firebase: ${error.message}`),
        );
      } catch (error) {
        statusCb('error', error.message || 'Gagal menghubungkan Firebase');
      }
    },
    disconnect() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      statusCb('offline', 'Belum terhubung');
    },
    onReading(cb) { readingCb = cb; },
    onStatus(cb) { statusCb = cb; },
    async sendCommand(cmd) {
      if (!database) database = getFirebaseDatabase().database;
      const mode = cmd.type === 'mode' ? 'auto' : (cmd.value === 'on' ? 'manual_on' : 'manual_off');
      await set(ref(database, `devices/${deviceId}/commands/pump`), {
        mode,
        pump: mode === 'manual_on',
        updatedAt: serverTimestamp(),
      });
      readingCb({ ts: Date.now(), mode, pump: mode === 'manual_on', addLog: false });
    },
    async saveThresholds(thresholds) {
      if (!database) database = getFirebaseDatabase().database;
      await set(ref(database, `devices/${deviceId}/config/thresholds`), {
        soil: thresholds.soil,
        tank: thresholds.tank,
        updatedAt: serverTimestamp(),
      });
      readingCb({ ts: Date.now(), thresholds, addLog: false });
    },
  };
}

export function createAdapter(id) {
  if (id === 'simulation') return createSimulationAdapter();
  if (id === 'firebase') return createFirebaseAdapter();
  return createSSEAdapter();
}
