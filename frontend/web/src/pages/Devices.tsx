import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAllDevices, useRooms } from '../services/hooks';
import {
  createDeviceRecord,
  deleteDeviceRecord,
  updateDeviceRecord,
} from '../services/database';
import '../styles/devices.css';

interface DeviceFormState {
  name: string;
  room: string;
  status: 'online' | 'offline' | 'problem';
  temperature: number;
  humidity: number;
  power: number;
}

const defaultFormState: DeviceFormState = {
  name: '',
  room: '',
  status: 'online',
  temperature: 0,
  humidity: 0,
  power: 0,
};

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    problem: 'ปัญหา',
  };
  return labels[status] || 'ออฟไลน์';
}

function getLastSeenText(timestamp: number): string {
  const diff = Date.now() - timestamp;

  if (diff < 60000) return 'เมื่อสักครู่';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400000)} วันที่แล้ว`;
}

export default function DevicesPage() {
  const [searchParams] = useSearchParams();
  const { devices, loading, error } = useAllDevices();
  const { rooms } = useRooms();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const roomFromQuery = searchParams.get('room');
    if (roomFromQuery) {
      setSearch(roomFromQuery);
    }
  }, [searchParams]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormState>(defaultFormState);

  const filteredDevices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return devices;

    return devices.filter((device) => {
      return (
        device.name.toLowerCase().includes(keyword) ||
        device.room.toLowerCase().includes(keyword)
      );
    });
  }, [devices, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(defaultFormState);
    setShowModal(true);
  };

  const openEditModal = (device: { id?: string; name: string; room: string; status: string; temperature: number; humidity: number; power: number }) => {
    if (!device.id) return;
    setEditingId(device.id);
    setForm({
      name: device.name,
      room: device.room,
      status: (device.status as 'online' | 'offline' | 'problem') || 'online',
      temperature: Number(device.temperature) || 0,
      humidity: Number(device.humidity) || 0,
      power: Number(device.power) || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      room: form.room.trim(),
      status: form.status,
      enabled: form.status === 'online',
      last: {
        temperature: Number(form.temperature) || 0,
        humidity: Number(form.humidity) || 0,
        power: Number(form.power) || 0,
        timestamp: Date.now(),
      },
    };

    if (!payload.name || !payload.room) return;

    if (editingId) {
      await updateDeviceRecord(editingId, {
        name: payload.name,
        room: payload.room,
        status: payload.status,
        enabled: payload.enabled,
        last: payload.last,
      });
    } else {
      await createDeviceRecord({
        name: payload.name,
        room: payload.room,
        status: payload.status,
        enabled: payload.enabled,
        last: payload.last,
      });
    }

    setShowModal(false);
    setForm(defaultFormState);
    setEditingId(null);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('ลบอุปกรณ์นี้ใช่หรือไม่?')) return;
    await deleteDeviceRecord(id);
  };

  const toggleDeviceStatus = async (id?: string, status?: string) => {
    if (!id) return;
    const nextStatus = status === 'online' ? 'offline' : 'online';
    const confirmMessage = nextStatus === 'online'
      ? 'ต้องการเปิดอุปกรณ์นี้หรือไม่?'
      : 'ต้องการปิดอุปกรณ์นี้หรือไม่?';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    await updateDeviceRecord(id, {
      status: nextStatus,
      enabled: nextStatus === 'online',
    });
  };

  return (
    <div className="devices-page">
      <header className="devices-topbar">
        <div className="devices-brand">อุปกรณ์ IoT</div>
        <div className="devices-topbar-right">
          <div className="live-pill">
            <span className="live-dot" />
            Live 5/7
          </div>
          <div className="date-pill">วัน / เดือน / ปี</div>
          <div className="profile-box">
            <span>สมชาย</span>
            <div className="profile-avatar">ส</div>
          </div>
        </div>
      </header>

      <div className="devices-content">
        <div className="devices-header-row">
          <div>
            <h1>อุปกรณ์ IoT</h1>
            <p>จัดการอุปกรณ์และสถานะของอุปกรณ์ในระบบ</p>
          </div>

          <button className="add-device-btn" onClick={openCreateModal}>
            <Plus size={18} />
            เพิ่มอุปกรณ์
          </button>
        </div>

        <div className="devices-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์หรือห้อง"
            />
          </div>
        </div>

        {loading && <div className="devices-state">กำลังโหลดข้อมูล...</div>}
        {error && <div className="devices-state error">{error.message}</div>}

        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th>ชื่ออุปกรณ์</th>
                <th>ห้อง</th>
                <th>สถานะ</th>
                <th>อุณหภูมิ</th>
                <th>ความชื้น</th>
                <th>พลังงาน</th>
                <th>เวลา</th>
                <th>เปิด/ปิด</th>
                <th>แก้ไข</th>
                <th>ลบ</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td>{device.room}</td>
                  <td>
                    <span className={`row-status ${device.status}`}>
                      {getStatusLabel(device.status)}
                    </span>
                  </td>
                  <td>{device.temperature.toFixed(1)}°C</td>
                  <td>{device.humidity.toFixed(1)}%</td>
                  <td>{device.power.toFixed(2)} kWh</td>
                  <td>{getLastSeenText(device.lastSeen)}</td>
                  <td>
                    <button
                      className={`toggle-switch ${device.status === 'online' ? 'on' : ''}`}
                      onClick={() => toggleDeviceStatus(device.id, device.status)}
                      type="button"
                      aria-label="Toggle device status"
                    >
                      <span className="toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-action"
                      type="button"
                      onClick={() => openEditModal(device)}
                      aria-label="Edit device"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                  <td>
                    <button
                      className="icon-action danger"
                      type="button"
                      onClick={() => handleDelete(device.id)}
                      aria-label="Delete device"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filteredDevices.length === 0 && (
            <div className="devices-empty">ไม่มีอุปกรณ์ที่ตรงกับคำค้นหา</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="device-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="device-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  <span>ชื่ออุปกรณ์</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  <span>ห้อง</span>
                  <select
                    value={form.room}
                    onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
                    required
                  >
                    <option value="">เลือกห้อง</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.name}>
                        {room.name}
                      </option>
                    ))}
                    {!rooms.some((room) => room.name === form.room) && form.room ? (
                      <option value={form.room}>{form.room}</option>
                    ) : null}
                  </select>
                </label>

                <label>
                  <span>สถานะ</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'online' | 'offline' | 'problem' }))}
                  >
                    <option value="online">ออนไลน์</option>
                    <option value="offline">ออฟไลน์</option>
                    <option value="problem">ปัญหา</option>
                  </select>
                </label>

                <label>
                  <span>อุณหภูมิ (°C)</span>
                  <input
                    type="number"
                    value={form.temperature}
                    onChange={(e) => setForm((prev) => ({ ...prev, temperature: Number(e.target.value) }))}
                  />
                </label>

                <label>
                  <span>ความชื้น (%)</span>
                  <input
                    type="number"
                    value={form.humidity}
                    onChange={(e) => setForm((prev) => ({ ...prev, humidity: Number(e.target.value) }))}
                  />
                </label>

                <label>
                  <span>พลังงาน (kWh)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.power}
                    onChange={(e) => setForm((prev) => ({ ...prev, power: Number(e.target.value) }))}
                  />
                </label>
              </div>

              <div className="device-modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'บันทึก' : 'เพิ่มอุปกรณ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
