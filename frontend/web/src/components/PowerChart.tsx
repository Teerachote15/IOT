import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Device } from '../services/database';
import '../styles/chart.css';

interface PowerChartProps {
  devices: Device[];
}

export default function PowerChart({ devices }: PowerChartProps) {
  const [range, setRange] = useState<'hour' | 'day' | 'threeDays' | 'week' | 'month'>('day');
  const chartData = useMemo(() => {
    const now = Date.now();
    const rangeMs = range === 'hour'
      ? 60 * 60 * 1000
      : range === 'day'
        ? 24 * 60 * 60 * 1000
        : range === 'threeDays'
          ? 3 * 24 * 60 * 60 * 1000
          : range === 'week'
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
    const bucketMs = range === 'hour'
      ? 60 * 1000
      : range === 'month'
        ? 24 * 60 * 60 * 1000
        : range === 'day' || range === 'threeDays'
        ? 15 * 60 * 1000
        : 60 * 60 * 1000;
    const buckets = new Map<number, Map<string, number[]>>();

    devices.forEach((device) => {
      if (!device.sensors?.pzem && !device.hasRelay) return;
      Object.values(device.history || {}).forEach((point) => {
        const timestamp = Number(point.timestamp);
        const power = Number(point.power);
        if (
          !Number.isFinite(timestamp) ||
          timestamp < now - rangeMs ||
          timestamp > now ||
          !Number.isFinite(power) ||
          power < 0
        ) {
          return;
        }
        const bucket = Math.floor(timestamp / bucketMs) * bucketMs;
        const deviceValues = buckets.get(bucket) || new Map<string, number[]>();
        const values = deviceValues.get(device.id) || [];
        values.push(power);
        deviceValues.set(device.id, values);
        buckets.set(bucket, deviceValues);
      });
    });

    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([timestamp, deviceValues]) => {
        const totalPower = [...deviceValues.values()].reduce(
          (total, readings) =>
            total + readings.reduce((sum, reading) => sum + reading, 0) / readings.length,
          0,
        );
        return {
          timestamp,
          time: new Date(timestamp).toLocaleString(
            'th-TH',
            range === 'month'
              ? { day: '2-digit', month: '2-digit' }
              : range === 'week' || range === 'threeDays'
                ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
                : range === 'day'
                  ? { hour: '2-digit', minute: '2-digit' }
                  : { minute: '2-digit' },
          ),
          power: Number(totalPower.toFixed(1)),
        };
      });
  }, [devices, range]);

  return (
    <div className="chart-card power-chart">
      <div className="chart-heading">
        <div>
          <h3>กำลังไฟรวมตามเวลา</h3>
          <p>รวมกำลังไฟจากมิเตอร์ที่มีข้อมูล · หน่วย W</p>
        </div>
        <div className="chart-range" aria-label="ช่วงเวลาของกราฟกำลังไฟ">
          {([
            ['hour', '1 ชม.'],
            ['day', '24 ชม.'],
            ['threeDays', '3 วัน'],
            ['week', '7 วัน'],
            ['month', '30 วัน'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={range === value ? 'active' : ''}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="chart-empty">ยังไม่มีข้อมูลกำลังไฟย้อนหลังในช่วงเวลานี้</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              minTickGap={24}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              width={52}
              tick={{ fill: '#64748b', fontSize: 12 }}
              label={{ value: 'W', angle: -90, position: 'insideLeft', fill: '#64748b' }}
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.timestamp
                  ? new Date(payload[0].payload.timestamp).toLocaleString('th-TH')
                  : ''
              }
              formatter={(value) => [`${value} W`, 'กำลังไฟรวม']}
            />
            <Line
              type="monotone"
              dataKey="power"
              name="กำลังไฟรวม"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
