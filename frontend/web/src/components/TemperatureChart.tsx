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

interface TemperatureChartProps {
  devices: Device[];
}

type Metric = 'temperature' | 'humidity';
type Range = 'hour' | 'day' | 'threeDays' | 'week' | 'month';

const rangeOptions: Array<[Range, string]> = [
  ['hour', '1 ชม.'],
  ['day', '24 ชม.'],
  ['threeDays', '3 วัน'],
  ['week', '7 วัน'],
  ['month', '30 วัน'],
];

export default function TemperatureChart({ devices }: TemperatureChartProps) {
  const [metric, setMetric] = useState<Metric>('temperature');
  const [range, setRange] = useState<Range>('day');
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
    const hasMetricData = history.some((point) =>
      metric === 'temperature'
        ? point.hasTemperatureData
        : point.hasHumidityData,
    );
    if (!hasMetricData) return [];
    return history.map((point) => ({
        timestamp: point.timestamp,
        time: point.time,
        reading: point[metric] ?? 0,
      }));
  }, [devices, metric, rangeHours]);

  const isTemperature = metric === 'temperature';
  const title = isTemperature ? 'อุณหภูมิ' : 'ความชื้น';
  const unit = isTemperature ? '°C' : '%';
  const color = isTemperature ? '#0ea5e9' : '#8b5cf6';

  return (
    <div className="chart-card">
      <div className="chart-heading">
        <div>
          <h3>{title}ย้อนหลัง</h3>
          <p>ค่าเฉลี่ยจากอุปกรณ์ที่มีข้อมูลในแต่ละช่วง · {unit}</p>
        </div>
        <div className="chart-selectors">
          <div className="chart-range" aria-label="เลือกเซนเซอร์">
            {([
              ['temperature', 'อุณหภูมิ'],
              ['humidity', 'ความชื้น'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={metric === value ? 'active' : ''}
                aria-pressed={metric === value}
                onClick={() => setMetric(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="chart-range" aria-label="ช่วงเวลาของกราฟเซนเซอร์">
            {rangeOptions.map(([value, label]) => (
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
      </div>
      {chartData.length === 0 ? (
        <div className="chart-empty">ยังไม่มีข้อมูล{title}ย้อนหลังในช่วงเวลานี้</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" minTickGap={24} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis
              width={52}
              domain={['auto', 'auto']}
              tick={{ fill: '#64748b', fontSize: 12 }}
              label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#64748b' }}
            />
            <Tooltip
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.timestamp
                  ? new Date(payload[0].payload.timestamp).toLocaleString('th-TH')
                  : ''
              }
              formatter={(value) => [`${value}${unit}`, `${title}เฉลี่ย`]}
            />
            <Line
              type="monotone"
              dataKey="reading"
              name={`${title}เฉลี่ย`}
              stroke={color}
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
