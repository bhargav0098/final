import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, AlertCircle, Building2, Timer, Ban, XCircle, Crown, Stethoscope, Thermometer } from 'lucide-react';

const DEMOS = [
  { label:'Admin',   email:'admin@mediscanai.com', pass:'Admin@12345',  color:'#7c3aed', icon: Crown },
  { label:'Doctor',  email:'doctor@demo.com',      pass:'Doctor@123',   color:'#0891b2', icon: Stethoscope },
  { label:'Patient', email:'patient@demo.com',     pass:'Patient@123',  color:'#059669', icon: Thermometer },
];

export default function Login() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const fill = (demo) => {
    setForm({ email: demo.email, password: demo.pass });
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email.trim(), form.password);
      navigate(`/${data.user.role}`);
    } catch (err) {
      const msg = err.response?.data?.message || '';
        if (msg.includes('pending') || msg.includes('approval')) {
          setError(<><Timer size={16} style={{ marginBottom:'-3px', marginRight:'4px' }}/> Your doctor account is awaiting admin approval.</>);
        } else if (msg.includes('blocked')) {
          setError(<><Ban size={16} style={{ marginBottom:'-3px', marginRight:'4px' }}/> Your account has been blocked. Contact admin.</>);
        } else {
          setError(<><XCircle size={16} style={{ marginBottom:'-3px', marginRight:'4px' }}/> Invalid email or password. Try the demo accounts below.</>);
        }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#0f172a 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
    }}>
      <div style={{ width:'100%', maxWidth:'420px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'52px', marginBottom:'8px', color:'#fff', display:'flex', justifyContent:'center' }}>
            <Building2 size={52} strokeWidth={1.5}/>
          </div>
          <h1 style={{ color:'#fff', fontSize:'28px', fontWeight:800 }}>MediQueueAI</h1>
          <p style={{ color:'#94a3b8', fontSize:'13px' }}>AI-Powered Hospital Management System</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'20px', color:'#111827' }}>Sign In</h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom:'16px' }}>
              <AlertCircle size={16} style={{ flexShrink:0 }}/> {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display:'grid', gap:'14px' }}>
            <div>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required/>
            </div>
            <div style={{ position:'relative' }}>
              <label>Password</label>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
                style={{ paddingRight:'40px' }}/>
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:'10px', bottom:'9px', background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width:'100%', justifyContent:'center', padding:'12px' }}
              disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width:'18px', height:'18px' }}/> Signing in...</>
                : <><LogIn size={16}/> Sign In</>}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color:'#3b82f6', fontWeight:600, textDecoration:'none' }}>Register</Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop:'16px', background:'rgba(255,255,255,.08)', borderRadius:'14px', padding:'16px' }}>
          <p style={{ color:'#94a3b8', fontSize:'11px', textAlign:'center', marginBottom:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>
            Quick Demo Login
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {DEMOS.map(d => (
              <button
                key={d.label}
                onClick={() => fill(d)}
                style={{
                  background:`${d.color}22`,
                  border:`1px solid ${d.color}55`,
                  borderRadius:'9px', padding:'10px 6px',
                  cursor:'pointer', color:'#fff',
                  fontSize:'12px', fontWeight:600,
                  transition:'all .2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = `${d.color}44`}
                onMouseOut={e  => e.currentTarget.style.background = `${d.color}22`}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px' }}>
                  <d.icon size={14}/>
                  <span>{d.label}</span>
                </div>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,.6)', marginTop:'3px' }}>Click to fill</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop:'12px', background:'rgba(255,255,255,.06)', borderRadius:'8px', padding:'10px' }}>
            <div style={{ fontSize:'10px', color:'#64748b', textAlign:'center', lineHeight:1.8 }}>
              <div>Admin: <span style={{ color:'#94a3b8' }}>admin@mediscanai.com / Admin@12345</span></div>
              <div>Doctor: <span style={{ color:'#94a3b8' }}>doctor@demo.com / Doctor@123</span></div>
              <div>Patient: <span style={{ color:'#94a3b8' }}>patient@demo.com / Patient@123</span></div>
            </div>
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:'16px', color:'#475569', fontSize:'11px' }}>
          Run <code style={{ background:'rgba(255,255,255,.1)', padding:'2px 6px', borderRadius:'4px', color:'#94a3b8' }}>node seed.js</code> in backend to create demo accounts
        </p>
      </div>
    </div>
  );
}
