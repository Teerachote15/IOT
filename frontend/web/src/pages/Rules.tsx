import { useEffect, useState } from 'react';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRooms } from '../services/hooks';
import { createRuleRecord, deleteRuleRecord, subscribeToRules, updateRuleRecord } from '../services/database';
import '../styles/rules.css';

interface RuleFormState {
  name: string;
  metric: 'temperature' | 'humidity' | 'power';
  operator: 'greater_than' | 'less_than' | 'equal';
  threshold: number;
  rooms: string[];
  enabled: boolean;
}

const defaultForm: RuleFormState = {
  name: '',
  metric: 'temperature',
  operator: 'greater_than',
  threshold: 0,
  rooms: [],
  enabled: true,
};

function formatMetric(metric: string) {
  if (metric === 'temperature') return 'อุณหภูมิ';
  if (metric === 'humidity') return 'ความชื้น';
  return 'พลังงาน';
}

function formatOperator(operator: string) {
  if (operator === 'greater_than') return '>';
  if (operator === 'less_than') return '<';
  return '=';
}

function getConditionText(rule: any) {
  const metricLabel = formatMetric(rule.metric || 'temperature');
  const operatorText = formatOperator(rule.operator || 'greater_than');
  return `${metricLabel} ${operatorText} ${rule.threshold ?? 0}`;
}

export default function RulesPage() {
  const { rooms } = useRooms();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(defaultForm);

  useEffect(() => {
    const unsubscribe = subscribeToRules(
      (list) => {
        setRules(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (rule: any) => {
    setEditingId(rule.id ?? null);
    setForm({
      name: rule.name || '',
      metric: rule.metric || 'temperature',
      operator: rule.operator || (rule.comparator === '<' ? 'less_than' : rule.comparator === '=' ? 'equal' : 'greater_than'),
      threshold: Number(rule.threshold || 0),
      rooms: rule.rooms || [],
      enabled: rule.enabled ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const comparator: '>' | '<' | '=' = form.operator === 'less_than'
      ? '<'
      : form.operator === 'equal'
        ? '='
        : '>';
    const payload = {
      name: form.name.trim(),
      metric: form.metric,
      operator: form.operator,
      threshold: Number(form.threshold),
      rooms: form.rooms,
      enabled: form.enabled,
      comparator,
    };

    if (!payload.name) return;

    if (editingId) {
      await updateRuleRecord(editingId, payload);
    } else {
      await createRuleRecord(payload as any);
    }

    setShowModal(false);
    setForm(defaultForm);
    setEditingId(null);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('ลบ Rule นี้ใช่หรือไม่?')) return;
    await deleteRuleRecord(id);
  };

  const toggleRule = async (id?: string, enabled?: boolean) => {
    if (!id) return;
    await updateRuleRecord(id, { enabled: !enabled });
  };

  return (
    <div className="rules-page">
      <header className="rules-topbar">
        <div className="rules-header">Rule-based Conditions</div>
        <div className="rules-topbar-right">
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

      <div className="rules-content">
        <div className="rules-header-row">
          <div>
            <h1>Rule-based Conditions</h1>
            <p>กำหนดเงื่อนไขการแจ้งเตือนพร้อมระบบจัดการที่มีประสิทธิภาพ</p>
          </div>

          <button className="add-rule-btn" onClick={openCreateModal}>
            <Plus size={18} />
            เพิ่ม Rule
          </button>
        </div>

        {loading && <div className="rules-state">กำลังโหลด Rule...</div>}
        {error && <div className="rules-state error">{error}</div>}

        <div className="rules-list">
          {rules.map((rule) => (
            <div className="rule-card" key={rule.id}>
              <div className="rule-main">
                <div className="rule-icon">
                  <AlertTriangle size={18} />
                </div>

                <div className="rule-info">
                  <div className="rule-title-row">
                    <h3>{rule.name}</h3>
                    <span className="rule-tag">{rule.enabled ? 'เปิด' : 'ปิด'}</span>
                  </div>
                  <div className="rule-condition">
                    {getConditionText(rule)}
                  </div>
                </div>
              </div>

              <div className="rule-actions">
                <div className="room-pills">
                  {(rule.rooms || []).map((room: string) => (
                    <span key={room} className="room-pill">{room}</span>
                  ))}
                </div>

                <div className="toggle-actions">
                  <button
                    type="button"
                    className={`toggle-switch ${rule.enabled ? 'on' : ''}`}
                    onClick={() => toggleRule(rule.id, rule.enabled)}
                    aria-label="Toggle rule"
                  >
                    <span className="toggle-knob" />
                  </button>

                  <button className="icon-action" type="button" onClick={() => openEditModal(rule)}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-action danger" type="button" onClick={() => handleDelete(rule.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="rule-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'แก้ไข Rule' : 'เพิ่ม Rule'}</h3>

            <form onSubmit={handleSubmit}>
              <div className="rule-form-grid">
                <label>
                  <span>ชื่อ Rule</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </label>

                <label>
                  <span>ตัววัด</span>
                  <select
                    value={form.metric}
                    onChange={(e) => setForm((prev) => ({ ...prev, metric: e.target.value as any }))}
                  >
                    <option value="temperature">อุณหภูมิ</option>
                    <option value="humidity">ความชื้น</option>
                    <option value="power">พลังงาน</option>
                  </select>
                </label>

                <label>
                  <span>เงื่อนไข</span>
                  <select
                    value={form.operator}
                    onChange={(e) => setForm((prev) => ({ ...prev, operator: e.target.value as any }))}
                  >
                    <option value="greater_than">มากกว่า</option>
                    <option value="less_than">น้อยกว่า</option>
                    <option value="equal">เท่ากับ</option>
                  </select>
                </label>

                <label>
                  <span>ค่า threshold</span>
                  <input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
                  />
                </label>

                <label className="full-width">
                  <span>ห้องที่ใช้งาน</span>
                  <div className="rule-rooms-picker">
                    {rooms.map((room) => {
                      const selected = form.rooms.includes(room.name);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          className={selected ? 'room-picker selected' : 'room-picker'}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              rooms: selected
                                ? prev.rooms.filter((r) => r !== room.name)
                                : [...prev.rooms, room.name],
                            }));
                          }}
                        >
                          {room.name}
                        </button>
                      );
                    })}
                  </div>
                </label>
              </div>

              <div className="rule-modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="primary-btn">
                  {editingId ? 'บันทึก' : 'เพิ่ม Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
