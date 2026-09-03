import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Device } from '../services/database';
import '../styles/chart.css';

interface TemperatureChartProps {
  devices: Device[];
}

export default function TemperatureChart({ devices }: TemperatureChartProps) {
  const chartData = devices
    .flatMap((device) => Object.values(device.history || {}).map((entry) => ({
      timestamp: entry.timestamp || 0,
      time: entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        : '-',
      temp: Number(entry.temperature || 0),
    })))
    .filter((entry) => entry.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-24);

  return (
    <div className="chart-card">
      <h3>อุณหภูมิเฉลี่ย - 24 ชั่วโมง</h3>
      {chartData.length === 0 ? (
        <div className="chart-empty">ยังไม่มีข้อมูลย้อนหลังจาก Firebase</div>
      ) : <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" />
          <YAxis domain={[18, 33]} />
          <Tooltip formatter={(value) => `${value}°C`} />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>}
    </div>
  );
}
