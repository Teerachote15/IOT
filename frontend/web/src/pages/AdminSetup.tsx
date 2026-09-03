import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { createAdminAccount } from '../services/auth';
import '../styles/auth.css';

function getSetupErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/email-already-in-use') return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
  if (code === 'auth/weak-password') return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  if (code === 'auth/invalid-email') return 'รูปแบบอีเมลไม่ถูกต้อง';
  return 'ไม่สามารถสร้างบัญชี Admin ได้ กรุณาลองใหม่';
}

export default function AdminSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await createAdminAccount(name.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (setupError) {
      setError(getSetupErrorMessage(setupError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-brand-panel setup-brand-panel">
        <div className="auth-brand-mark"><ShieldCheck size={28} /></div>
        <p className="auth-kicker">ADMIN ACCESS</p>
        <h1>สร้างผู้ดูแลระบบ</h1>
        <p>บัญชีนี้จะถูกบันทึกเป็นผู้ดูแลระบบใน Firebase และใช้เข้าสู่ Web Dashboard</p>
      </section>

      <section className="auth-panel auth-form-panel">
        <Link className="auth-back-link" to="/login"><ArrowLeft size={16} /> กลับไปเข้าสู่ระบบ</Link>
        <div className="auth-form-heading">
          <h2>สร้างบัญชี Admin</h2>
          <p>ใช้สำหรับการตั้งค่าครั้งแรกของระบบ</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>ชื่อผู้ดูแล</span>
            <div className="auth-input-wrap">
              <UserRound size={18} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย" required />
            </div>
          </label>
          <label>
            <span>อีเมล</span>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required />
            </div>
          </label>
          <label>
            <span>รหัสผ่าน</span>
            <div className="auth-input-wrap">
              <KeyRound size={18} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} required />
            </div>
          </label>
          <label>
            <span>ยืนยันรหัสผ่าน</span>
            <div className="auth-input-wrap">
              <KeyRound size={18} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={6} required />
            </div>
          </label>

          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit" disabled={submitting}>
            <ShieldCheck size={18} />
            {submitting ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี Admin'}
          </button>
        </form>
      </section>
    </main>
  );
}
