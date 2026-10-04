import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { auth } from '../firebase';
import { useAllDevices, useRooms } from '../services/hooks';
import {
  createDeviceControlLog,
  createDeviceRecord,
  DeviceControlLog,
  deleteDeviceRecord,
  isDeviceDataStale,
  subscribeToDeviceControlLogs,
  updateDeviceRecord,
  updateDeviceControlLog,
} from '../services/database';
import '../styles/devices.css';

interface DeviceFormState {
  room: string;
  roomId: string;
  status: 'online' | 'offline' | 'problem';
}

const defaultFormState: DeviceFormState = {
  room: '',
  roomId: '',
  status: 'online',
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
  if (!timestamp) return 'ยังไม่มีข้อมูล';
  const diff = Date.now() - timestamp;

  if (diff < 0) return 'เวลาไม่ถูกต้อง';
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
  const [roomFilterId, setRoomFilterId] = useState('');

  useEffect(() => {
    const roomFromQuery = searchParams.get('room');
    setRoomFilterId(roomFromQuery || '');
  }, [searchParams]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormState>(defaultFormState);
  const [formError, setFormError] = useState('');
  const [savingDevice, setSavingDevice] = useState(false);
  const [pendingRelayId, setPendingRelayId] = useState<string | null>(null);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [controlLogs, setControlLogs] = useState<DeviceControlLog[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const unsubscribe = subscribeToDeviceControlLogs(
      setControlLogs,
      (subscriptionError) => setAuditError(subscriptionError.message),
    );
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  const getRoomLabel = (device: (typeof devices)[number]) => {
    const assignedRoom = rooms.find((room) => room.id === device.roomId);
    const building = assignedRoom?.building || assignedRoom?.floor || device.building;
    const roomName = assignedRoom?.name || device.room;
    return building ? `${building} · ${roomName}` : roomName;
  };

  const filteredDevices = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return devices;

    return devices.filter((device) => {
      return (
        device.name.toLowerCase().includes(keyword) ||
        getRoomLabel(device).toLowerCase().includes(keyword) ||
        (device.building || '').toLowerCase().includes(keyword)
      );
    });
  }, [devices, rooms, search]);
  const visibleDevices = roomFilterId
    ? filteredDevices.filter((device) => {
        const selectedRoom = rooms.find((room) => room.id === roomFilterId);
        return selectedRoom
          ? device.roomId === selectedRoom.id ||
              (!device.roomId && device.room === selectedRoom.name)
          : device.room === roomFilterId;
      })
      : filteredDevices;
  const editingDevice = devices.find((device) => device.id === editingId);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(defaultFormState);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (device: { id?: string; name: string; room: string; roomId?: string; building?: string; status: string }) => {
    if (!device.id) return;
    const matchingRooms = rooms.filter((room) =>
      room.name === device.room &&
      (!device.building || (room.building || room.floor) === device.building)
    );
    const assignedRoom = rooms.find((room) => room.id === device.roomId) ||
      (matchingRooms.length === 1 ? matchingRooms[0] : undefined);
    setEditingId(device.id);
    setForm({
      room: assignedRoom?.name || device.room,
      roomId: assignedRoom?.id || '',
      status: (device.status as 'online' | 'offline' | 'problem') || 'online',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRoom = rooms.find((room) => room.id === form.roomId);
    if (!selectedRoom?.id) {
      setFormError('กรุณาเลือกห้องจากรายการ');
      return;
    }
    setFormError('');
    const payload = {
      room: selectedRoom.name,
      roomId: selectedRoom.id,
      building: selectedRoom.building || selectedRoom.floor || 'ไม่ระบุอาคาร',
      status: form.status,
    };

    setSavingDevice(true);
    try {
      if (editingId) {
        await updateDeviceRecord(editingId, {
          room: payload.room,
          roomId: payload.roomId,
          building: payload.building,
          status: payload.status,
        });
      } else {
        await createDeviceRecord({
          room: payload.room,
          roomId: payload.roomId,
          building: payload.building,
          status: payload.status,
        });
      }
      setShowModal(false);
      setForm(defaultFormState);
      setEditingId(null);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'ไม่สามารถบันทึกอุปกรณ์ได้');
    } finally {
      setSavingDevice(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('ลบอุปกรณ์นี้ใช่หรือไม่?')) return;
    await deleteDeviceRecord(id);
  };

  const toggleRelay = async (id: string, enabled: boolean) => {
    const device = devices.find((item) => item.id === id);
    const user = auth.currentUser;
    if (!device || !user) {
      setRelayError('ไม่พบอุปกรณ์หรือบัญชีผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    const requestedState = !enabled;
    setPendingRelayId(id);
    setRelayError(null);
    let logId: string;
    try {
      logId = await createDeviceControlLog({
        deviceId: id,
        deviceName: device.name,
        requestedState,
        outcome: 'pending',
        actorUid: user.uid,
        ...(user.email ? { actorEmail: user.email } : {}),
        actorName: user.displayName || user.email || user.uid,
        requestedAt: Date.now(),
      });
    } catch (err) {
      setRelayError(`บันทึกประวัติคำสั่งไม่สำเร็จ จึงไม่ได้ส่งคำสั่ง: ${err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'}`);
      setPendingRelayId(null);
      return;
    }

    try {
      await updateDeviceRecord(id, { enabled: requestedState });
    } catch (err) {
      const commandError = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      try {
        await updateDeviceControlLog(logId, {
          outcome: 'failed',
          completedAt: Date.now(),
          error: commandError,
        });
        setRelayError(`สั่งงานรีเลย์ไม่สำเร็จ: ${commandError}`);
      } catch (auditUpdateError) {
        setRelayError(
          `สั่งงานรีเลย์ไม่สำเร็จ (${commandError}) และบันทึกผลคำสั่งไม่ได้ (${auditUpdateError instanceof Error ? auditUpdateError.message : 'เกิดข้อผิดพลาด'})`,
        );
      }
      setPendingRelayId(null);
      return;
    }

    try {
      await updateDeviceControlLog(logId, {
        outcome: 'sent',
        completedAt: Date.now(),
      });
    } catch (auditUpdateError) {
      setRelayError(
        `ส่งคำสั่งแล้ว แต่บันทึกผลสำเร็จไม่ได้: ${auditUpdateError instanceof Error ? auditUpdateError.message : 'เกิดข้อผิดพลาด'}`,
      );
    }
    setPendingRelayId(null);
  };

  return (
    <div className="devices-page">
      <PageHeader title="อุปกรณ์ IoT" />

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
        {relayError && <div className="devices-state error">{relayError}</div>}

        <div className="devices-table-wrap">
          <table className="devices-table">
            <thead>
              <tr>
                <th>ชื่ออุปกรณ์</th>
                <th>ห้อง</th>
                <th>สถานะ</th>
                <th>อุณหภูมิ</th>
                <th>ความชื้น</th>
                <th>กำลังไฟ</th>
                <th>อัปเดตล่าสุด</th>
                <th>เปิด/ปิด</th>
                <th>แก้ไข</th>
                <th>ลบ</th>
              </tr>
            </thead>
            <tbody>
              {visibleDevices.map((device) => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td>{getRoomLabel(device)}</td>
                  <td>
                    <span className={`row-status ${device.status === 'online' && isDeviceDataStale(device, now) ? 'offline' : device.status}`}>
                      {device.status === 'online' && isDeviceDataStale(device, now) ? 'ข้อมูลล่าช้า' : getStatusLabel(device.status)}
                    </span>
                  </td>
                  <td>{device.sensors?.dht22?.temperature == null ? '—' : `${device.sensors.dht22.temperature.toFixed(1)}°C`}</td>
                  <td>{device.sensors?.dht22?.humidity == null ? '—' : `${device.sensors.dht22.humidity.toFixed(1)}%`}</td>
                  <td>{device.sensors?.pzem?.power == null ? '—' : `${device.sensors.pzem.power.toFixed(1)} W`}</td>
                  <td>{getLastSeenText(device.lastSeen)}</td>
                  <td>
                    {device.hasRelay ? (
                      <button
                        className={`toggle-switch ${device.enabled ? 'on' : ''}`}
                        onClick={() => toggleRelay(device.id, device.enabled ?? false)}
                        type="button"
                        disabled={pendingRelayId === device.id}
                        aria-label={device.enabled ? 'ปิดปลั๊ก' : 'เปิดปลั๊ก'}
                        aria-checked={device.enabled}
                        role="switch"
                        title={device.enabled ? 'ปลั๊กเปิดอยู่' : 'ปลั๊กปิดอยู่'}
                      >
                        <span className="toggle-knob" />
                      </button>
                    ) : (
                      <span aria-label="อุปกรณ์นี้ไม่มีรีเลย์">—</span>
                    )}
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

          {!loading && visibleDevices.length === 0 && (
            <div className="devices-empty">ไม่มีอุปกรณ์ที่ตรงกับคำค้นหา</div>
          )}
        </div>

        <section className="control-audit">
          <div className="control-audit-heading">
            <div>
              <h2>ประวัติการควบคุมปลั๊ก</h2>
              <p>บันทึกคำสั่งล่าสุดไม่เกิน 100 รายการ · “ส่งแล้ว” หมายถึงบันทึกคำสั่งใน Firebase ไม่ใช่การยืนยันจากตัวอุปกรณ์</p>
            </div>
          </div>
          {auditError && <div className="devices-state error">โหลดประวัติคำสั่งไม่สำเร็จ: {auditError}</div>}
          {!auditError && controlLogs.length === 0 && (
            <div className="devices-empty">ยังไม่มีประวัติการสั่งงานรีเลย์</div>
          )}
          {controlLogs.length > 0 && (
            <div className="control-audit-wrap">
              <table className="devices-table control-audit-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>อุปกรณ์</th>
                    <th>คำสั่ง</th>
                    <th>ผู้สั่ง</th>
                    <th>ผลลัพธ์</th>
                  </tr>
                </thead>
                <tbody>
                  {controlLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.requestedAt).toLocaleString('th-TH')}</td>
                      <td>{log.deviceName}</td>
                      <td>{log.requestedState ? 'เปิด' : 'ปิด'}</td>
                      <td>{log.actorName || log.actorEmail || log.actorUid || 'ไม่ทราบผู้ใช้'}</td>
                      <td>
                        <span className={`row-status ${log.outcome === 'sent' ? 'online' : log.outcome === 'failed' ? 'offline' : 'problem'}`}>
                          {log.outcome === 'sent' ? 'ส่งแล้ว' : log.outcome === 'failed' ? 'ไม่สำเร็จ' : 'กำลังส่ง'}
                        </span>
                        {log.error && <div className="audit-error-detail">{log.error}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="device-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="device-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}</h3>

            <form onSubmit={handleSubmit}>
              {formError && <div className="devices-state error">{formError}</div>}
              <div className="form-grid">
                <label>
                  <span>ID อุปกรณ์</span>
                  <input
                    value={editingDevice?.name || 'สร้างอัตโนมัติเมื่อบันทึก'}
                    readOnly
                  />
                </label>

                <label>
                  <span>อาคาร / ห้อง</span>
                  <select
                    value={form.roomId}
                    onChange={(e) => {
                      const room = rooms.find((item) => item.id === e.target.value);
                      setForm((prev) => ({
                        ...prev,
                        roomId: e.target.value,
                        room: room?.name || '',
                      }));
                    }}
                    required
                  >
                    <option value="">เลือกห้อง</option>
                    {Object.entries(rooms.reduce<Record<string, typeof rooms>>((groups, room) => {
                      const building = room.building || room.floor || 'ไม่ระบุอาคาร';
                      (groups[building] ||= []).push(room);
                      return groups;
                    }, {})).map(([building, buildingRooms]) => (
                      <optgroup key={building} label={building}>
                        {buildingRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
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

              </div>

              <div className="device-modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)} disabled={savingDevice}>
                  ยกเลิก
                </button>
                <button type="submit" className="primary-btn" disabled={savingDevice}>
                  {savingDevice ? 'กำลังบันทึก...' : editingId ? 'บันทึก' : 'เพิ่มอุปกรณ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
