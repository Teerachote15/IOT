import { useEffect, useMemo, useState } from 'react';
import { Thermometer, Droplets, Zap, Wifi } from 'lucide-react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TemperatureChart from '../components/TemperatureChart';
import PowerChart from '../components/PowerChart';
import DeviceTable from '../components/DeviceTable';
import { useAllDevices, useRooms } from '../services/hooks';
import { Device, DeviceHistoryPoint, isDeviceDataStale } from '../services/database';
import '../styles/dashboard.css';

function getEnergyToday(devices: Device[]) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTimestamp = startOfToday.getTime();
  const meters = devices.filter((device) =>
    device.sensors?.pzem?.energy != null ||
    Object.values(device.history || {}).some((point) => point.energy != null)
  );
  let total = 0;
  let completeMeters = 0;

  meters.forEach((device) => {
    const readings: DeviceHistoryPoint[] = Object.values(device.history || {});
    const latest = device.sensors?.pzem;
    if (latest?.energy != null && latest.timestamp != null) readings.push(latest);

    const validReadings = readings
      .filter((point) =>
        point.timestamp != null &&
        point.energy != null &&
        Number.isFinite(Number(point.timestamp)) &&
        Number.isFinite(Number(point.energy))
      )
      .map((point) => ({
        timestamp: Number(point.timestamp),
        energy: Number(point.energy),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    const baseline = validReadings
      .filter((point) => point.timestamp <= startTimestamp)
      .reduce<typeof validReadings[number] | null>(
        (latestPoint, point) =>
          latestPoint == null || point.timestamp > latestPoint.timestamp ? point : latestPoint,
        null,
      );
    const latestToday = validReadings
      .filter((point) => point.timestamp > startTimestamp && point.timestamp <= now)
      .reduce<typeof validReadings[number] | null>(
        (latestPoint, point) =>
          latestPoint == null || point.timestamp > latestPoint.timestamp ? point : latestPoint,
        null,
      );

    if (baseline && latestToday && latestToday.energy >= baseline.energy) {
      total += latestToday.energy - baseline.energy;
      completeMeters += 1;
    }
  });

  return {
    value: meters.length > 0 && completeMeters === meters.length ? total : null,
    meterCount: meters.length,
    completeMeters,
  };
}

export default function Dashboard() {
  const { devices, loading, error } = useAllDevices();
  const { rooms } = useRooms();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const roomDevices = useMemo(
    () => selectedRoom
      ? devices.filter((device) =>
          device.roomId === selectedRoom.id ||
          (!device.roomId &&
            device.room === selectedRoom.name &&
            (!device.building || device.building === (selectedRoom.building || selectedRoom.floor)))
        )
      : devices,
    [devices, selectedRoom]
  );
  const onlineDeviceList = useMemo(
    () => roomDevices.filter((device) => device.status === 'online' && !isDeviceDataStale(device, now)),
    [roomDevices, now]
  );
  const staleDeviceCount = roomDevices.filter(
    (device) => device.status === 'online' && isDeviceDataStale(device, now),
  ).length;
  const temperatureReadings = useMemo(
    () => onlineDeviceList
      .filter((device) => device.temperature > 0)
      .map((device) => device.temperature),
    [onlineDeviceList],
  );
  const humidityReadings = useMemo(
    () => onlineDeviceList
      .filter((device) => device.humidity > 0)
      .map((device) => device.humidity),
    [onlineDeviceList],
  );
  const currentTemperature = temperatureReadings.length
    ? temperatureReadings.reduce((sum, value) => sum + value, 0) / temperatureReadings.length
    : null;
  const currentHumidity = humidityReadings.length
    ? humidityReadings.reduce((sum, value) => sum + value, 0) / humidityReadings.length
    : null;
  const onlineDevices = onlineDeviceList.length;
  const offlineDevices = roomDevices.filter((device) => device.status === 'offline').length;
  const powerMeters = onlineDeviceList.filter(
    (device) => device.sensors?.pzem && typeof device.sensors.pzem.power === 'number',
  );
  const currentPower = powerMeters.reduce(
    (total, device) => total + (device.sensors?.pzem?.power || 0),
    0,
  );
  const energyToday = getEnergyToday(roomDevices);
  const roomsByBuilding = rooms.reduce<Record<string, typeof rooms>>((groups, room) => {
    const building = room.building || room.floor || 'ไม่ระบุอาคาร';
    (groups[building] ||= []).push(room);
    return groups;
  }, {});

  return (
    <div className="dashboard-container">
      <Header />

      <div className="dashboard-content">
        <div className="dashboard-overview-heading">
          <div>
            <h1>ภาพรวมระบบ</h1>
            <p>
              {selectedRoom
                ? `${selectedRoom.building || selectedRoom.floor || 'ไม่ระบุอาคาร'} · ${selectedRoom.name}`
                : 'สถานะและข้อมูลเซนเซอร์ของทุกห้อง'}
            </p>
          </div>
          <div className="dashboard-room-filter">
            <label htmlFor="dashboard-room">เลือกห้อง</label>
            <select
              id="dashboard-room"
              value={selectedRoomId}
              onChange={(event) => setSelectedRoomId(event.target.value)}
            >
              <option value="">ภาพรวมทุกห้อง</option>
              {Object.entries(roomsByBuilding).map(([building, buildingRooms]) => (
                <optgroup key={building} label={building}>
                  {buildingRooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: '#fee2e2',
              color: '#7f1d1d',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            ⚠️ เกิดข้อผิดพลาด: {error.message}
          </div>
        )}

        {loading && devices.length === 0 && (
          <div
            style={{
              padding: '12px 16px',
              background: '#dbeafe',
              color: '#1e40af',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            ⏳ กำลังโหลดข้อมูล...
          </div>
        )}

        {/* Stat Cards Row */}
        <div className="stats-grid">
          <StatCard
            icon={Thermometer}
            title="อุณหภูมิปัจจุบัน"
            value={currentTemperature == null ? '--' : currentTemperature.toFixed(1)}
            unit="°C"
            subtitle={temperatureReadings.length ? `ค่าล่าสุดจาก ${temperatureReadings.length} อุปกรณ์ออนไลน์` : 'ไม่มีข้อมูลปัจจุบัน'}
          />
          <StatCard
            icon={Droplets}
            title="ความชื้นปัจจุบัน"
            value={currentHumidity == null ? '--' : currentHumidity.toFixed(1)}
            unit="%"
            subtitle={humidityReadings.length ? `ค่าล่าสุดจาก ${humidityReadings.length} อุปกรณ์ออนไลน์` : 'ไม่มีข้อมูลปัจจุบัน'}
          />
          <StatCard
            icon={Zap}
            title="กำลังไฟปัจจุบัน"
            value={powerMeters.length ? currentPower.toFixed(1) : '--'}
            unit={powerMeters.length ? 'W' : undefined}
            subtitle={powerMeters.length ? `จาก ${powerMeters.length} มิเตอร์ที่ส่งข้อมูลล่าสุด` : 'ไม่มีมิเตอร์ที่ส่งข้อมูลล่าสุด'}
          />
          <StatCard
            icon={Zap}
            title="พลังงานที่ใช้วันนี้"
            value={energyToday.value == null ? '--' : energyToday.value.toFixed(3)}
            unit={energyToday.value == null ? undefined : 'kWh'}
            subtitle={
              energyToday.meterCount === 0
                ? 'ไม่มีมิเตอร์วัดพลังงาน'
                : energyToday.value == null
                  ? `ข้อมูลรายวันไม่ครบ (${energyToday.completeMeters}/${energyToday.meterCount} มิเตอร์)`
                  : `รวมจาก ${energyToday.meterCount} มิเตอร์ · ตั้งแต่เที่ยงคืน`
            }
          />
          <StatCard
            icon={Wifi}
            title="สถานะอุปกรณ์"
            value={`${onlineDevices}/${roomDevices.length}`}
            unit="Online"
            subtitle={`${offlineDevices} ออฟไลน์ · ${staleDeviceCount} ข้อมูลล่าช้า`}
          />
        </div>

        {/* Charts Row */}
        <div className="charts-grid">
          <TemperatureChart devices={roomDevices} />
          <PowerChart devices={roomDevices} />
        </div>

        {/* Device Table */}
        <DeviceTable devices={roomDevices} />
      </div>
    </div>
  );
}
