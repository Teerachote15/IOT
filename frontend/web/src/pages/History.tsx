import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAllDevices, useRooms } from '../services/hooks';
import '../styles/history.css';

const timeOptions = [
  { label: '1 ชั่วโมง', value: 1 },
  { label: '6 ชั่วโมง', value: 6 },
  { label: '12 ชั่วโมง', value: 12 },
  { label: '24 ชั่วโมง', value: 24 },
  { label: '7 วัน', value: 168 },
];

const dataKeys = [
  { key: 'temperature', label: 'อุณหภูมิ', unit: '°C', color: '#3b82f6' },
  { key: 'humidity', label: 'ความชื้น', unit: '%', color: '#10b981' },
  { key: 'power', label: 'พลังงาน', unit: 'kWh', color: '#f59e0b' },
];

function buildHistoryData(devices: any[], selectedRoom: string, hours: number, metric: string) {
  const filtered = selectedRoom
    ? devices.filter((device) => device.room === selectedRoom)
    : devices;

  if (!filtered.length) {
    return [];
  }

  const buckets: Record<string, { time: string; timestamp: number; temperature: number; humidity: number; power: number; count: number }> = {};

  filtered.forEach((device) => {
    const history = device.history || {};
    Object.values(history).forEach((entry: any) => {
      if (!entry || !entry.timestamp) return;
      const ts = Number(entry.timestamp);
      const diffHours = (Date.now() - ts) / 3600000;
      if (diffHours > hours) return;

      const label = new Date(ts).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (!buckets[label]) {
        buckets[label] = {
          time: label,
          timestamp: ts,
          temperature: 0,
          humidity: 0,
          power: 0,
          count: 0,
        };
      }

      buckets[label].temperature += Number(entry.temperature || 0);
      buckets[label].humidity += Number(entry.humidity || 0);
      buckets[label].power += Number(entry.power || 0);
      buckets[label].count += 1;
    });
  });

  return Object.values(buckets)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((bucket) => {
      const count = Math.max(bucket.count, 1);
      const temperature = Number((bucket.temperature / count).toFixed(1));
      const humidity = Number((bucket.humidity / count).toFixed(1));
      const power = Number((bucket.power / count).toFixed(2));

      const base = {
        time: bucket.time,
        temperature,
        humidity,
        power,
      };

      if (metric === 'temperature') return { ...base, value: temperature };
      if (metric === 'humidity') return { ...base, value: humidity };
      return { ...base, value: power };
    });
}

export default function HistoryPage() {
  const [searchParams] = useSearchParams();
  const { devices, loading, error } = useAllDevices();
  const { rooms } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [hours, setHours] = useState(24);
  const [metric, setMetric] = useState('temperature');

  useEffect(() => {
    const roomFromQuery = searchParams.get('room');
    if (roomFromQuery) {
      setSelectedRoom(roomFromQuery);
    }
  }, [searchParams]);

  const chartData = useMemo(
    () => buildHistoryData(devices, selectedRoom, hours, metric),
    [devices, selectedRoom, hours, metric]
  );

  const selectedMetric = dataKeys.find((item) => item.key === metric) || dataKeys[0];

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
          {rooms.map((room) => (
            <option key={room.id} value={room.name}>
              {room.name}
            </option>
          ))}
        </select>
      </div>

      <div className="history-graph-card">
        <div className="graph-topbar">
          <div>
            <h2>{selectedRoom ? `${selectedRoom}` : 'ทุกห้อง'}</h2>
            <span>{selectedMetric.label} - {hours} ชั่วโมง</span>
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
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="metricFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} unit={selectedMetric.unit} />
                  <Tooltip
                    formatter={(value: number) => `${value}${selectedMetric.unit}`}
                    labelFormatter={(label) => `เวลา: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={selectedMetric.color}
                    strokeWidth={3}
                    fill="url(#metricFill)"
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="history-table-card">
              <h3>ตารางข้อมูลย้อนหลัง</h3>
              <div className="history-table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>อุณหภูมิ</th>
                      <th>ความชื้น</th>
                      <th>พลังงาน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row) => (
                      <tr key={row.time}>
                        <td>{row.time}</td>
                        <td>{row.temperature}°C</td>
                        <td>{row.humidity}%</td>
                        <td>{row.power} kWh</td>
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
