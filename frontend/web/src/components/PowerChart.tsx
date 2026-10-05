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
import { buildHistoryChartData } from '../services/historyChart';
import '../styles/chart.css';

interface PowerChartProps {
  devices: Device[];
}

export default function PowerChart({ devices }: PowerChartProps) {
  const [range, setRange] = useState<'hour' | 'day' | 'threeDays' | 'week' | 'month'>('day');
  const rangeHours = range === 'hour'
    ? 1
    : range === 'day'
      ? 24
      : range === 'threeDays'
        ? 72
        : range === 'week'
          ? 168
          : 720;
  const chartData = useMemo(() => {
    const history = buildHistoryChartData(devices, rangeHours);
    if (!history.some((point) => point.hasPowerData)) return [];
    return history.map((point) => ({
          timestamp: point.timestamp,
          time: point.time,
          power: point.power ?? 0,
        }));
  }, [devices, rangeHours]);

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
