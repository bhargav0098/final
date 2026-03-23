import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Lock, CheckCircle, AlertCircle, DollarSign, User, Key, Stethoscope, Building2, Lightbulb } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function EditProfile() {
  const { user, updateUser, fetchMe } = useAuth();
  const [tab,  setTab]  = useState('profile');
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState({ text:'', type:'' });

  useEffect(() => {
    if (user) setForm({
      name: user.name||'', phone: user.phone||'', age: user.age||'',
      gender: user.gender||'Male', bloodGroup: user.bloodGroup||'', address: user.address||'',
      specialization: user.specialization||'', licenseNumber: user.licenseNumber||'',
      experience: user.experience||'', qualifications: user.qualifications||'',
      department: user.department||'', bio: user.bio||'',
      avgConsultTime: user.avgConsultTime||15, breakTime: user.breakTime||60,
      workingHoursStart: user.workingHoursStart||'09:00', workingHoursEnd: user.workingHoursEnd||'17:00',
      consultationFee: user.consultationFee||0, followUpFee: user.followUpFee||0,
      emergencyFee: user.emergencyFee||0, currency: user.currency||'USD',
      medicalHistory: (user.medicalHistory||[]).join(', '),
      allergies: (user.allergies||[]).join(', '),
      emergencyContact: user.emergencyContact||'',
    });
  }, [user]);

  const flash = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),3500); };
  const f = k => e => setForm({...form,[k]:e.target.value});

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form };
      if (payload.medicalHistory) payload.medicalHistory = payload.medicalHistory.split(',').map(s=>s.trim()).filter(Boolean);
      if (payload.allergies)      payload.allergies      = payload.allergies.split(',').map(s=>s.trim()).filter(Boolean);
      if (payload.age)            payload.age = parseInt(payload.age)||25;
      if (payload.experience)     payload.experience = parseInt(payload.experience)||0;
      ['avgConsultTime','breakTime','consultationFee','followUpFee','emergencyFee'].forEach(k => {
        if (payload[k] !== undefined) payload[k] = Number(payload[k])||0;
      });
      const { data } = await axios.put(`/users/${user._id}`, payload);
      updateUser(data.user); await fetchMe();
      flash('Profile updated successfully');
    } catch(err) { flash(err.response?.data?.message||'Update failed','error'); }
    setLoading(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { flash('Passwords do not match','error'); return; }
    if (pwForm.newPassword.length < 6) { flash('Password must be at least 6 characters','error'); return; }
    setLoading(true);
    try {
      await axios.put('/auth/change-password', { currentPassword:pwForm.currentPassword, newPassword:pwForm.newPassword });
      flash('Password changed'); setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch(err) { flash(err.response?.data?.message||'Failed','error'); }
    setLoading(false);
  };

  const Field = ({ label, k, type='text', placeholder='' }) => (
    <div>
      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>{label}</label>
      <input type={type} value={form[k]||''} onChange={f(k)} placeholder={placeholder}/>
    </div>
  );

  if (!user) return null;

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header"><h1>My Profile</h1><p>Update your information and settings</p></div>

        {msg.text && (
          <div className={`alert alert-${msg.type}`} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            {msg.type==='success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>} {msg.text}
          </div>
        )}

        {/* Profile summary card */}
        <div className="card" style={{ marginBottom:'20px', display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ width:'68px', height:'68px', borderRadius:'50%', background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'28px', flexShrink:0 }}>
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:'18px' }}>{user.name}</div>
            <div style={{ color:'#6b7280', fontSize:'13px' }}>{user.email}</div>
            <div style={{ display:'flex', gap:'7px', marginTop:'6px', flexWrap:'wrap' }}>
              <span style={{ background:'#eff6ff', color:'#1e40af', padding:'3px 9px', borderRadius:'20px', fontSize:'12px', fontWeight:600, textTransform:'capitalize' }}>{user.role}</span>
              {user.specialization&&<span style={{ background:'#f0fdf4', color:'#166534', padding:'3px 9px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{user.specialization}</span>}
              {user.consultationFee>0&&<span style={{ background:'#f0fdf4', color:'#166534', padding:'3px 9px', borderRadius:'20px', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', gap:'4px' }}><DollarSign size={12}/> ${user.consultationFee}/consult</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', background:'#fff', borderRadius:'10px', padding:'3px', marginBottom:'20px', width:'fit-content', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          {[['profile', <><User size={14}/> Profile Info</>],['password', <><Key size={14}/> Change Password</>]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{ padding:'9px 20px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px', transition:'all .18s',
                background:tab===k?'linear-gradient(135deg,#1e3a8a,#3b82f6)':'transparent', color:tab===k?'#fff':'#6b7280' }}>
              {l}
            </button>
          ))}
        </div>

        {tab==='profile' && (
          <form onSubmit={saveProfile}>
            <div className="card" style={{ marginBottom:'16px' }}>
              <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Personal Information</h3>
              <div style={{ display:'grid', gap:'12px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <Field label="Full Name" k="name" placeholder="Your name"/>
                  <Field label="Phone" k="phone" type="tel" placeholder="+1-555-..."/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                  <Field label="Age" k="age" type="number"/>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Gender</label>
                    <select value={form.gender||'Male'} onChange={f('gender')}>
                      {['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <Field label="Blood Group" k="bloodGroup" placeholder="A+, O-..."/>
                </div>
                <Field label="Address" k="address" placeholder="Your address"/>
                {user.role==='patient'&&<Field label="Emergency Contact" k="emergencyContact" placeholder="+1-555-..."/>}
              </div>
            </div>

            {user.role==='doctor' && (
              <>
                <div className="card" style={{ marginBottom:'16px' }}>
                  <h3 style={{ fontWeight:700, marginBottom:'14px', display:'flex', alignItems:'center', gap:'8px' }}><Stethoscope size={18}/> Doctor Information</h3>
                  <div style={{ display:'grid', gap:'12px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <Field label="Specialization" k="specialization"/>
                      <Field label="License Number" k="licenseNumber" placeholder="MED-XXXXX"/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <Field label="Experience (years)" k="experience" type="number"/>
                      <Field label="Qualifications" k="qualifications" placeholder="MBBS, MD..."/>
                    </div>
                    <Field label="Department" k="department" placeholder="Cardiology, Surgery..."/>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Bio / About</label>
                      <textarea rows={2} value={form.bio||''} onChange={f('bio')} placeholder="Brief professional bio..." style={{ resize:'vertical' }}/>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                      <Field label="Avg Consult Time (min)" k="avgConsultTime" type="number"/>
                      <Field label="Break Time (min)" k="breakTime" type="number"/>
                      <div><label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Currency</label>
                        <select value={form.currency||'USD'} onChange={f('currency')}>
                          {['USD','EUR','GBP','INR','AED','CAD','AUD'].map(c=><option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <div>
                        <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Working Hours Start</label>
                        <input type="time" value={form.workingHoursStart||'09:00'} onChange={f('workingHoursStart')}/>
                      </div>
                      <div>
                        <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Working Hours End</label>
                        <input type="time" value={form.workingHoursEnd||'17:00'} onChange={f('workingHoursEnd')}/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee Section */}
                <div className="card" style={{ marginBottom:'16px', border:'1px solid #bbf7d0' }}>
                  <h3 style={{ fontWeight:700, marginBottom:'14px', display:'flex', gap:'8px', alignItems:'center' }}>
                    <DollarSign size={18} color="#059669"/> Consultation Fees
                  </h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Consultation Fee ({form.currency||'USD'})</label>
                      <input type="number" min="0" value={form.consultationFee||''} onChange={f('consultationFee')} placeholder="e.g. 150"/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Follow-up Fee ({form.currency||'USD'})</label>
                      <input type="number" min="0" value={form.followUpFee||''} onChange={f('followUpFee')} placeholder="e.g. 80"/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Emergency Fee ({form.currency||'USD'})</label>
                      <input type="number" min="0" value={form.emergencyFee||''} onChange={f('emergencyFee')} placeholder="e.g. 300"/>
                    </div>
                  </div>
                  <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'10px' }}>
                    <Lightbulb size={12} style={{ marginRight:'4px', display:'inline' }}/> These fees will be shown to patients when they book an appointment with you.
                  </div>
                </div>
              </>
            )}

            {user.role==='patient' && (
              <div className="card" style={{ marginBottom:'16px' }}>
                <h3 style={{ fontWeight:700, marginBottom:'14px', display:'flex', alignItems:'center', gap:'8px' }}><Building2 size={18}/> Medical Information</h3>
                <div style={{ display:'grid', gap:'12px' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Medical History (comma-separated)</label>
                    <input value={form.medicalHistory||''} onChange={f('medicalHistory')} placeholder="Diabetes, Hypertension..."/>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'5px' }}>Allergies (comma-separated)</label>
                    <input value={form.allergies||''} onChange={f('allergies')} placeholder="Penicillin, Aspirin..."/>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ padding:'12px 32px' }} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width:'16px',height:'16px' }}/> Saving…</> : <><Save size={16}/> Save Profile</>}
            </button>
          </form>
        )}

        {tab==='password' && (
          <form onSubmit={changePassword} style={{ maxWidth:'440px' }}>
            <div className="card" style={{ display:'grid', gap:'14px' }}>
              <h3 style={{ fontWeight:700, display:'flex', alignItems:'center', gap:'8px' }}><Key size={18}/> Change Password</h3>
              <div>
                <label>Current Password *</label>
                <input type="password" value={pwForm.currentPassword} onChange={e=>setPwForm({...pwForm,currentPassword:e.target.value})} placeholder="Current password" required/>
              </div>
              <div>
                <label>New Password *</label>
                <input type="password" value={pwForm.newPassword} onChange={e=>setPwForm({...pwForm,newPassword:e.target.value})} placeholder="Min 6 characters" required/>
              </div>
              <div>
                <label>Confirm New Password *</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e=>setPwForm({...pwForm,confirmPassword:e.target.value})} placeholder="Repeat new password" required/>
              </div>
              {pwForm.newPassword&&pwForm.confirmPassword&&pwForm.newPassword!==pwForm.confirmPassword&&(
                <div className="alert alert-error" style={{ padding:'8px 12px',fontSize:'12px' }}>Passwords do not match</div>
              )}
              <button type="submit" className="btn btn-primary" style={{ justifyContent:'center' }} disabled={loading}>
                {loading ? <div className="spinner" style={{ width:'16px',height:'16px' }}/> : <><Lock size={15}/> Update Password</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
