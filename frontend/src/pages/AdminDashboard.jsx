import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Users, UserCheck, Calendar, AlertTriangle, CheckCircle, XCircle,
  Activity, Zap, Clock, TrendingUp, RefreshCw, Shield, Pill, Bot
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';

const PATH_TAB = {
  '/admin':'Overview', '/admin/analytics':'Analytics', '/admin/queue':'Queue',
  '/admin/capacity':'Capacity', '/admin/doctors':'Doctors', '/admin/patients':'Patients',
  '/admin/appointments':'Appointments',
};
const TABS = ['Overview','Analytics','Queue','Capacity','Doctors','Patients','Appointments'];
const TAB_PATH = {
  'Overview':'/admin','Analytics':'/admin/analytics','Queue':'/admin/queue',
  'Capacity':'/admin/capacity','Doctors':'/admin/doctors','Patients':'/admin/patients',
  'Appointments':'/admin/appointments',
};
const SEV_C  = { LOW:'#10b981',MEDIUM:'#3b82f6',HIGH:'#f59e0b',EMERGENCY:'#ef4444' };
const STAT_C = { pending:'#f59e0b',confirmed:'#3b82f6',completed:'#10b981',rejected:'#ef4444',cancelled_by_patient:'#9ca3af',rescheduled_by_ai:'#8b5cf6',rescheduled_by_doctor:'#7c3aed','no-show':'#6b7280' };

export default function AdminDashboard({ socket }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const [tab,      setTab]      = useState(PATH_TAB[location.pathname]||'Overview');
  const [stats,    setStats]    = useState(null);
  const [analytics,setAnalytics]= useState(null);
  const [qStats,   setQStats]   = useState(null);
  const [capacity, setCapacity] = useState([]);
  const [doctors,  setDoctors]  = useState([]);
  const [patients, setPatients] = useState([]);
  const [appts,    setAppts]    = useState([]);
  const [queue,    setQueue]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState({ text:'',type:'' });

  useEffect(() => { setTab(PATH_TAB[location.pathname]||'Overview'); }, [location.pathname]);
  const flash = (text,type='success') => { setMsg({text,type}); setTimeout(()=>setMsg({text:'',type:''}),3500); };
  const switchTab = (t) => navigate(TAB_PATH[t]||'/admin');

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      if (['Overview','Analytics'].includes(tab)) {
        const [s,a,q] = await Promise.all([
          axios.get('/admin/stats'),
          axios.get('/admin/ai-analytics'),
          axios.get('/queue/stats'),
        ]);
        setStats(s.data); setAnalytics(a.data); setQStats(q.data);
      }
      if (tab==='Capacity')     { const {data}=await axios.get('/admin/capacity');        setCapacity(data); }
      if (tab==='Doctors')      { const {data}=await axios.get('/admin/doctors');         setDoctors(data);  }
      if (tab==='Patients')     { const {data}=await axios.get('/admin/patients');        setPatients(data); }
      if (tab==='Appointments') { const {data}=await axios.get('/admin/appointments');    setAppts(data);    }
      if (tab==='Queue')        { const {data}=await axios.get('/admin/queue-overview');  setQueue(data);    }
    } catch(err) { flash(err.response?.data?.message||'Failed','error'); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const approveDoctor = async (id) => { await axios.put(`/admin/doctors/${id}/approve`); flash('Doctor approved ✅'); loadTab(); };
  const rejectDoctor  = async (id) => {
    const reason = window.prompt('Rejection reason:')||'Does not meet requirements';
    await axios.put(`/admin/doctors/${id}/reject`, { reason });
    flash('Doctor rejected'); loadTab();
  };
  const toggleBlock = async (id, isBlocked) => {
    await axios.put(`/users/${id}/status`, { status: isBlocked?'approved':'blocked' });
    loadTab();
  };
  const detectNoShows = async () => {
    const {data} = await axios.post('/admin/detect-no-shows');
    flash(data.message);
  };

  const s = stats;

  // Status lifecycle counters for chart
  const statusChartData = qStats ? Object.entries(qStats.counts).map(([k,v]) => ({
    status: k.replace(/_/g,' '), count: v, fill: STAT_C[k]||'#9ca3af'
  })) : [];

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1>Admin Control Center</h1>
            <p>AI analytics · Live queue · Doctor oversight · Status lifecycle</p>
          </div>
          <div style={{ display:'flex', gap:'9px', alignItems:'center' }}>
            <button onClick={loadTab} className="btn" style={{ background:'rgba(255,255,255,.2)',color:'#fff',border:'1px solid rgba(255,255,255,.3)' }}>
              <RefreshCw size={14}/> Refresh
            </button>
            <button onClick={detectNoShows} className="btn" style={{ background:'rgba(255,255,255,.15)',color:'#fff',border:'1px solid rgba(255,255,255,.25)' }}>
              <Zap size={14}/> No-Shows
            </button>
            <NotificationBell socket={socket}/>
          </div>
        </div>

        {msg.text && <div className={`alert alert-${msg.type||'success'}`}>{msg.text}</div>}

        {/* Tab bar */}
        <div style={{ display:'flex', gap:'3px', background:'#fff', borderRadius:'10px', padding:'3px', marginBottom:'22px', boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflowX:'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={()=>switchTab(t)}
              style={{ flex:1, padding:'9px 12px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'12px', whiteSpace:'nowrap', transition:'all .18s',
                background:tab===t?'linear-gradient(135deg,#1e3a8a,#3b82f6)':'transparent', color:tab===t?'#fff':'#6b7280' }}>
              {t}
            </button>
          ))}
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> : <>

        {/* ── OVERVIEW ── */}
        {tab==='Overview' && s && (
          <>
            <div className="grid-3" style={{ marginBottom:'22px' }}>
              {[
                { label:'Approved Doctors', value:s.totalDoctors,         icon:UserCheck, color:'#7c3aed', bg:'#f5f3ff' },
                { label:'Pending Approval', value:s.pendingDoctors,        icon:Clock,     color:'#f59e0b', bg:'#fffbeb' },
                { label:'Total Patients',   value:s.totalPatients,         icon:Users,     color:'#0891b2', bg:'#ecfeff' },
                { label:"Today's Appts",    value:s.todayAppointments,     icon:Calendar,  color:'#059669', bg:'#f0fdf4' },
                { label:'Pending Appts',    value:s.pendingAppointments,   icon:AlertTriangle, color:'#ef4444', bg:'#fef2f2' },
                { label:'Emergency Cases',  value:s.emergencyAppointments, icon:Activity,  color:'#dc2626', bg:'#fef2f2' },
              ].map((c,i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon" style={{ background:c.bg }}><c.icon size={20} color={c.color}/></div>
                  <div><div className="stat-label">{c.label}</div><div className="stat-value">{c.value}</div></div>
                </div>
              ))}
            </div>

            {/* Status lifecycle counters */}
            {qStats && (
              <div className="card" style={{ marginBottom:'22px' }}>
                <h3 style={{ fontWeight:700, marginBottom:'16px' }}>Appointment Status Lifecycle (Last 30 days)</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:'10px' }}>
                  {Object.entries(qStats.counts).map(([k,v]) => (
                    <div key={k} style={{ textAlign:'center', padding:'12px', background:'#f8fafc', borderRadius:'10px', borderTop:`3px solid ${STAT_C[k]||'#9ca3af'}` }}>
                      <div style={{ fontSize:'26px', fontWeight:800, color:STAT_C[k]||'#374151' }}>{v}</div>
                      <div style={{ fontSize:'10px', color:'#6b7280', fontWeight:600, textTransform:'uppercase', marginTop:'2px' }}>{k.replace(/_/g,' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics && (
              <div className="grid-2">
                <div className="card">
                  <h3 style={{ fontWeight:700, marginBottom:'14px' }}>7-Day Trend</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="date" tick={{ fontSize:10 }} tickFormatter={d=>d.slice(5)}/>
                      <YAxis tick={{ fontSize:10 }}/>
                      <Tooltip/>
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6',r:4 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Severity Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={Object.entries(analytics.severityBreakdown).map(([k,v])=>({name:k,value:v}))} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({name,value})=>`${name}:${value}`}>
                        {Object.keys(analytics.severityBreakdown).map((k,i)=><Cell key={i} fill={SEV_C[k]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── ANALYTICS ── */}
        {tab==='Analytics' && analytics && (
          <div style={{ display:'grid', gap:'18px' }}>
            <div className="grid-2">
              <div className="card" style={{ display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'center' }}>
                {[
                  { label:'Cancellation Rate', val:`${analytics.cancellationRate}%`, color:'#ef4444' },
                  { label:'No-Show Rate',       val:`${analytics.noShowRate}%`,       color:'#8b5cf6' },
                  { label:'AI Modified',        val:`${analytics.aiModifiedRate}%`,   color:'#3b82f6' },
                  { label:'30-Day Total',       val:analytics.totalLast30Days,        color:'#059669' },
                ].map((m,i) => (
                  <div key={i} style={{ textAlign:'center', flex:1, minWidth:'70px' }}>
                    <div style={{ fontSize:'28px', fontWeight:800, color:m.color }}>{m.val}</div>
                    <div style={{ fontSize:'11px', color:'#6b7280', fontWeight:600 }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'12px' }}>Status Lifecycle Chart</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="status" tick={{ fontSize:9 }}/>
                    <YAxis tick={{ fontSize:9 }}/>
                    <Tooltip/>
                    <Bar dataKey="count">
                      {statusChartData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontWeight:700, marginBottom:'12px' }}>Peak Hours</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analytics.peakHours.map((v,i)=>({ hour:`${String(i).padStart(2,'0')}:00`, count:v }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="hour" tick={{ fontSize:9 }} interval={1}/>
                  <YAxis tick={{ fontSize:9 }}/>
                  <Tooltip/>
                  <Bar dataKey="count" fill="#3b82f6" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid-2">
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'12px' }}>Doctor Performance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.doctorPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis type="number" tick={{ fontSize:9 }}/><YAxis type="category" dataKey="name" tick={{ fontSize:9 }} width={80}/>
                    <Tooltip/><Legend/>
                    <Bar dataKey="completed" fill="#10b981" name="Done"/>
                    <Bar dataKey="pending"   fill="#f59e0b" name="Pending"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'12px' }}>Top Symptoms</h3>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
                  {analytics.topSymptoms.map((s,i) => (
                    <span key={i} style={{ padding:'5px 12px', background:`hsl(${200+i*22},70%,90%)`, color:`hsl(${200+i*22},60%,30%)`, borderRadius:'18px', fontSize:'12px', fontWeight:600 }}>
                      {s.word} ({s.count})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUEUE ── */}
        {tab==='Queue' && (
          <div>
            {queue.length===0 ? (
              <div className="card" style={{ textAlign:'center', padding:'44px', color:'#9ca3af' }}>
                <Calendar size={44} style={{ marginBottom:'10px', opacity:.3 }}/>
                <div style={{ fontWeight:600 }}>No active queue today</div>
              </div>
            ) : queue.map((group,gi)=>(
              <div key={gi} className="card" style={{ marginBottom:'16px' }}>
                <h3 style={{ fontWeight:700, marginBottom:'12px' }}>Dr. {group.doctor?.name} — {group.doctor?.specialization} ({group.patients.length})</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Patient</th><th>Priority</th><th>Type</th><th>Status</th><th>Wait</th><th>ETA</th></tr></thead>
                    <tbody>
                      {group.patients.map((a,i)=>(
                        <tr key={a._id}>
                          <td style={{ fontWeight:700 }}>#{a.queuePosition||i+1}</td>
                          <td><div style={{ fontWeight:600 }}>{a.patient?.name}<div style={{ fontSize:'11px',color:'#9ca3af' }}>Age {a.patient?.age||'—'}</div></div></td>
                          <td><span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span></td>
                          <td style={{ fontSize:'12px' }}>{a.appointmentType}</td>
                          <td><span className={`badge badge-${a.status}`}>{a.status?.replace(/_/g,' ')}</span></td>
                          <td style={{ fontSize:'12px' }}>~{a.estimatedWaitMinutes||0} min</td>
                          <td style={{ fontFamily:'monospace',fontSize:'12px' }}>{a.estimatedStartTime||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CAPACITY ── */}
        {tab==='Capacity' && (
          <div className="card">
            <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Doctor Capacity — Today</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Doctor</th><th>Spec.</th><th>Fee</th><th>Max</th><th>Used</th><th>Free</th><th>Utilization</th><th>Emergency</th><th>Fatigue</th><th>Status</th></tr></thead>
                <tbody>
                  {capacity.map((c,i)=>(
                    <tr key={i}>
                      <td>{c.doctor.isRunningLate&&<div style={{ fontSize:'10px',color:'#f59e0b' }}>Late</div>}</td>
                      <td style={{ fontSize:'12px' }}>{c.doctor.specialization}</td>
                      <td style={{ fontSize:'12px', color:'#059669', fontWeight:600 }}>{c.doctor.consultationFee?`$${c.doctor.consultationFee}`:'—'}</td>
                      <td style={{ fontWeight:600 }}>{c.calculatedCapacity}</td>
                      <td>{c.usedSlots}</td>
                      <td style={{ fontWeight:700, color:c.remainingSlots===0?'#ef4444':'#10b981' }}>{c.remainingSlots}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <div style={{ flex:1, height:'7px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden', minWidth:'60px' }}>
                            <div style={{ height:'100%', borderRadius:'4px', width:`${c.utilizationPct}%`, background:c.utilizationPct>=90?'#ef4444':c.utilizationPct>=70?'#f59e0b':'#10b981' }}/>
                          </div>
                          <span style={{ fontSize:'11px', fontWeight:600 }}>{c.utilizationPct}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize:'12px' }}>{c.emergencyUsed}/{c.emergencySlots}</td>
                      <td style={{ fontSize:'12px', fontWeight:600, color:c.doctor.fatigueScore>80?'#ef4444':c.doctor.fatigueScore>60?'#f59e0b':'#10b981' }}>{c.doctor.fatigueScore||0}%</td>
                      <td><span className={`badge ${c.isOverloaded?'badge-EMERGENCY':'badge-LOW'}`}>{c.isOverloaded?'Full':'OK'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DOCTORS ── */}
        {tab==='Doctors' && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px', alignItems:'center' }}>
              <h3 style={{ fontWeight:700 }}>All Doctors ({doctors.length})</h3>
              <button onClick={()=>navigate('/admin/users')} className="btn btn-primary btn-sm"><Shield size={13}/> User Management</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Specialization</th><th>Fee</th><th>Exp.</th><th>License</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {doctors.map(d=>(
                    <tr key={d._id}>
                      <td><div style={{ fontWeight:600 }}>Dr. {d.name}</div><div style={{ fontSize:'11px',color:'#9ca3af' }}>{d.email}</div></td>
                      <td style={{ fontSize:'12px' }}>{d.specialization||'—'}</td>
                      <td style={{ fontSize:'12px', color:'#059669', fontWeight:600 }}>{d.consultationFee?`$${d.consultationFee}`:'—'}</td>
                      <td style={{ fontSize:'12px' }}>{d.experience?`${d.experience}y`:'—'}</td>
                      <td style={{ fontFamily:'monospace', fontSize:'11px' }}>{d.licenseNumber||'—'}</td>
                      <td><span style={{ background:d.status==='approved'?'#dcfce7':d.status==='pending'?'#fef9c3':'#fee2e2', color:d.status==='approved'?'#166534':d.status==='pending'?'#854d0e':'#991b1b', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>{d.status}</span></td>
                      <td>
                        {d.status==='pending'&&<div style={{ display:'flex',gap:'5px' }}>
                          <button onClick={()=>approveDoctor(d._id)} className="btn btn-success btn-sm"><CheckCircle size={12}/> Approve</button>
                          <button onClick={()=>rejectDoctor(d._id)}  className="btn btn-danger btn-sm"><XCircle size={12}/> Reject</button>
                        </div>}
                        {d.status==='approved'&&<span style={{ fontSize:'12px',color:'#10b981',fontWeight:600 }}>Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PATIENTS ── */}
        {tab==='Patients' && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
              <h3 style={{ fontWeight:700 }}>All Patients ({patients.length})</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Age</th><th>Blood</th><th>History</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {patients.map(p=>(
                    <tr key={p._id}>
                      <td style={{ fontWeight:600 }}>{p.name}</td>
                      <td style={{ fontSize:'12px' }}>{p.email}</td>
                      <td style={{ fontSize:'12px' }}>{p.age||'—'}</td>
                      <td style={{ fontSize:'12px' }}>{p.bloodGroup||'—'}</td>
                      <td style={{ fontSize:'11px',color:'#7c3aed' }}>{(p.medicalHistory||[]).join(', ')||'—'}</td>
                      <td><span style={{ background:p.isBlocked?'#fee2e2':'#dcfce7', color:p.isBlocked?'#991b1b':'#166534', padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700 }}>{p.isBlocked?'Blocked':'Active'}</span></td>
                      <td><button onClick={()=>toggleBlock(p._id,p.isBlocked)} className={`btn btn-sm ${p.isBlocked?'btn-success':'btn-danger'}`}>{p.isBlocked?'Unblock':'Block'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS ── */}
        {tab==='Appointments' && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px' }}>
              <h3 style={{ fontWeight:700 }}>All Appointments ({appts.length})</h3>
              <button onClick={loadTab} className="btn btn-outline btn-sm"><RefreshCw size={13}/> Refresh</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ticket</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Priority</th><th>Status</th><th>Rx</th><th>AI</th></tr></thead>
                <tbody>
                  {appts.map(a=>(
                    <tr key={a._id}>
                      <td style={{ fontFamily:'monospace',fontSize:'11px' }}>{a.ticketNumber}</td>
                      <td style={{ fontSize:'12px' }}>{a.patient?.name||'—'}</td>
                      <td style={{ fontSize:'12px' }}>Dr. {a.doctor?.name||'—'}</td>
                      <td style={{ fontSize:'12px' }}>{a.date} {a.time}</td>
                      <td><span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span></td>
                      <td><span className={`badge badge-${a.status}`}>{a.status?.replace(/_/g,' ')}</span></td>
                      <td>{a.hasPrescription?<span style={{ fontSize:'11px',color:'#10b981',fontWeight:700 }}><Pill size={11}/> Yes</span>:'—'}</td>
                      <td>{a.ai_modified?<Bot size={13} style={{ color:'#7c3aed' }}/>:'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </>}
      </div>
    </div>
  );
}
