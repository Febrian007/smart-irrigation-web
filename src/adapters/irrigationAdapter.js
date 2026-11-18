// Konfigurasi Firebase (Placeholder - belum dihubungkan)
export const FIREBASE_CONFIG = null;
// TODO: isi { apiKey, authDomain, databaseURL, projectId, appId } dari Firebase Console.

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
  return {
    id: 'firebase',
    async connect() {
      if (!FIREBASE_CONFIG) {
        statusCb('offline', 'Belum dikonfigurasi');
        return;
      }
      // TODO: install `firebase` (`npm install firebase`) lalu hubungkan ke RTDB `/devices/{deviceId}/live`
    },
    disconnect() { statusCb('offline', 'Belum dikonfigurasi'); },
    onReading() {},
    onStatus(cb) { statusCb = cb; },
    async sendCommand() { throw new Error('Firebase belum dikonfigurasi'); },
    async saveThresholds() { throw new Error('Firebase belum dikonfigurasi'); },
  };
}

export function createAdapter(id) {
  if (id === 'simulation') return createSimulationAdapter();
  if (id === 'firebase') return createFirebaseAdapter();
  return createSSEAdapter();
}
