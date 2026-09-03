import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Device } from '../services/database';
import '../styles/chart.css';

interface PowerChartProps {
  devices: Device[];
}

export default function PowerChart({ devices }: PowerChartProps) {
  const chartData = devices.filter((device) => device.power > 0).map((device) => ({
    device: device.name,
    power: device.power,
  }));

  return (
    <div className="chart-card power-chart">
      <h3>พลังงาน (kWh) ต่ออุปกรณ์</h3>
      {chartData.length === 0 ? (
        <div className="chart-empty">ยังไม่มีตัววัดพลังงาน</div>
      ) : <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="device" />
          <YAxis />
          <Tooltip formatter={(value) => `${value} kWh`} />
          <Bar dataKey="power" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>}
    </div>
  );
}
