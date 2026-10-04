import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAllDevices } from '../services/hooks';
import { useRooms } from '../services/hooks';
import { createRoomRecord, updateRoomRecord, deleteRoomRecord } from '../services/database';
import '../styles/rooms.css';

interface RoomFormState {
  name: string;
  building: string;
}

export default function RoomsPage() {
  const navigate = useNavigate();
  const { rooms, loading: roomsLoading, error: roomsError } = useRooms();
  const { devices } = useAllDevices();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>({ name: '', building: '' });
  const [formError, setFormError] = useState('');
  const [addingBuilding, setAddingBuilding] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState('');

  const buildings = Array.from(new Set(
    rooms.map((room) => room.building || room.floor).filter((building): building is string => Boolean(building))
  )).sort((a, b) => a.localeCompare(b, 'th'));

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', building: '' });
    setFormError('');
    setAddingBuilding(buildings.length === 0);
    setShowModal(true);
  };

  const openEditModal = (id?: string, name?: string, building?: string) => {
    if (!id) return;
    setEditingId(id);
    setForm({ name: name || '', building: building || '' });
    setFormError('');
    setAddingBuilding(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const building = form.building.trim();
    if (!name || !building) return;

    setFormError('');
    try {
      if (editingId) {
        const previousRoom = rooms.find((room) => room.id === editingId);
        await updateRoomRecord(editingId, { name, building }, previousRoom?.name);
      } else {
        await createRoomRecord({ name, building });
      }
      setShowModal(false);
      setForm({ name: '', building: '' });
      setEditingId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'ไม่สามารถบันทึกห้องได้');
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('ลบห้องนี้ใช่หรือไม่?')) return;
    try {
      const room = rooms.find((item) => item.id === id);
      await deleteRoomRecord(id, room?.name);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'ไม่สามารถลบห้องได้');
    }
  };

  const roomList = rooms.map((room) => ({
    ...room,
    building: room.building || room.floor || 'ไม่ระบุอาคาร',
    devices: devices.filter((device) =>
      device.roomId
        ? device.roomId === room.id
        : device.room === room.name &&
          (!device.building || device.building === (room.building || room.floor))
    ).length,
  }));
  const visibleRooms = selectedBuilding
    ? roomList.filter((room) => room.building === selectedBuilding)
    : roomList;
  const roomsByBuilding = visibleRooms.reduce<Record<string, typeof roomList>>((groups, room) => {
    (groups[room.building] ||= []).push(room);
    return groups;
  }, {});

  return (
    <div className="rooms-page">
      <PageHeader title="ห้องและอาคาร" />

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

        <div className="rooms-toolbar">
          <label htmlFor="building-filter">เลือกอาคาร</label>
          <select
            id="building-filter"
            value={selectedBuilding}
            onChange={(event) => setSelectedBuilding(event.target.value)}
          >
            <option value="">ทุกอาคาร</option>
            {buildings.map((building) => (
              <option key={building} value={building}>{building}</option>
            ))}
          </select>
        </div>

        {formError && <div className="rooms-error">{formError}</div>}
        {!roomsLoading && visibleRooms.length === 0 && (
          <div className="rooms-empty">
            {selectedBuilding ? 'อาคารนี้ยังไม่มีห้อง' : 'ยังไม่มีห้อง กรุณาเพิ่มห้อง'}
          </div>
        )}
        {Object.entries(roomsByBuilding).map(([building, buildingRooms]) => (
          <section className="building-section" key={building}>
            <h2 className="building-heading"><Building2 size={18} />{building}</h2>
            <div className="rooms-grid">
              {buildingRooms.map((room) => (
                <div
                  className="room-card"
                  key={room.id}
                  onClick={() => navigate(`/devices?room=${encodeURIComponent(room.id || '')}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/devices?room=${encodeURIComponent(room.id || '')}`);
                    }
                  }}
                >
                  <div className="room-card-actions">
                    <button
                      className="mini-btn"
                      aria-label="Edit room"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(room.id, room.name, room.building);
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
                    <div className="room-icon"><Building2 size={20} /></div>
                    <div className="room-name-block">
                      <div className="room-name">{room.name}</div>
                    </div>
                  </div>

                  <div className="room-device-count">
                    <span className="device-dot" />
                    {room.devices} อุปกรณ์
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="room-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'แก้ไขห้อง' : 'เพิ่มห้องใหม่'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <label htmlFor="room-building">อาคาร</label>
                {addingBuilding ? (
                  <div className="building-entry">
                    <input
                      id="room-building"
                      value={form.building}
                      onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
                      placeholder="ระบุชื่ออาคารใหม่"
                      required
                    />
                    {buildings.length > 0 && (
                      <button type="button" className="building-mode-button" onClick={() => setAddingBuilding(false)}>
                        เลือกอาคารเดิม
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    id="room-building"
                    value={form.building}
                    onChange={(event) => {
                      if (event.target.value === '__new_building__') {
                        setForm((prev) => ({ ...prev, building: '' }));
                        setAddingBuilding(true);
                      } else {
                        setForm((prev) => ({ ...prev, building: event.target.value }));
                      }
                    }}
                    required
                  >
                    <option value="">เลือกอาคาร</option>
                    {buildings.map((building) => (
                      <option key={building} value={building}>{building}</option>
                    ))}
                    <option value="__new_building__">+ เพิ่มอาคารใหม่</option>
                  </select>
                )}
              </div>

              <div className="form-row">
                <label htmlFor="room-name">ห้อง</label>
                <input
                  id="room-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ห้อง 101"
                  required
                />
              </div>

              {formError && <div className="rooms-error">{formError}</div>}

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
