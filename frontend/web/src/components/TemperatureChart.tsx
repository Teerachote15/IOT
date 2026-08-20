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
  // สร้างข้อมูลจำลองสำหรับแผนภูมิ (Mock hourly data)
  const mockData = [
    { time: '00:00', temp: 22 },
    { time: '04:00', temp: 20 },
    { time: '08:00', temp: 24 },
    { time: '12:00', temp: 28 },
    { time: '16:00', temp: devices.length > 0 ? devices[0].temperature : 26 },
    { time: '20:00', temp: 24 },
  ];

  return (
    <div className="chart-card">
      <h3>อุณหภูมิเฉลี่ย - 24 ชั่วโมง</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockData}>
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
      </ResponsiveContainer>
    </div>
  );
}
