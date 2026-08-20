import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAllDevices } from '../services/hooks';
import { useRooms } from '../services/hooks';
import { createRoomRecord, updateRoomRecord, deleteRoomRecord } from '../services/database';
import '../styles/rooms.css';

interface RoomFormState {
  name: string;
  floor: string;
}

export default function RoomsPage() {
  const navigate = useNavigate();
  const { rooms, loading: roomsLoading, error: roomsError } = useRooms();
  const { devices } = useAllDevices();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>({ name: '', floor: '' });

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', floor: '' });
    setShowModal(true);
  };

  const openEditModal = (id?: string, name?: string, floor?: string) => {
    if (!id) return;
    setEditingId(id);
    setForm({ name: name || '', floor: floor || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const floor = form.floor.trim();
    if (!name) return;

    if (editingId) {
      await updateRoomRecord(editingId, { name, floor });
    } else {
      await createRoomRecord({ name, floor });
    }

    setShowModal(false);
    setForm({ name: '', floor: '' });
    setEditingId(null);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('ลบห้องนี้ใช่หรือไม่?')) return;
    await deleteRoomRecord(id);
  };

  const roomList = rooms.map((room) => ({
    ...room,
    devices: devices.filter((d) => d.room === room.name).length,
  }));

  return (
    <div className="rooms-page">
      <header className="rooms-topbar">
        <div className="topbar-title">ห้องและอาคาร</div>
        <div className="topbar-tools">
          <div className="live-pill">
            <span className="dot" />
            Live 5/7
          </div>
          <div className="date-pill">วัน / เดือน / ปี</div>
          <div className="profile-box">
            <span>สมชาย</span>
            <div className="profile-avatar">ส</div>
          </div>
        </div>
      </header>

      <div className="rooms-content">
        <div className="rooms-header-row">
          <div>
            <h1>ห้องและอาคาร</h1>
            <p>จัดการข้อมูลห้องและอาคารทั้งหมด</p>
          </div>

          <button className="add-room-button" onClick={openCreateModal}>
            <Plus size={18} />
            เพิ่มห้อง
          </button>
        </div>

        {roomsError && <div className="rooms-error">{roomsError.message}</div>}
        {roomsLoading && <div className="rooms-loading">กำลังโหลดห้อง...</div>}

        <div className="rooms-grid">
          {roomList.map((room) => (
            <div
              className="room-card"
              key={room.id}
              onClick={() => navigate(`/devices?room=${encodeURIComponent(room.name)}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/devices?room=${encodeURIComponent(room.name)}`);
                }
              }}
            >
              <div className="room-card-actions">
                <button
                  className="mini-btn"
                  aria-label="Edit room"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(room.id, room.name, room.floor);
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="mini-btn danger"
                  aria-label="Delete room"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(room.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="room-card-main">
                <div className="room-icon">
                  <Building2 size={20} />
                </div>
                <div className="room-name-block">
                  <div className="room-name">{room.name}</div>
                  <div className="room-floor">{room.floor ? `ที่ ${room.floor}` : 'ไม่ระบุชั้น'}</div>
                </div>
              </div>

              <div className="room-device-count">
                <span className="device-dot" />
                {room.devices} อุปกรณ์
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="room-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label>ชื่อห้อง</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น Room 1"
                  required
                />
              </div>

              <div className="form-row">
                <label>ชั้น</label>
                <input
                  value={form.floor}
                  onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="เช่น 1 หรือ 2"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'บันทึก' : 'เพิ่มห้อง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
