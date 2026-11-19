import { useEffect, useRef, useState, useCallback } from 'react';
import { createAdapter } from '../adapters/irrigationAdapter';

const INITIAL_STATE = {
  source: 'firebase',
  url: 'http://192.168.137.10',
  deviceId: import.meta.env.VITE_FIREBASE_DEVICE_ID || 'esp32-kebun-01',
  simActive: true,
  connStatus: 'offline',
  connInfo: 'Belum terhubung',
  lastReadingTs: null,
  ageSec: null,
  isStale: false,
  readings: { temp: null, hum: null, soil: null, tank: null },
  history: { temp: [], hum: [], soil: [], tank: [] },
  pump: false,
  mode: 'auto',
  pumpPending: false,
  pumpError: null,
  pumpSeconds: 0,
  thresholds: { soil: 38, tank: 10 },
  logs: [],
};

function pushSpark(arr, val) {
  if (typeof val !== 'number' || Number.isNaN(val)) return arr;
  const next = [...arr, val];
  return next.length > 30 ? next.slice(next.length - 30) : next;
}

export function useIrrigation() {
  const [state, setState] = useState(INITIAL_STATE);
  const adapterRef = useRef(null);

  const attachAdapter = useCallback((id) => {
    if (adapterRef.current) adapterRef.current.disconnect();
    const adapter = createAdapter(id);
    adapter.onStatus((connStatus, connInfo) => {
      setState((prev) => ({ ...prev, connStatus, connInfo }));
    });
    adapter.onReading((r) => {
      setState((prev) => {
        const nextReadings = {
          temp: r.temp ?? prev.readings.temp,
          hum: r.hum ?? prev.readings.hum,
          soil: r.soil ?? prev.readings.soil,
          tank: r.tank ?? prev.readings.tank,
        };
        const ts = r.ts || Date.now();
        const nextPump = typeof r.pump === 'boolean' ? r.pump : prev.pump;
        const nextLogs =
          r.addLog !== false && nextReadings.temp !== null
            ? [
                {
                  ts,
                  temp: nextReadings.temp,
                  hum: nextReadings.hum,
                  soil: nextReadings.soil,
                  tank: nextReadings.tank,
                  pump: nextPump,
                },
                ...prev.logs,
              ].slice(0, 50)
            : prev.logs;

        return {
          ...prev,
          readings: nextReadings,
          history: {
            temp: pushSpark(prev.history.temp, r.temp),
            hum: pushSpark(prev.history.hum, r.hum),
            soil: pushSpark(prev.history.soil, r.soil),
            tank: pushSpark(prev.history.tank, r.tank),
          },
          pump: nextPump,
          mode: r.mode || prev.mode,
          pumpSeconds: typeof r.pumpSeconds === 'number' ? r.pumpSeconds : prev.pumpSeconds,
          thresholds: r.thresholds ? { ...prev.thresholds, ...r.thresholds } : prev.thresholds,
          pumpPending: false,
          pumpError: null,
          lastReadingTs: ts,
          ageSec: 0,
          isStale: false,
          logs: nextLogs,
        };
      });
    });
    adapterRef.current = adapter;
    return adapter;
  }, []);

  useEffect(() => {
    const adapter = attachAdapter(INITIAL_STATE.simActive ? 'simulation' : INITIAL_STATE.source);
    if (INITIAL_STATE.simActive) adapter.connect({});
    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev.lastReadingTs) return prev;
        const ageSec = Math.max(0, Math.floor((Date.now() - prev.lastReadingTs) / 1000));
        return { ...prev, ageSec, isStale: ageSec > 10 };
      });
    }, 1000);
    return () => {
      clearInterval(timer);
      if (adapterRef.current) adapterRef.current.disconnect();
    };
  }, [attachAdapter]);

  const setSource = (source) => {
    setState((prev) => ({ ...prev, source, simActive: false }));
    attachAdapter(source);
  };

  const connect = ({ url = state.url, deviceId = state.deviceId } = {}) => {
    setState((prev) => ({ ...prev, url, deviceId, simActive: false }));
    const adapter = attachAdapter(state.source);
    adapter.connect({ url, deviceId });
  };

  const toggleSimulation = () => {
    const nextSim = !state.simActive;
    setState((prev) => ({ ...prev, simActive: nextSim }));
    if (nextSim) {
      const adapter = attachAdapter('simulation');
      adapter.connect({});
    } else {
      const adapter = attachAdapter(state.source);
      adapter.connect({ url: state.url, deviceId: state.deviceId });
    }
  };

  const sendPumpCommand = async (cmd) => {
    if (!adapterRef.current) attachAdapter(state.source);
    setState((prev) => ({ ...prev, pumpPending: true, pumpError: null }));
    try {
      await adapterRef.current.sendCommand(cmd);
    } catch (err) {
      setState((prev) => ({ ...prev, pumpPending: false, pumpError: err.message || 'Gagal' }));
      throw err;
    }
  };

  const saveThresholds = async (thresholds) => {
    if (!adapterRef.current) attachAdapter(state.source);
    await adapterRef.current.saveThresholds(thresholds);
  };

  return { state, setSource, connect, toggleSimulation, sendPumpCommand, saveThresholds };
}
