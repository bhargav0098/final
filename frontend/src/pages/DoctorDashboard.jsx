import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Clock, Calendar, CheckCircle2, AlertTriangle, TrendingUp, Activity, ArrowRight, User, MousePointer2, Power, Timer, ChevronRight, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

const SEV_COLORS = { LOW:'#10b981', MEDIUM:'#3b82f6', HIGH:'#f59e0b', EMERGENCY:'#ef4444' };

export default function DoctorDashboard({ socket }) {
  const { user, updateUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isLate, setIsLate]       = useState(user?.isRunningLate||false);
  const [lateBy, setLateBy]       = useState(15);
  const [isAvail, setIsAvail]     = useState(user?.isAvailable!==false);
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    axios.get('/doctors/analytics').then(({ data }) => { setAnalytics(data); setLoading(false); }).catch(() => setLoading(false));
    if (socket) {
      socket.emit('join_doctor', user?._id);
      socket.on('emergency_alert', ({ patient }) => setMsg(`EMERGENCY: ${patient?.name}`));
    }
    return () => { if (socket) socket.off('emergency_alert'); };
  }, []);

  const toggleLate = async () => {
    const val = !isLate; setIsLate(val);
    await axios.put('/doctors/late-status', { isRunningLate:val, lateByMinutes:val?lateBy:0 });
    updateUser({ isRunningLate:val, lateByMinutes:val?lateBy:0 });
    setMsg(val?`Patients notified you're running ${lateBy} min late`:'Status cleared');
    setTimeout(()=>setMsg(''),4000);
  };

  const toggleAvail = async () => {
    const val = !isAvail; setIsAvail(val);
    await axios.put('/doctors/availability', { isAvailable:val });
    setMsg(val?'You are now available for bookings':'You are now marked unavailable');
    setTimeout(()=>setMsg(''),3000);
  };

  const a = analytics;

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><h1>Dr. {user?.name?.split(' ').slice(-1)[0]}'s Dashboard</h1>
            <p>{user?.specialization} • {new Date().toLocaleDateString('en-US',{ weekday:'long',month:'long',day:'numeric' })}</p></div>
          <NotificationBell socket={socket}/>
        </div>

        {msg && <div className="alert alert-info" style={{ fontWeight:600 }}>{msg}</div>}

        {/* Controls */}
        <div className="card" style={{ marginBottom:'20px', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontWeight:700, fontSize:'13px', color:'#6b7280' }}>Quick Controls:</span>
          <button onClick={toggleAvail} className={`btn ${isAvail?'btn-success':'btn-danger'}`}>
            <Power size={14}/>{isAvail?'Available':'Unavailable — Click to Enable'}
          </button>
          <div style={{ display:'flex', gap:'7px', alignItems:'center' }}>
            <button onClick={toggleLate} className={`btn ${isLate?'btn-danger':'btn-outline'}`}>
              <Timer size={14}/>{isLate?`Running ${lateBy}min Late — Click to Clear`:'Mark Running Late'}
            </button>
            {!isLate && (
              <select value={lateBy} onChange={e=>setLateBy(Number(e.target.value))} style={{ width:'85px', padding:'7px 9px' }}>
                {[5,10,15,20,30,45,60].map(v=><option key={v} value={v}>{v} min</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> : a && (
          <>
            {/* Stats */}
            <div className="grid-4" style={{ marginBottom:'20px' }}>
              {[
                { label:"Today's Patients", value:a.today, icon:Users, color:'#3b82f6', bg:'#eff6ff' },
                { label:'Max Capacity', value:a.capacity?.max||0, icon:Activity, color:'#7c3aed', bg:'#f5f3ff' },
                { label:'Completed (30d)', value:a.completed, icon:CheckCircle2, color:'#10b981', bg:'#f0fdf4' },
                { label:'Cancel Rate', value:`${a.cancelRate||0}%`, icon:TrendingUp, color:'#f59e0b', bg:'#fffbeb' },
              ].map((s,i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon" style={{ background:s.bg }}><s.icon size={19} color={s.color}/></div>
                  <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
                </div>
              ))}
            </div>

            {/* Capacity bar */}
            {a.capacity && (
              <div className="card" style={{ marginBottom:'20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'9px' }}>
                  <span style={{ fontWeight:700, fontSize:'14px' }}>Today's Capacity</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color:a.capacity.used>=a.capacity.max?'#ef4444':'#10b981' }}>
                    {a.capacity.used} / {a.capacity.max} used
                  </span>
                </div>
                <div style={{ height:'10px', background:'#f1f5f9', borderRadius:'5px', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:'5px', transition:'width .4s', width:`${Math.min((a.capacity.used/Math.max(a.capacity.max,1))*100,100)}%`, background:a.capacity.used>=a.capacity.max?'#ef4444':a.capacity.used>=a.capacity.max*.8?'#f59e0b':'#10b981' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px', fontSize:'11px', color:'#9ca3af' }}>
                  <span>Normal: {a.capacity.used}/{a.capacity.max}</span>
                  <span>Emergency buffer: {a.capacity.emergencyUsed}/{a.capacity.emergency}</span>
                </div>
              </div>
            )}

            {/* Critical patients */}
            {a.critical?.length > 0 && (
              <div style={{ background:'#fef2f2', border:'2px solid #fecaca', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px' }}>
                <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'10px' }}>
                  <AlertTriangle size={18} color="#ef4444"/>
                  <span style={{ fontWeight:700, color:'#991b1b' }}>{a.critical.length} Critical Patient(s) Awaiting</span>
                </div>
                {a.critical.slice(0,3).map(c => (
                  <div key={c._id} style={{ background:'#fff', borderRadius:'8px', padding:'9px 12px', marginBottom:'6px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:600, fontSize:'13px' }}>{c.patient?.name} — {c.date} {c.time}</span>
                    <div style={{ display:'flex', gap:'5px' }}>
                      <span className={`badge badge-${c.priority_level}`}>{c.priority_level}</span>
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts */}
            <div className="grid-2" style={{ marginBottom:'20px' }}>
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'14px' }}>7-Day Patient Trend</h3>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={a.weeklyTrend}>
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
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={Object.entries(a.severityDist||{}).map(([k,v])=>({ level:k,count:v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="level" tick={{ fontSize:11 }}/>
                    <YAxis tick={{ fontSize:11 }}/>
                    <Tooltip/>
                    <Bar dataKey="count" radius={[5,5,0,0]}>
                      {Object.keys(a.severityDist||{}).map((k,i) => <Cell key={i} fill={SEV_COLORS[k]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming + Recent */}
            <div className="grid-2">
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Upcoming</h3>
                {a.upcoming?.length === 0
                  ? <p style={{ color:'#9ca3af', fontSize:'13px' }}>No upcoming appointments</p>
                  : a.upcoming.map(ap => (
                      <div key={ap._id} style={{ padding:'10px', background:'#f8fafc', borderRadius:'8px', marginBottom:'6px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'13px' }}>{ap.patient?.name}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af' }}>{ap.date} {ap.time}</div>
                          <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'1px' }}>{ap.reason?.slice(0,40)}</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'3px', alignItems:'flex-end' }}>
                          <span className={`badge badge-${ap.priority_level}`}>{ap.priority_level}</span>
                          <span className={`badge badge-${ap.status}`}>{ap.status}</span>
                        </div>
                      </div>
                    ))}
              </div>
              <div className="card">
                <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Recent Completed</h3>
                {a.recentCompleted?.length === 0
                  ? <p style={{ color:'#9ca3af', fontSize:'13px' }}>No completions yet</p>
                  : a.recentCompleted.map(ap => (
                      <div key={ap._id} style={{ padding:'10px', background:'#f0fdf4', borderRadius:'8px', marginBottom:'6px', borderLeft:'3px solid #10b981' }}>
                        <div style={{ fontWeight:600, fontSize:'13px' }}>{ap.patient?.name}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af' }}>{ap.date} • {ap.actualDuration||ap.predictedDuration} min</div>
                        {ap.notes && <div style={{ fontSize:'11px', color:'#374151', marginTop:'2px', fontStyle:'italic' }}>"{ap.notes.slice(0,60)}…"</div>}
                      </div>
                    ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
