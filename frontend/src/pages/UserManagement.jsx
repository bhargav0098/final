import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { 
  Users, Search, Filter, MoreVertical, 
  Trash2, Shield, User, Mail, Phone, MapPin, 
  Briefcase, CheckCircle2, Ban, ArrowLeft, Eye, Clock, 
  CheckCircle, History, FileText, ChevronRight, RefreshCw, UserCheck, Activity, AlertTriangle,
  XCircle, Save
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

const ROLES  = ['all','admin','doctor','patient'];
const STATUS = ['all','approved','pending','rejected','blocked'];

const BADGE = {
  approved: { bg:'#dcfce7', color:'#166534' },
  pending:  { bg:'#fef9c3', color:'#854d0e' },
  rejected: { bg:'#fee2e2', color:'#991b1b' },
  blocked:  { bg:'#f3f4f6', color:'#6b7280' },
};

const ROLE_COLOR = { admin:'#7c3aed', doctor:'#0891b2', patient:'#059669' };

export default function UserManagement({ socket }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState('all');
  const [statF,   setStatF]   = useState('all');
  const [msg,     setMsg]     = useState({ text:'', type:'' });
  const [profile, setProfile] = useState(null);   // currently viewing user

  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [editing,     setEditing]     = useState(null);
  const [editForm,    setEditForm]     = useState({});

  const flash = (text, type='success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text:'', type:'' }), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleF !== 'all') params.role = roleF;
      if (statF !== 'all') params.status = statF;
      if (search) params.search = search;
      const { data } = await axios.get('/users', { params });
      setUsers(data);
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to load users', 'error');
    }
    setLoading(false);
  }, [roleF, statF, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  /* ── VIEW PROFILE ── */
  const viewProfile = async (userId) => {
    try {
      const { data } = await axios.get(`/users/${userId}`);
      setProfile(data);
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to load profile', 'error');
    }
  };

  /* ── START EDIT ── */
  const startEdit = (user) => {
    setEditing(user._id);
    setEditForm({
      name: user.name, phone: user.phone||'', age: user.age||'',
      gender: user.gender||'Male', bloodGroup: user.bloodGroup||'',
      address: user.address||'', specialization: user.specialization||'',
      licenseNumber: user.licenseNumber||'', experience: user.experience||'',
      qualifications: user.qualifications||'', department: user.department||'',
      avgConsultTime: user.avgConsultTime||15, breakTime: user.breakTime||60,
      workingHoursStart: user.workingHoursStart||'09:00',
      workingHoursEnd: user.workingHoursEnd||'17:00',
      dailyCapacity: user.dailyCapacity||20,
      medicalHistory: (user.medicalHistory||[]).join(', '),
      allergies: (user.allergies||[]).join(', '),
    });
  };

  const saveEdit = async () => {
    try {
      const payload = { ...editForm };
      if (payload.medicalHistory) payload.medicalHistory = payload.medicalHistory.split(',').map(s=>s.trim()).filter(Boolean);
      if (payload.allergies)      payload.allergies      = payload.allergies.split(',').map(s=>s.trim()).filter(Boolean);
      if (payload.age)            payload.age = parseInt(payload.age);
      if (payload.experience)     payload.experience = parseInt(payload.experience);
      await axios.put(`/users/${editing}`, payload);
      flash('Profile updated');
      setEditing(null);
      loadUsers();
      if (profile?.user?._id === editing) viewProfile(editing);
    } catch (err) {
      flash(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  /* ── STATUS CHANGE ── */
  const changeStatus = async (userId, status, reason='') => {
    try {
      await axios.put(`/users/${userId}/status`, { status, reason });
      const labels = { approved:'Approved', rejected:'Rejected', blocked:'Blocked', pending:'Reset to Pending' };
      flash(labels[status] || status);
      loadUsers();
      if (profile?.user?._id === userId) viewProfile(userId);
      setRejectTarget(null); setRejectReason('');
    } catch (err) {
      flash(err.response?.data?.message || 'Status change failed', 'error');
    }
  };

  /* ── DELETE USER ── */
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/users/${userId}`);
      flash('User deleted successfully');
      loadUsers();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  /* ── SUMMARY STATS ── */
  const counts = {
    total:    users.length,
    doctors:  users.filter(u => u.role==='doctor').length,
    patients: users.filter(u => u.role==='patient').length,
    pending:  users.filter(u => u.status==='pending').length,
    blocked:  users.filter(u => u.isBlocked).length,
  };

  const inp = (label, key, type='text', disabled=false) => (
    <div>
      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>{label}</label>
      <input type={type} value={editForm[key]||''} onChange={e=>setEditForm({...editForm,[key]:e.target.value})}
        disabled={disabled} style={{ opacity: disabled ? .5 : 1 }}/>
    </div>
  );

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">

        {/* Header */}
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1>User Management</h1>
            <p>Manage doctors, patients · Approve registrations · View profiles</p>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <button onClick={loadUsers} className="btn" style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.3)' }}>
              <RefreshCw size={14}/> Refresh
            </button>
            <NotificationBell socket={socket}/>
          </div>
        </div>

        {msg.text && <div className={`alert alert-${msg.type||'success'}`}>{msg.text}</div>}

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom:'22px' }}>
          {[
            { label:'Total Users',   value: counts.total,    color:'#3b82f6', bg:'#eff6ff', icon: Users },
            { label:'Doctors',       value: counts.doctors,  color:'#0891b2', bg:'#ecfeff', icon: UserCheck },
            { label:'Patients',      value: counts.patients, color:'#059669', bg:'#f0fdf4', icon: Activity },
            { label:'Pending Approval', value: counts.pending, color:'#f59e0b', bg:'#fffbeb', icon: Clock },
          ].map((s,i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
              <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
            </div>
          ))}
        </div>

        {/* Pending approval banner */}
        {counts.pending > 0 && (
          <div style={{ background:'linear-gradient(135deg,#92400e,#f59e0b)', borderRadius:'12px', padding:'14px 20px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <AlertTriangle size={20} color="#fff"/>
              <span style={{ color:'#fff', fontWeight:700 }}>{counts.pending} doctor(s) awaiting your approval</span>
            </div>
            <button onClick={() => { setRoleF('doctor'); setStatF('pending'); }} className="btn" style={{ background:'rgba(255,255,255,.25)', color:'#fff', border:'1px solid rgba(255,255,255,.4)' }}>
              Review Now
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ marginBottom:'18px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative', flex:'2', minWidth:'180px' }}>
            <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}/>
            <input placeholder="Search name, email, specialization..." value={search}
              onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:'32px' }}/>
          </div>
          <select value={roleF} onChange={e=>setRoleF(e.target.value)} style={{ flex:1, minWidth:'120px' }}>
            {ROLES.map(r=><option key={r} value={r}>{r==='all'?'All Roles':r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
          </select>
          <select value={statF} onChange={e=>setStatF(e.target.value)} style={{ flex:1, minWidth:'130px' }}>
            {STATUS.map(s=><option key={s} value={s}>{s==='all'?'All Status':s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <button onClick={()=>{ setSearch(''); setRoleF('all'); setStatF('all'); }} className="btn btn-outline btn-sm">Clear</button>
        </div>

        {/* Users table */}
        {loading ? (
          <div className="loading"><div className="spinner"/></div>
        ) : users.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'44px', color:'#9ca3af' }}>
            <Users size={44} style={{ marginBottom:'10px', opacity:.3 }}/>
            <div style={{ fontWeight:600 }}>No users found</div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
              <h3 style={{ fontWeight:700 }}>Users ({users.length})</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th><th>Role</th><th>Info</th><th>Status</th>
                    <th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const rc = ROLE_COLOR[u.role]||'#9ca3af';
                    const bc = BADGE[u.status] || { bg:'#f3f4f6', color:'#6b7280' };
                    return (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`linear-gradient(135deg,${rc},${rc}99)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'14px', flexShrink:0 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, fontSize:'13px' }}>{u.name}</div>
                              <div style={{ fontSize:'11px', color:'#9ca3af' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ background:`${rc}18`, color:rc, padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, textTransform:'capitalize' }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ fontSize:'12px', color:'#6b7280' }}>
                          {u.role==='doctor' && <div><div style={{ fontWeight:600, color:'#374151' }}>{u.specialization||'—'}</div><div>{u.experience ? u.experience+'y exp' : ''} {u.licenseNumber||''}</div></div>}
                          {u.role==='patient' && <div><div>Age: {u.age||'—'} · {u.gender||'—'}</div><div>{u.bloodGroup||''} {u.phone||''}</div></div>}
                          {u.role==='admin' && <div style={{ color:'#7c3aed', fontWeight:600 }}>System Admin</div>}
                        </td>
                        <td>
                          <span style={{ background:bc.bg, color:bc.color, padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>
                            {u.isBlocked ? 'Blocked' : u.status}
                          </span>
                        </td>
                        <td style={{ fontSize:'11px', color:'#9ca3af' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                            {/* View profile */}
                            <button onClick={()=>viewProfile(u._id)} className="btn btn-outline btn-sm" title="View Profile">
                              <Eye size={12}/> View
                            </button>
                            {/* Delete Account */}
                            {u.role !== 'admin' && (
                              <button onClick={()=>deleteUser(u._id)} className="btn btn-danger btn-sm" title="Delete Account">
                                <Trash2 size={12}/> Delete acc
                              </button>
                            )}
                            {/* Approve doctor */}
                            {u.role==='doctor' && u.status==='pending' && (
                              <button onClick={()=>changeStatus(u._id,'approved')} className="btn btn-success btn-sm">
                                <CheckCircle size={12}/> Approve
                              </button>
                            )}
                            {/* Reject doctor */}
                            {u.role==='doctor' && ['pending','approved'].includes(u.status) && (
                              <button onClick={()=>setRejectTarget(u._id)} className="btn btn-danger btn-sm">
                                <XCircle size={12}/> Reject
                              </button>
                            )}
                            {/* Block/Unblock */}
                            {u.role !== 'admin' && (
                              <button onClick={()=>changeStatus(u._id, u.isBlocked?'approved':'blocked')}
                                className={`btn btn-sm ${u.isBlocked?'btn-success':'btn-danger'}`}>
                                <Shield size={12}/> {u.isBlocked?'Unblock':'Block'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── PROFILE MODAL ─── */}
        {profile && (
          <div className="modal-overlay" onClick={()=>setProfile(null)}>
            <div className="card" style={{ maxWidth:'700px', width:'100%', maxHeight:'90vh', overflowY:'auto' }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <h2 style={{ fontWeight:800, fontSize:'18px' }}>User Profile</h2>
                <button onClick={()=>setProfile(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><XCircle size={20}/></button>
              </div>

              {/* Avatar + basic */}
              <div style={{ display:'flex', gap:'16px', alignItems:'flex-start', marginBottom:'20px', flexWrap:'wrap' }}>
                <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:`linear-gradient(135deg,${ROLE_COLOR[profile.user.role]},${ROLE_COLOR[profile.user.role]}99)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'28px', flexShrink:0 }}>
                  {profile.user.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:'20px' }}>{profile.user.name}</div>
                  <div style={{ fontSize:'13px', color:'#6b7280' }}>{profile.user.email}</div>
                  <div style={{ display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap' }}>
                    <span style={{ background:`${ROLE_COLOR[profile.user.role]}18`, color:ROLE_COLOR[profile.user.role], padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700, textTransform:'capitalize' }}>{profile.user.role}</span>
                    <span style={{ background: BADGE[profile.user.status]?.bg||'#f3f4f6', color: BADGE[profile.user.status]?.color||'#6b7280', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>{profile.user.isBlocked?'Blocked':profile.user.status}</span>
                    {profile.user.specialization && <span style={{ background:'#eff6ff', color:'#1e40af', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600 }}>{profile.user.specialization}</span>}
                  </div>
                </div>
                {/* Quick actions */}
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {profile.user.role !== 'admin' && (
                    <button onClick={()=>{ setProfile(null); deleteUser(profile.user._id); }} className="btn btn-danger btn-sm"><Trash2 size={13}/> Delete acc</button>
                  )}
                  {profile.user.role==='doctor' && profile.user.status==='pending' && (
                    <button onClick={()=>changeStatus(profile.user._id,'approved')} className="btn btn-success btn-sm"><CheckCircle size={13}/> Approve</button>
                  )}
                  {profile.user.role!=='admin' && (
                    <button onClick={()=>changeStatus(profile.user._id, profile.user.isBlocked?'approved':'blocked')}
                      className={`btn btn-sm ${profile.user.isBlocked?'btn-success':'btn-danger'}`}>
                      <Shield size={13}/>{profile.user.isBlocked?' Unblock':' Block'}
                    </button>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'18px' }}>
                {[
                  ['Phone', profile.user.phone||'—'],
                  ['Age', profile.user.age||'—'],
                  ['Gender', profile.user.gender||'—'],
                  ['Blood Group', profile.user.bloodGroup||'—'],
                  ['Address', profile.user.address||'—'],
                  ['Joined', new Date(profile.user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})],
                  ...(profile.user.role==='doctor' ? [
                    ['License', profile.user.licenseNumber||'—'],
                    ['Experience', profile.user.experience ? profile.user.experience+' years' : '—'],
                    ['Qualifications', profile.user.qualifications||'—'],
                    ['Department', profile.user.department||'—'],
                    ['Consult Time', profile.user.avgConsultTime+' min'],
                    ['Daily Capacity', profile.user.dailyCapacity+' slots'],
                    ['Working Hours', (profile.user.workingHoursStart||'09:00')+' – '+(profile.user.workingHoursEnd||'17:00')],
                    ['Fatigue Score', (profile.user.fatigueScore||0)+'%'],
                  ] : []),
                  ...(profile.user.role==='patient' ? [
                    ['Medical History', (profile.user.medicalHistory||[]).join(', ')||'None'],
                    ['Allergies', (profile.user.allergies||[]).join(', ')||'None'],
                  ] : []),
                ].map(([k,v]) => (
                  <div key={k} style={{ padding:'9px 12px', background:'#f8fafc', borderRadius:'8px' }}>
                    <div style={{ fontSize:'11px', color:'#9ca3af', fontWeight:600, marginBottom:'2px' }}>{k}</div>
                    <div style={{ fontSize:'13px', color:'#111827', fontWeight:500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Appointment stats */}
              {profile.appointmentStats && (
                <div>
                  <h3 style={{ fontWeight:700, marginBottom:'12px', fontSize:'15px' }}>Appointment History</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'14px' }}>
                    {[
                      ['Total',     profile.appointmentStats.total,     '#3b82f6'],
                      ['Completed', profile.appointmentStats.completed, '#10b981'],
                      ['Pending',   profile.appointmentStats.pending,   '#f59e0b'],
                      ['Emergency', profile.appointmentStats.emergency, '#ef4444'],
                    ].map(([l,v,c])=>(
                      <div key={l} style={{ textAlign:'center', padding:'10px', background:'#f8fafc', borderRadius:'8px' }}>
                        <div style={{ fontSize:'22px', fontWeight:800, color:c }}>{v}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {profile.appointmentStats.recent.length > 0 && (
                    <div>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', marginBottom:'8px' }}>RECENT APPOINTMENTS</div>
                      {profile.appointmentStats.recent.map(a => (
                        <div key={a._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#f8fafc', borderRadius:'8px', marginBottom:'5px' }}>
                          <div>
                            <span style={{ fontFamily:'monospace', fontSize:'11px', color:'#6b7280' }}>{a.ticketNumber}</span>
                            <span style={{ fontSize:'12px', color:'#374151', marginLeft:'10px' }}>{a.date}</span>
                            <span style={{ fontSize:'12px', color:'#9ca3af', marginLeft:'6px' }}>{a.reason?.slice(0,30)}</span>
                          </div>
                          <div style={{ display:'flex', gap:'5px' }}>
                            <span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span>
                            <span className={`badge badge-${a.status}`}>{a.status?.replace(/_/g,' ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── EDIT MODAL ─── */}
        {editing && (
          <div className="modal-overlay" onClick={()=>setEditing(null)}>
            <div className="card" style={{ maxWidth:'600px', width:'100%', maxHeight:'90vh', overflowY:'auto' }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <h2 style={{ fontWeight:800, fontSize:'18px' }}>Edit Profile</h2>
                <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><XCircle size={20}/></button>
              </div>
              <div style={{ display:'grid', gap:'12px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  {inp('Full Name','name')}
                  {inp('Phone','phone','tel')}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  {inp('Age','age','number')}
                  <div>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Gender</label>
                    <select value={editForm.gender||'Male'} onChange={e=>setEditForm({...editForm,gender:e.target.value})}>
                      {['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  {inp('Blood Group','bloodGroup')}
                  {inp('Address','address')}
                </div>

                {/* Doctor-specific fields */}
                {users.find(u=>u._id===editing)?.role==='doctor' && (
                  <>
                    <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', marginBottom:'10px' }}>DOCTOR DETAILS</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                        {inp('Specialization','specialization')}
                        {inp('License Number','licenseNumber')}
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      {inp('Experience (years)','experience','number')}
                      {inp('Qualifications','qualifications')}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                      {inp('Consult Time (min)','avgConsultTime','number')}
                      {inp('Break Time (min)','breakTime','number')}
                      {inp('Daily Capacity','dailyCapacity','number')}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      {inp('Start Time','workingHoursStart','time')}
                      {inp('End Time','workingHoursEnd','time')}
                    </div>
                  </>
                )}

                {/* Patient-specific */}
                {users.find(u=>u._id===editing)?.role==='patient' && (
                  <>
                    <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', marginBottom:'10px' }}>MEDICAL INFO</div>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Medical History (comma-separated)</label>
                      <input value={editForm.medicalHistory||''} onChange={e=>setEditForm({...editForm,medicalHistory:e.target.value})} placeholder="Diabetes, Hypertension..."/>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#374151', marginBottom:'4px' }}>Allergies (comma-separated)</label>
                      <input value={editForm.allergies||''} onChange={e=>setEditForm({...editForm,allergies:e.target.value})} placeholder="Penicillin, Aspirin..."/>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'18px' }}>
                <button onClick={()=>setEditing(null)} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                <button onClick={saveEdit} className="btn btn-primary" style={{ flex:2 }}><Save size={15}/> Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── REJECT REASON MODAL ─── */}
        {rejectTarget && (
          <div className="modal-overlay">
            <div className="card" style={{ maxWidth:'380px', width:'100%' }}>
              <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Reject Doctor Application</h3>
              <textarea rows={3} placeholder="Reason for rejection..."
                value={rejectReason} onChange={e=>setRejectReason(e.target.value)} style={{ marginBottom:'14px' }}/>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{ setRejectTarget(null); setRejectReason(''); }} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                <button onClick={()=>changeStatus(rejectTarget,'rejected',rejectReason)} className="btn btn-danger" style={{ flex:1 }}>Confirm Reject</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
