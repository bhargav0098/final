import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users, Calendar, Clock, Activity, ArrowRight, Pill,
  MessageSquare, User, TrendingUp, Shield, Beaker, Smile,
  CheckCircle, Brain, Plus, Bot, ClipboardList, AlertTriangle, Lightbulb
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

export default function PatientDashboard({ socket }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/patients/analytics').then(({ data }) => { setAnalytics(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const a = analytics;
  const statCards = [
    { label:'Total Visits', value:a?.total||0, icon:Calendar, color:'#3b82f6', bg:'#eff6ff' },
    { label:'Completed', value:a?.completed||0, icon:CheckCircle, color:'#10b981', bg:'#f0fdf4' },
    { label:'Upcoming', value:a?.upcoming?.length||0, icon:Clock, color:'#7c3aed', bg:'#f5f3ff' },
    { label:'Cancelled', value:a?.cancelled||0, icon:Activity, color:'#f59e0b', bg:'#fffbeb' },
  ];

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><h1>Hello, {user?.name?.split(' ')[0]} <Smile size={24} style={{ display:'inline', verticalAlign:'middle' }}/></h1><p>Your personal health dashboard</p></div>
          <div style={{ display:'flex', gap:'10px' }}>
            <Link to="/book-appointment" className="btn" style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.35)', textDecoration:'none' }}>
              <Plus size={15}/> Book Appointment
            </Link>
            <NotificationBell socket={socket}/>
          </div>
        </div>

        {/* AI Insight */}
        {a?.suggestion && (
          <div style={{ background:'linear-gradient(135deg,#1e40af,#3b82f6)', borderRadius:'14px', padding:'18px 22px', marginBottom:'22px', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
            <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
              <div style={{ background:'rgba(255,255,255,.2)', borderRadius:'10px', padding:'9px' }}><Brain size={22}/></div>
              <div>
                <div style={{ fontWeight:700, marginBottom:'3px' }}>AI Health Insight</div>
                <div style={{ fontSize:'13px', color:'#bfdbfe' }}>{a.suggestion}</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'11px', color:'#93c5fd' }}>Next suggested visit</div>
              <div style={{ fontWeight:700 }}>{a.nextSuggestedVisit}</div>
            </div>
          </div>
        )}

        {/* Stat cards */}
        {loading ? <div className="loading"><div className="spinner"/></div> : (
          <>
            <div className="grid-4" style={{ marginBottom:'22px' }}>
              {statCards.map((s,i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
                  <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
                </div>
              ))}
            </div>

            {a && (
              <div className="grid-2" style={{ marginBottom:'22px' }}>
                <div className="card">
                  <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Severity History</h3>
                  {[{l:'Low',k:'LOW',c:'#10b981'},{l:'Medium',k:'MEDIUM',c:'#3b82f6'},{l:'High',k:'HIGH',c:'#f59e0b'},{l:'Emergency',k:'EMERGENCY',c:'#ef4444'}].map(({ l,k,c }) => (
                    <div key={k} style={{ marginBottom:'9px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                        <span style={{ fontSize:'12px', fontWeight:600 }}>{l}</span>
                        <span style={{ fontSize:'12px', color:'#9ca3af' }}>{a.severity?.[k]||0}</span>
                      </div>
                      <div style={{ height:'7px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden' }}>
                        <div style={{ height:'100%', background:c, borderRadius:'4px', width:`${a.total > 0 ? ((a.severity?.[k]||0)/a.total)*100 : 0}%`, transition:'width .4s' }}/>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Health Trend (Last 10 Visits)</h3>
                  {a.healthTrend?.length > 0
                    ? <ResponsiveContainer width="100%" height={190}>
                        <LineChart data={a.healthTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                          <XAxis dataKey="visit" tick={{ fontSize:10 }}/>
                          <YAxis tick={{ fontSize:10 }} domain={[0,4]} tickFormatter={v=>['','Low','Med','High','Emrg'][v]||v}/>
                          <Tooltip formatter={(v)=>[['Low','Medium','High','Emergency'][v-1]||v,'Severity']}/>
                          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6', r:5 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    : <p style={{ color:'#9ca3af', fontSize:'13px', textAlign:'center', paddingTop:'40px' }}>No visit history yet</p>}
                </div>
              </div>
            )}

            {a?.upcoming?.length > 0 && (
              <div className="card" style={{ marginBottom:'22px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                  <h3 style={{ fontWeight:700 }}>Upcoming Appointments</h3>
                  <Link to="/my-appointments" style={{ color:'#3b82f6', textDecoration:'none', fontSize:'12px', fontWeight:600, display:'flex', alignItems:'center', gap:'3px' }}>View all <ArrowRight size={13}/></Link>
                </div>
                <div style={{ display:'grid', gap:'9px' }}>
                  {a.upcoming.map(ap => (
                    <div key={ap._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#f8fafc', borderRadius:'9px', borderLeft:'3px solid #3b82f6' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'13px' }}>Dr. {ap.doctor?.name}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af' }}>{ap.doctor?.specialization}</div>
                        <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'1px' }}>{ap.date} at {ap.time||'TBD'}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'3px', alignItems:'flex-end' }}>
                        <span className={`badge badge-${ap.status}`}>{ap.status?.replace(/_/g,' ')}</span>
                        <span className={`badge badge-${ap.priority_level}`}>{ap.priority_level}</span>
                        {ap.queuePosition > 0 && <span style={{ fontSize:'10px', color:'#9ca3af' }}>Queue #{ap.queuePosition}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid-2">
              <Link to="/book-appointment" style={{ textDecoration:'none' }}>
                <div className="card" style={{ cursor:'pointer', border:'2px dashed #bfdbfe', textAlign:'center', padding:'28px', transition:'all .2s' }}
                  onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(59,130,246,.15)'}}
                  onMouseOut={e=>{e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''}}>
                  <Plus size={28} color="#3b82f6" style={{ marginBottom:'7px' }}/>
                  <div style={{ fontWeight:700, color:'#1e3a8a' }}>Book New Appointment</div>
                  <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'3px' }}>AI triage included</div>
                </div>
              </Link>
              <Link to="/my-appointments" style={{ textDecoration:'none' }}>
                <div className="card" style={{ cursor:'pointer', border:'2px dashed #bbf7d0', textAlign:'center', padding:'28px', transition:'all .2s' }}
                  onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(16,185,129,.15)'}}
                  onMouseOut={e=>{e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''}}>
                  <Calendar size={28} color="#10b981" style={{ marginBottom:'7px' }}/>
                  <div style={{ fontWeight:700, color:'#065f46' }}>View All Appointments</div>
                  <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'3px' }}>Track status & queue</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
