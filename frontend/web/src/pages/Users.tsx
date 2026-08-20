import { useState } from 'react';
import Header from '../components/Header';
import UserCard from '../components/UserCard';
import '../styles/users.css';
import { useUsers, useAllDevices } from '../services/hooks';
import { createUserRecord, updateUserRecord, deleteUserRecord } from '../services/database';

interface User {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  rooms?: string[];
}

export default function UsersPage() {
  const { users, loading, error } = useUsers();
  const { devices } = useAllDevices();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // modal form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('พนักงาน');
  const [formRooms, setFormRooms] = useState<string[]>([]);

  const handleCreate = async (user: Omit<User, 'id'>) => {
    await createUserRecord(user as any);
    setShowModal(false);
  };

  const handleUpdate = async (id: string, user: Partial<User>) => {
    await updateUserRecord(id, user as any);
    setShowModal(false);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('ลบผู้ใช้นี้จริงหรือไม่?')) return;
    await deleteUserRecord(id);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('พนักงาน');
    setFormRooms([]);
    setShowModal(true);
  };

  const openEditModal = (user?: User) => {
    if (!user) return;
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email || '');
    setFormRole(user.role || 'พนักงาน');
    setFormRooms(user.rooms || []);
    setShowModal(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editingUser.id) {
      await handleUpdate(editingUser.id, { name: formName, email: formEmail, role: formRole, rooms: formRooms });
    } else {
      await handleCreate({ name: formName, email: formEmail, role: formRole, rooms: formRooms });
    }
  };

  return (
    <div className="users-page">
      <Header />
      <div className="users-content">
        <div className="users-header">
          <h2>จัดการผู้ใช้งาน</h2>
          <p className="muted">เพิ่ม แก้ไข ลบ และมอบหมายห้องให้พนักงาน</p>
          <div className="users-actions">
            <button className="add-user" onClick={openCreateModal}>+ เพิ่มผู้ใช้</button>
          </div>
        </div>

        <div className="users-list">
          {loading && <div>⏳ กำลังโหลดผู้ใช้...</div>}
          {error && <div style={{ color: 'red' }}>{error.message}</div>}
          {users.map((u) => (
            <div key={u.id} className="users-list-item">
              <UserCard
                id={u.id}
                name={u.name}
                email={u.email}
                role={u.role}
                rooms={u.rooms}
                onEdit={() => openEditModal(u as User)}
                onDelete={() => handleDelete(u.id)}
              />
            </div>
          ))}
        </div>
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h3>{editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}</h3>
              <form onSubmit={submitForm}>
                <div style={{ marginBottom: 8 }}>
                  <label>ชื่อ</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>อีเมล</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>มอบหมายห้อง</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {Array.from(new Set(devices.map((d) => d.room).filter(Boolean))).map((r) => {
                      const selected = formRooms.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          className={`room-pill ${selected ? 'selected' : ''}`}
                          onClick={() => {
                            if (selected) setFormRooms((s) => s.filter((x) => x !== r));
                            else setFormRooms((s) => [...s, r]);
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>บทบาท</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                    <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                    <option value="พนักงาน">พนักงาน</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowModal(false)}>ยกเลิก</button>
                  <button type="submit" className="add-user">บันทึก</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
