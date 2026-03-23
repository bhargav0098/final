import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, User, FileText, ChevronRight, AlertCircle, Bot, ClipboardList, AlertTriangle, Lightbulb, RefreshCw, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TriageResultBox from '../components/TriageResultBox';

const STATUSES = ['all','pending','confirmed','completed','rejected','cancelled_by_patient','rescheduled_by_doctor','rescheduled_by_ai','no-show'];

export default function MyAppointments() {
  const [appts, setAppts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [msg, setMsg]         = useState({ text:'', type:'' });
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason]   = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const { data } = await axios.get('/appointments/my'); setAppts(data); }
    catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3500); };

  const cancel = async () => {
    try {
      await axios.put(`/appointments/${cancelling}/cancel`, { reason: reason || 'Cancelled by patient' });
      flash('Appointment cancelled'); setCancelling(null); setReason(''); load();
    } catch (err) { flash(err.response?.data?.message || 'Cancel failed', 'error'); }
  };

  const visible = filter === 'all' ? appts : appts.filter(a => a.status === filter);

  const statusLabel = s => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div><h1>My Appointments</h1><p>Track status, queue position, and AI triage results</p></div>
          <button onClick={load} className="btn" style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.3)' }}><RefreshCw size={15}/> Refresh</button>
        </div>

        {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        {/* Filter pills */}
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', marginBottom:'18px' }}>
          {STATUSES.map(s => {
            const cnt = s === 'all' ? appts.length : appts.filter(a => a.status === s).length;
            return (
              <button key={s} onClick={()=>setFilter(s)}
                style={{ padding:'6px 14px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:600, transition:'all .18s',
                  background:filter===s?'#1e3a8a':'#fff', color:filter===s?'#fff':'#6b7280',
                  boxShadow:filter===s?'0 2px 8px rgba(30,58,138,.3)':'0 1px 3px rgba(0,0,0,.06)' }}>
                {statusLabel(s)} {cnt > 0 ? `(${cnt})` : ''}
              </button>
            );
          })}
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> :
          visible.length === 0
            ? <div className="card" style={{ textAlign:'center', padding:'44px', color:'#9ca3af' }}>
                <Calendar size={44} style={{ marginBottom:'10px', opacity:.3 }}/>
                <div style={{ fontWeight:600 }}>No appointments found</div>
              </div>
            : <div style={{ display:'grid', gap:'12px' }}>
                {visible.map(a => {
                  const sevColor = { LOW:'#10b981',MEDIUM:'#3b82f6',HIGH:'#f59e0b',EMERGENCY:'#ef4444' }[a.priority_level] || '#9ca3af';
                  const isExp = expanded === a._id;
                  return (
                    <div key={a._id} className="card" style={{ borderLeft:`4px solid ${sevColor}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px', flexWrap:'wrap' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', gap:'7px', alignItems:'center', marginBottom:'7px', flexWrap:'wrap' }}>
                            <span style={{ fontFamily:'monospace', fontSize:'11px', background:'#f1f5f9', padding:'2px 7px', borderRadius:'4px' }}>{a.ticketNumber}</span>
                            <span className={`badge badge-${a.status}`}>{statusLabel(a.status)}</span>
                            <span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span>
                            <span className="badge badge-pending">{a.appointmentType}</span>
                            {a.ai_modified && <span className="badge" style={{ background:'#ede9fe', color:'#5b21b6', display:'inline-flex', alignItems:'center', gap:'4px' }}><Bot size={12}/> AI Modified</span>}
                          </div>
                          <div style={{ fontWeight:700, fontSize:'15px' }}>Dr. {a.doctor?.name}</div>
                          <div style={{ color:'#3b82f6', fontSize:'12px', fontWeight:600 }}>{a.doctor?.specialization}</div>
                          <div style={{ display:'flex', gap:'14px', marginTop:'6px', flexWrap:'wrap', fontSize:'12px', color:'#6b7280' }}>
                            <span><Calendar size={12}/> {a.date}</span>
                            <span><Clock size={12}/> {a.time || 'TBD'}</span>
                            {a.queuePosition > 0 && <span>Queue #{a.queuePosition}</span>}
                            {a.estimatedWaitMinutes > 0 && <span>~{a.estimatedWaitMinutes} min wait</span>}
                          </div>
                          <div style={{ marginTop:'7px', padding:'7px 10px', background:'#f8fafc', borderRadius:'7px', fontSize:'12px', color:'#374151' }}>
                            <strong>Reason:</strong> {a.reason}
                          </div>
                          {a.reschedule_reason && (
                            <div style={{ marginTop:'5px', fontSize:'11px', color:'#7c3aed', fontStyle:'italic' }}>
                              <ClipboardList size={12} style={{ marginRight:'4px' }}/> Reschedule reason: {a.reschedule_reason}
                            </div>
                          )}
                          {a.doctor?.isRunningLate && (
                            <div style={{ marginTop:'5px', fontSize:'11px', color:'#f59e0b', fontWeight:600 }}>
                              <AlertTriangle size={12} style={{ marginRight:'4px' }}/> Doctor running {a.doctor.lateByMinutes} min late
                            </div>
                          )}
                          {a.triageResult?.recommended_action && (
                            <div style={{ marginTop:'5px', fontSize:'11px', color:'#059669', fontWeight:600 }}>
                              <Lightbulb size={12} style={{ marginRight:'4px' }}/> {a.triageResult.recommended_action}
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                          {['pending','confirmed'].includes(a.status) && (
                            <button onClick={()=>setCancelling(a._id)} className="btn btn-danger btn-sm"><X size={13}/> Cancel</button>
                          )}
                          <button onClick={()=>setExpanded(isExp?null:a._id)} className="btn btn-outline btn-sm">
                            {isExp?'Less':'Triage ↓'}
                          </button>
                        </div>
                      </div>
                      {isExp && a.triageResult && <TriageResultBox triage={a.triageResult}/>}
                    </div>
                  );
                })}
              </div>}

        {cancelling && (
          <div className="modal-overlay">
            <div className="card" style={{ maxWidth:'380px', width:'100%' }}>
              <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Cancel Appointment</h3>
              <textarea rows={3} placeholder="Reason for cancellation (optional)" value={reason} onChange={e=>setReason(e.target.value)} style={{ marginBottom:'14px' }}/>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{ setCancelling(null); setReason(''); }} className="btn btn-outline" style={{ flex:1 }}>Keep</button>
                <button onClick={cancel} className="btn btn-danger" style={{ flex:1 }}>Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
