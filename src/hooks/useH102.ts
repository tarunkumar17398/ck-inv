import { useCallback, useEffect, useRef, useState } from "react";

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000ffe3-0000-1000-8000-00805f9b34fb";
const NOTIFY_UUID = "0000ffe4-0000-1000-8000-00805f9b34fb";

function crc16(bytes: Uint8Array): number {
  let crc = 0xffff;
  const poly = 0x8408;
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) b += 256;
    crc ^= b;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc >>= 1;
        crc ^= poly;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc;
}

function finalizeCmd(base: Uint8Array): Uint8Array {
  const c = crc16(base);
  const out = new Uint8Array(base.length + 2);
  out.set(base, 0);
  out[base.length] = (c >> 8) & 0xff;
  out[base.length + 1] = c & 0xff;
  return out;
}

const CMD_START = finalizeCmd(new Uint8Array([0xcf, 0x00, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00]));
const CMD_STOP = finalizeCmd(new Uint8Array([0xcf, 0xff, 0x00, 0x02, 0x00]));
const CMD_POWER_8 = finalizeCmd(new Uint8Array([0xcf, 0x00, 0x00, 0x84, 0x01, 8]));
const CMD_Q_ZERO = finalizeCmd(new Uint8Array([0xcf, 0x00, 0x00, 0x8b, 0x01, 0]));
const CMD_SESSION = finalizeCmd(new Uint8Array([0xcf, 0xff, 0x00, 0x8c, 0x09, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
const CMD_GET_BATTERY = finalizeCmd(new Uint8Array([0xcf, 0x00, 0x00, 0x83, 0x00]));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface H102Options {
  onTag?: (epc: string, rssi: number) => void;
  onError?: (msg: string) => void;
}

export function useH102(opts: H102Options = {}) {
  const [connected, setConnected] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [supported] = useState(
    typeof navigator !== "undefined" && !!(navigator as any).bluetooth
  );

  const deviceRef = useRef<any>(null);
  const writeCharRef = useRef<any>(null);
  const notifyCharRef = useRef<any>(null);
  const packetBufRef = useRef<Uint8Array>(new Uint8Array(0));
  const expectedLenRef = useRef<number>(0);
  const scanTimeoutRef = useRef<any>(null);
  const batteryIntervalRef = useRef<any>(null);
  const scanActiveRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const parsePacket = useCallback((buf: Uint8Array) => {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const cmd = dv.getUint8(3);
    if (cmd === 0x83) {
      if (dv.byteLength >= 7) {
        try {
          setBattery(dv.getUint8(5));
        } catch { /* ignore */ }
      }
      return;
    }
    if ([0x02, 0x89, 0x8b, 0x8c, 0x84].includes(cmd)) return;
    try {
      const rawRssi = dv.getUint8(6);
      const signed = rawRssi > 127 ? rawRssi - 256 : rawRssi;
      const rssi = signed / 10;
      const epcLen = dv.getUint8(10);
      const epcBytes = new Uint8Array(buf.buffer, buf.byteOffset + 11, epcLen);
      const epc = Array.from(epcBytes)
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join("");
      if (scanActiveRef.current) {
        scanActiveRef.current = false;
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        // stop after first tag
        writeCharRef.current?.writeValue(CMD_STOP).catch(() => {});
        setScanning(false);
      }
      optsRef.current.onTag?.(epc, rssi);
    } catch (e) {
      // malformed packet ignored
    }
  }, []);

  const onNotify = useCallback(
    (event: any) => {
      const value: DataView = event.target.value;
      const incoming = new Uint8Array(value.buffer);
      if (incoming[0] === 0xcf) {
        packetBufRef.current = incoming;
        expectedLenRef.current = 5 + incoming[4] + 2;
      } else {
        const merged = new Uint8Array(packetBufRef.current.length + incoming.length);
        merged.set(packetBufRef.current, 0);
        merged.set(incoming, packetBufRef.current.length);
        packetBufRef.current = merged;
      }
      if (packetBufRef.current.length >= expectedLenRef.current && expectedLenRef.current > 0) {
        parsePacket(packetBufRef.current);
        packetBufRef.current = new Uint8Array(0);
        expectedLenRef.current = 0;
      }
    },
    [parsePacket]
  );

  const disconnect = useCallback(async () => {
    try {
      if (writeCharRef.current) await writeCharRef.current.writeValue(CMD_STOP).catch(() => {});
      if (notifyCharRef.current) {
        notifyCharRef.current.removeEventListener("characteristicvaluechanged", onNotify);
        await notifyCharRef.current.stopNotifications().catch(() => {});
      }
      if (deviceRef.current?.gatt?.connected) deviceRef.current.gatt.disconnect();
    } catch {
      /* ignore */
    }
    deviceRef.current = null;
    writeCharRef.current = null;
    notifyCharRef.current = null;
    scanActiveRef.current = false;
    if (batteryIntervalRef.current) { clearInterval(batteryIntervalRef.current); batteryIntervalRef.current = null; }
    setScanning(false);
    setConnected(false);
    setBattery(null);
  }, [onNotify]);

  const connect = useCallback(async () => {
    if (!supported) {
      optsRef.current.onError?.("Web Bluetooth not supported in this browser.");
      return;
    }
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [SERVICE_UUID],
      });
      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setScanning(false);
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const writeChar = await service.getCharacteristic(WRITE_UUID);
      const notifyChar = await service.getCharacteristic(NOTIFY_UUID);
      writeCharRef.current = writeChar;
      notifyCharRef.current = notifyChar;
      await notifyChar.startNotifications();
      notifyChar.addEventListener("characteristicvaluechanged", onNotify);

      for (const cmd of [CMD_POWER_8, CMD_Q_ZERO, CMD_SESSION, CMD_STOP]) {
        await writeChar.writeValue(cmd);
        await sleep(150);
      }
      setConnected(true);
      await sleep(300);
      try { await writeChar.writeValue(CMD_GET_BATTERY); } catch { /* ignore */ }
      if (batteryIntervalRef.current) clearInterval(batteryIntervalRef.current);
      batteryIntervalRef.current = setInterval(async () => {
        if (writeCharRef.current && !scanActiveRef.current) {
          try { await writeCharRef.current.writeValue(CMD_GET_BATTERY); } catch { /* ignore */ }
        }
      }, 60000);
    } catch (e: any) {
      optsRef.current.onError?.(e?.message || "Failed to connect");
      await disconnect();
    }
  }, [supported, onNotify, disconnect]);

  const scanOnce = useCallback(async () => {
    if (!connected || !writeCharRef.current) return;
    scanActiveRef.current = true;
    setScanning(true);
    try {
      await writeCharRef.current.writeValue(CMD_START);
    } catch (e: any) {
      scanActiveRef.current = false;
      setScanning(false);
      optsRef.current.onError?.(e?.message || "Failed to start scan");
      return;
    }
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(async () => {
      if (scanActiveRef.current) {
        scanActiveRef.current = false;
        setScanning(false);
        try {
          await writeCharRef.current?.writeValue(CMD_STOP);
        } catch {
          /* ignore */
        }
        optsRef.current.onError?.("No tag found");
      }
    }, 5000);
  }, [connected]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, connected, power, scanning, connect, disconnect, scanOnce };
}
