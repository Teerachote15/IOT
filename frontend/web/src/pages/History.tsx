import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertRecord,
  Device,
  DeviceHistoryPoint,
  subscribeToAlerts,
} from '../services/database';
import { useAllDevices, useRooms } from '../services/hooks';
import '../styles/history.css';

const timeOptions = [
  { label: '1 ชั่วโมง', value: 1 },
  { label: '6 ชั่วโมง', value: 6 },
  { label: '12 ชั่วโมง', value: 12 },
  { label: '24 ชั่วโมง', value: 24 },
  { label: '7 วัน', value: 168 },
  { label: '30 วัน', value: 720 },
];

const dataKeys = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'temperature', label: 'อุณหภูมิ', unit: '°C', color: '#3b82f6' },
  { key: 'humidity', label: 'ความชื้น', unit: '%', color: '#10b981' },
  { key: 'power', label: 'กำลังไฟ', unit: 'W', color: '#f59e0b' },
];

interface HistoryChartPoint {
  time: string;
  timestamp: number;
  temperature: number | null;
  humidity: number | null;
  power: number | null;
}

function buildHistoryData(devices: Device[], selectedRoom: string, hours: number): HistoryChartPoint[] {
  const filtered = selectedRoom
    ? devices.filter((device) =>
        device.roomId === selectedRoom ||
        (!device.roomId && device.room === selectedRoom)
      )
    : devices;

  if (!filtered.length) {
    return [];
  }

  const bucketSize = hours <= 1
    ? 60_000
    : hours <= 24
      ? 15 * 60_000
      : hours <= 168
        ? 60 * 60_000
        : 24 * 60 * 60_000;
  const rangeStart = Date.now() - hours * 60 * 60 * 1000;
  const buckets = new Map<number, Map<string, {
    temperature: number[];
    humidity: number[];
    power: number[];
  }>>();

  const now = Date.now();
  filtered.forEach((device) => {
    Object.entries(device.history || {}).forEach(([key, entry]: [string, DeviceHistoryPoint]) => {
      const timestamp = Number(entry.timestamp);
      if (!Number.isFinite(timestamp) || timestamp < rangeStart || timestamp > now) return;
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
      }
    });
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([timestamp, deviceBuckets]) => {
      const temperatureValues: number[] = [];
      const humidityValues: number[] = [];
      let totalPower = 0;
      let hasPower = false;

      deviceBuckets.forEach((readings) => {
        if (readings.temperature.length) {
          temperatureValues.push(
            readings.temperature.reduce((sum, value) => sum + value, 0) / readings.temperature.length,
          );
        }
        if (readings.humidity.length) {
          humidityValues.push(
            readings.humidity.reduce((sum, value) => sum + value, 0) / readings.humidity.length,
          );
        }
        if (readings.power.length) {
          hasPower = true;
          totalPower += readings.power.reduce((sum, value) => sum + value, 0) / readings.power.length;
        }
      });

      const average = (values: number[]) => values.length
        ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
        : null;

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
        temperature: average(temperatureValues),
        humidity: average(humidityValues),
        power: hasPower ? Number(totalPower.toFixed(1)) : null,
      };
    });
}

export default function HistoryPage() {
  const [searchParams] = useSearchParams();
  const { devices, loading, error } = useAllDevices();
  const { rooms } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [hours, setHours] = useState(24);
  const [metric, setMetric] = useState('overview');
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  useEffect(() => {
    const roomFromQuery = searchParams.get('room');
    if (roomFromQuery) {
      const room = rooms.find((item) => item.id === roomFromQuery || item.name === roomFromQuery);
      setSelectedRoom(room?.id || roomFromQuery);
    }
  }, [searchParams, rooms]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(
      (items) => {
        setAlerts(items);
        setAlertsLoading(false);
        setAlertsError(null);
      },
      (subscriptionError) => {
        setAlertsError(subscriptionError.message);
        setAlertsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const chartData = useMemo(
    () => buildHistoryData(devices, selectedRoom, hours),
    [devices, selectedRoom, hours]
  );

  const selectedMetric = dataKeys.find((item) => item.key === metric) || dataKeys[0];
  const selectedRoomRecord = rooms.find((room) => room.id === selectedRoom);
  const selectedDevices = useMemo(
    () => selectedRoom
      ? devices.filter((device) =>
          device.roomId === selectedRoom ||
          (!device.roomId && device.room === selectedRoom)
        )
      : devices,
    [devices, selectedRoom],
  );
  const now = Date.now();
  const rangeStart = now - hours * 60 * 60 * 1000;
  const selectedDeviceIds = useMemo(
    () => new Set(selectedDevices.map((device) => device.id)),
    [selectedDevices],
  );
  const filteredAlerts = useMemo(
    () => alerts.filter((alert) => {
      const timestamp = Number(alert.timestamp);
      if (!Number.isFinite(timestamp) || timestamp < rangeStart || timestamp > now) return false;
      if (!selectedRoom) return true;
      const device = devices.find((item) => item.id === alert.deviceId);
      if (device) return selectedDeviceIds.has(device.id);
      return Boolean(
        alert.room &&
        selectedRoomRecord &&
        alert.room === selectedRoomRecord.name,
      );
    }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    [alerts, devices, now, rangeStart, selectedDeviceIds, selectedRoom, selectedRoomRecord],
  );
  const timeline = useMemo(() => {
    const sensorRows = onlyAlerts ? [] : chartData.map((row) => ({
      kind: 'sensor' as const,
      key: `sensor-${row.timestamp}`,
      timestamp: row.timestamp,
      row,
    }));
    const alertRows = filteredAlerts.map((alert, index) => ({
      kind: 'alert' as const,
      key: `alert-${alert.id || `${alert.timestamp}-${index}`}`,
      timestamp: Number(alert.timestamp),
      alert,
    }));
    return [...sensorRows, ...alertRows].sort((a, b) => b.timestamp - a.timestamp);
  }, [chartData, filteredAlerts, onlyAlerts]);
  return (
    <div className="history-page">
      <header className="history-header">
        <div>
          <h1>ข้อมูลย้อนหลัง</h1>
          <p>เลือกช่วงเวลา และกราฟจะแสดงข้อมูลตามช่วงที่เลือก</p>
        </div>
      </header>

      <div className="history-controls">
        <div className="chip-group">
          {dataKeys.map((item) => (
            <button
              key={item.key}
              type="button"
              className={metric === item.key ? 'chip active' : 'chip'}
              onClick={() => setMetric(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          className="history-select"
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
        >
          <option value="">ทุกห้อง</option>
          {Object.entries(rooms.reduce<Record<string, typeof rooms>>((groups, room) => {
            const building = room.building || room.floor || 'ไม่ระบุอาคาร';
            (groups[building] ||= []).push(room);
            return groups;
          }, {})).map(([building, buildingRooms]) => (
            <optgroup key={building} label={building}>
              {buildingRooms.map((room) => (
                <option key={room.id} value={room.id || room.name}>
                  {room.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="history-graph-card">
        <div className="graph-topbar">
          <div>
            <h2>{selectedRoomRecord ? `${selectedRoomRecord.building || selectedRoomRecord.floor || 'ไม่ระบุอาคาร'} · ${selectedRoomRecord.name}` : selectedRoom || 'ทุกห้อง'}</h2>
            <span>
              {selectedMetric.label} · {hours < 24 ? `${hours} ชั่วโมง` : `${hours / 24} วัน`}
              {metric === 'overview' ? ' · อุณหภูมิ / ความชื้น / กำลังไฟรวม' : ''}
            </span>
          </div>
          <div className="time-range-wrap">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={hours === option.value ? 'range active' : 'range'}
                onClick={() => setHours(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="history-state">กำลังโหลดข้อมูล...</div>}
        {error && <div className="history-state error">{error.message}</div>}

        {!loading && (
          <>
            <div className="history-chart-wrap">
              {metric === 'overview' ? (
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis
                      yAxisId="sensor"
                      tickLine={false}
                      axisLine={false}
                      label={{ value: '°C / %', angle: -90, position: 'insideLeft' }}
                    />
                    <>
                      <YAxis
                        yAxisId="power"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        unit=" W"
                      />
                      <Legend />
                    </>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value}${name === 'อุณหภูมิ' ? '°C' : name === 'ความชื้น' ? '%' : ' W'}`,
                        name,
                      ]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.timestamp
                          ? new Date(payload[0].payload.timestamp).toLocaleString('th-TH')
                          : ''
                      }
                    />
                    <Line
                      yAxisId="sensor"
                      type="monotone"
                      dataKey="temperature"
                      name="อุณหภูมิ"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      yAxisId="sensor"
                      type="monotone"
                      dataKey="humidity"
                      name="ความชื้น"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      yAxisId="power"
                      type="monotone"
                      dataKey="power"
                      name="กำลังไฟรวม"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="metricFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      unit={selectedMetric.unit}
                    />
                    <Tooltip
                      formatter={(value: number) => `${value}${selectedMetric.unit}`}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.timestamp
                          ? new Date(payload[0].payload.timestamp).toLocaleString('th-TH')
                          : ''
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      stroke={selectedMetric.color}
                      strokeWidth={3}
                      fill="url(#metricFill)"
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="history-table-card">
              <div className="history-table-heading">
                <div>
                  <h3>ตารางข้อมูลย้อนหลัง</h3>
                  <p>เหตุการณ์แจ้งเตือนแสดงเป็นรายการแยกตามเวลาที่เกิด</p>
                </div>
                <label className="history-alert-filter">
                  <input
                    type="checkbox"
                    checked={onlyAlerts}
                    onChange={(event) => setOnlyAlerts(event.target.checked)}
                  />
                  เฉพาะการแจ้งเตือน
                </label>
              </div>
              {alertsLoading && <div className="history-state">กำลังโหลดการแจ้งเตือน...</div>}
              {alertsError && <div className="history-state error">โหลดการแจ้งเตือนไม่สำเร็จ: {alertsError}</div>}
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>อุณหภูมิ</th>
                      <th>ความชื้น</th>
                      <th>กำลังไฟ</th>
                      <th>เหตุการณ์</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="history-no-data">
                          {onlyAlerts
                            ? 'ไม่พบการแจ้งเตือนในช่วงเวลาที่เลือก'
                            : 'ยังไม่มีข้อมูลย้อนหลังในช่วงเวลาที่เลือก'}
                        </td>
                      </tr>
                    ) : timeline.map((item) => (
                      <tr key={item.key} className={item.kind === 'alert' ? 'history-alert-row' : undefined}>
                        <td>{new Date(item.timestamp).toLocaleString('th-TH')}</td>
                        {item.kind === 'sensor' ? (
                          <>
                            <td>{item.row.temperature == null ? '—' : `${item.row.temperature}°C`}</td>
                            <td>{item.row.humidity == null ? '—' : `${item.row.humidity}%`}</td>
                            <td>{item.row.power == null ? '—' : `${item.row.power} W`}</td>
                            <td>ค่าที่บันทึก</td>
                            <td>—</td>
                          </>
                        ) : (
                          <>
                            <td>—</td>
                            <td>—</td>
                            <td>—</td>
                            <td>
                              <span className={`history-severity ${item.alert.severity || 'warning'}`}>
                                {item.alert.severity === 'critical'
                                  ? 'วิกฤต'
                                  : item.alert.severity === 'info'
                                    ? 'ข้อมูล'
                                    : 'แจ้งเตือน'}
                              </span>
                              <div className="history-alert-detail">
                                {item.alert.deviceName || devices.find((device) => device.id === item.alert.deviceId)?.name || item.alert.deviceId || 'อุปกรณ์'}
                                {item.alert.room ? ` · ${item.alert.room}` : ''}
                                {item.alert.title ? ` · ${item.alert.title}` : ''}
                                {item.alert.metric
                                  ? ` · ${item.alert.metric === 'temperature' ? 'อุณหภูมิ' : item.alert.metric === 'humidity' ? 'ความชื้น' : item.alert.metric === 'power' ? 'กำลังไฟ' : item.alert.metric} ${item.alert.value ?? '—'} / เกณฑ์ ${item.alert.threshold ?? '—'}`
                                  : ''}
                              </div>
                            </td>
                            <td>
                              <span className={`history-resolution ${item.alert.resolved ? 'resolved' : 'unresolved'}`}>
                                {item.alert.resolved ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
