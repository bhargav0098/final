import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, CheckCircle, Building2, User, Thermometer } from 'lucide-react';

const SPECS = ['Cardiology','Dermatology','Emergency Medicine','Endocrinology','Gastroenterology','General Medicine','Gynecology','Neurology','Oncology','Ophthalmology','Orthopedics','Pediatrics','Psychiatry','Pulmonology','Radiology','Surgery','Urology'];

export default function Register() {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name:'',email:'',password:'',phone:'',age:'',gender:'Male',specialization:'',licenseNumber:'',experience:'',qualifications:'',department:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const f = k => e => setForm({...form,[k]:e.target.value});

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await register({ ...form, role, age:parseInt(form.age)||25 });
      if (role === 'doctor') setSuccess('Application submitted! Awaiting admin approval. Check your email for confirmation.');
      else navigate(`/${data.user.role}`);
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e3a8a)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div className="card" style={{ maxWidth:'420px', textAlign:'center', padding:'40px' }}>
        <CheckCircle size={56} color="#10b981" style={{ marginBottom:'14px' }}/>
        <h2 style={{ fontSize:'20px', fontWeight:800, marginBottom:'8px' }}>Submitted!</h2>
        <p style={{ color:'#6b7280', marginBottom:'20px', fontSize:'14px' }}>{success}</p>
        <Link to="/login" className="btn btn-primary" style={{ textDecoration:'none' }}>Go to Login</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e3a8a)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'540px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'40px', color:'#3b82f6', display:'flex', justifyContent:'center', marginBottom:'8px' }}>
            <Building2 size={40}/>
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:800, color:'#fff' }}>MediQueueAI</h1>
          <p style={{ color:'#94a3b8', fontSize:'13px' }}>MediQueueAI Hospital System V6</p>
        </div>
        <div className="card">
          <div style={{ display:'flex', gap:'6px', marginBottom:'20px', background:'#f8fafc', borderRadius:'10px', padding:'4px' }}>
            {['patient','doctor'].map(r => (
              <button key={r} type="button" onClick={()=>setRole(r)}
                style={{ flex:1, padding:'9px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px', transition:'all .2s',
                  background:role===r?(r==='doctor'?'#0891b2':'#059669'):'transparent', color:role===r?'#fff':'#6b7280' }}>
                {r==='patient' ? <><Thermometer size={14} style={{ marginRight:'4px' }}/> Patient</> : <><User size={14} style={{ marginRight:'4px' }}/> Doctor</>}
              </button>
            ))}
          </div>

          {error && <div className="alert alert-error"><AlertCircle size={14}/>{error}</div>}

          <form onSubmit={submit} style={{ display:'grid', gap:'12px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div><label>Full Name *</label><input value={form.name} onChange={f('name')} placeholder="Full name" required/></div>
              <div><label>Email *</label><input type="email" value={form.email} onChange={f('email')} placeholder="email@example.com" required/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div><label>Password *</label><input type="password" value={form.password} onChange={f('password')} placeholder="Min 6 chars" required/></div>
              <div><label>Phone</label><input value={form.phone} onChange={f('phone')} placeholder="Phone number"/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div><label>Age</label><input type="number" value={form.age} onChange={f('age')} placeholder="Age"/></div>
              <div><label>Gender</label><select value={form.gender} onChange={f('gender')}>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</select></div>
            </div>
            {role === 'doctor' && <>
              <div><label>Specialization *</label>
                <select value={form.specialization} onChange={f('specialization')} required>
                  <option value="">Select specialization</option>
                  {SPECS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label>License Number *</label><input value={form.licenseNumber} onChange={f('licenseNumber')} placeholder="MED-XXXXX" required/></div>
                <div><label>Experience (years)</label><input type="number" value={form.experience} onChange={f('experience')} placeholder="Years"/></div>
              </div>
              <div><label>Qualifications</label><input value={form.qualifications} onChange={f('qualifications')} placeholder="MBBS, MD, etc."/></div>
            </>}
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px', marginTop:'4px' }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width:'18px', height:'18px' }}/> : <><UserPlus size={16}/>Create Account</>}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:'14px', fontSize:'13px', color:'#6b7280' }}>
            Already have an account? <Link to="/login" style={{ color:'#3b82f6', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
