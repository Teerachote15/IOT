import { Device, DeviceHistoryPoint } from './database';

export interface HistoryChartPoint {
  time: string;
  timestamp: number;
  temperature: number | null;
  humidity: number | null;
  power: number | null;
  hasTemperatureData: boolean;
  hasHumidityData: boolean;
  hasPowerData: boolean;
  hasData: boolean;
}

export interface HistoryRoomScope {
  id?: string;
  name: string;
  building?: string;
}

export function filterDevicesForHistoryRoom(
  devices: Device[],
  room?: HistoryRoomScope,
) {
  if (!room) return devices;
  return devices.filter(
    (device) =>
      (room.id != null && device.roomId === room.id) ||
      (!device.roomId &&
        device.room === room.name &&
        (!device.building || device.building === room.building)),
  );
}

export function buildHistoryChartData(
  devices: Device[],
  hours: number,
  now = Date.now(),
): HistoryChartPoint[] {
  const bucketSize =
    hours <= 1
      ? 60_000
      : hours <= 24
        ? 15 * 60_000
        : hours <= 168
          ? 60 * 60_000
          : 24 * 60 * 60_000;
  const rangeStart = now - hours * 60 * 60 * 1000;
  const buckets = new Map<
    number,
    Map<
      string,
      { temperature: number[]; humidity: number[]; power: number[] }
    >
  >();
  for (
    let timestamp = Math.floor(rangeStart / bucketSize) * bucketSize;
    timestamp <= now;
    timestamp += bucketSize
  ) {
    buckets.set(timestamp, new Map());
  }

  let hasAnyReadings = false;
  devices.forEach((device) => {
    Object.entries(device.history || {}).forEach(
      ([key, entry]: [string, DeviceHistoryPoint]) => {
        const timestamp = Number(entry.timestamp);
        if (
          !Number.isFinite(timestamp) ||
          timestamp < rangeStart ||
          timestamp > now
        ) {
          return;
        }
        const bucketTimestamp = Math.floor(timestamp / bucketSize) * bucketSize;
        let deviceBuckets = buckets.get(bucketTimestamp);
        if (!deviceBuckets) {
          deviceBuckets = new Map();
          buckets.set(bucketTimestamp, deviceBuckets);
        }
        let readings = deviceBuckets.get(device.id);
        if (!readings) {
          readings = { temperature: [], humidity: [], power: [] };
          deviceBuckets.set(device.id, readings);
        }

        for (const metric of ['temperature', 'humidity', 'power'] as const) {
          if (
            metric === 'power' &&
            !key.startsWith('pzem_') &&
            device.sensors?.pzem
          ) {
            continue;
          }
          const value = entry[metric];
          if (value == null || !Number.isFinite(Number(value))) continue;
          readings[metric].push(Number(value));
          hasAnyReadings = true;
        }
      },
    );
  });

  const chartPoints = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, deviceBuckets]) => {
      const temperatureValues: number[] = [];
      const humidityValues: number[] = [];
      let hasTemperatureData = false;
      let hasHumidityData = false;
      let totalPower = 0;
      let hasPower = false;

      deviceBuckets.forEach((readings) => {
        if (readings.temperature.length) {
          hasTemperatureData = true;
          temperatureValues.push(average(readings.temperature));
        }
        if (readings.humidity.length) {
          hasHumidityData = true;
          humidityValues.push(average(readings.humidity));
        }
        if (readings.power.length) {
          hasPower = true;
          totalPower += average(readings.power);
        }
      });

      return {
        timestamp,
        time: new Date(timestamp).toLocaleString(
          'th-TH',
          hours <= 24
            ? { hour: '2-digit', minute: '2-digit' }
            : hours > 168
              ? { day: '2-digit', month: '2-digit' }
              : { day: '2-digit', month: '2-digit', hour: '2-digit' },
        ),
        temperature: nullableAverage(temperatureValues),
        humidity: nullableAverage(humidityValues),
        power: hasPower ? Number(totalPower.toFixed(1)) : 0,
        hasTemperatureData,
        hasHumidityData,
        hasPowerData: hasPower,
        hasData: deviceBuckets.size > 0,
      };
    });

  return hasAnyReadings ? chartPoints : [];
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nullableAverage(values: number[]) {
  return values.length ? Number(average(values).toFixed(1)) : 0;
}
