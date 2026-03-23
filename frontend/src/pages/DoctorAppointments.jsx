import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Check, X, RefreshCw, Clock, AlertTriangle, FileText,
  Calendar, ChevronDown, ChevronUp, Bell, Pill, Bot, Stethoscope
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TriageResultBox from '../components/TriageResultBox';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

const SEV_COLORS = { LOW:'#10b981', MEDIUM:'#3b82f6', HIGH:'#f59e0b', EMERGENCY:'#ef4444' };

export default function DoctorAppointments({ socket }) {
  const { user } = useAuth();
  const [appts,    setAppts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('pending');
  const [date,     setDate]     = useState(new Date().toISOString().slice(0,10));
  const [msg,      setMsg]      = useState({ text:'', type:'' });
  const [completing,   setCompleting]   = useState(null);
  const [notes,        setNotes]        = useState('');
  const [duration,     setDuration]     = useState(15);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reschedModal, setReschedModal] = useState(null);
  const [reschedData,  setReschedData]  = useState({ newDate:'', newTime:'', reason:'' });
  const [expanded,     setExpanded]     = useState(null);
  const [newApptAlert, setNewApptAlert] = useState(null);

  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('join', user._id);
      socket.emit('join_doctor', user._id);
    }
  }, [socket, user?._id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/appointments/doctor?date=${date}`);
      setAppts(data);
    } catch (err) { setMsg({ text: err.response?.data?.message || 'Failed to load', type:'error' }); }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNew = ({ appointment, patient, triage }) => {
      setNewApptAlert({ appointment, patient, triage });
      load();
      setTimeout(() => setNewApptAlert(null), 8000);
    };
    const onEmergency = ({ patient, triage }) => {
      setMsg({ text:`EMERGENCY: ${patient?.name} — ${triage?.recommended_action||'Immediate care'}`, type:'error' });
      load();
    };
    socket.on('new_appointment', onNew);
    socket.on('emergency_alert', onEmergency);
    socket.on('no_show_detected', load);
    socket.on('queue_updated', load);
    return () => {
      socket.off('new_appointment', onNew);
      socket.off('emergency_alert', onEmergency);
      socket.off('no_show_detected', load);
      socket.off('queue_updated', load);
    };
  }, [socket, load]);

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg({text:'',type:''}),4000); };

  const accept = async (id) => {
    try { await axios.put(`/appointments/${id}/accept`); flash('Appointment confirmed — patient notified'); load(); }
    catch (err) { flash(err.response?.data?.message||'Failed','error'); }
  };
  const reject = async () => {
    try { await axios.put(`/appointments/${rejectModal}/reject`, { reason: rejectReason||'Schedule conflict' }); flash('Appointment rejected'); setRejectModal(null); setRejectReason(''); load(); }
    catch (err) { flash(err.response?.data?.message||'Failed','error'); }
  };
  const complete = async () => {
    try { await axios.put(`/appointments/${completing}/complete`, { actualDuration:duration, notes }); flash('Marked as completed'); setCompleting(null); setNotes(''); load(); }
    catch (err) { flash(err.response?.data?.message||'Failed','error'); }
  };
  const reschedule = async () => {
    if (!reschedData.newDate) { flash('New date required','error'); return; }
    try { await axios.put(`/appointments/${reschedModal}/reschedule`, reschedData); flash('Rescheduled — patient notified by email'); setReschedModal(null); setReschedData({newDate:'',newTime:'',reason:''}); load(); }
    catch (err) { flash(err.response?.data?.message||'Failed','error'); }
  };

  const STATUSES = ['all','pending','confirmed','completed','rejected','cancelled_by_patient','cancelled_by_doctor','rescheduled_by_doctor','rescheduled_by_ai','no-show'];
  const visible = filter==='all' ? appts : appts.filter(a=>a.status===filter);
  const emergencyCount = appts.filter(a=>a.priority_level==='EMERGENCY'&&['pending','confirmed'].includes(a.status)).length;
  const pendingCount   = appts.filter(a=>a.status==='pending').length;

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1>Patient Queue</h1>
            <p>Accept · Reject · Complete · Reschedule · Issue Prescriptions</p>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <button onClick={load} className="btn" style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.3)' }}>
              <RefreshCw size={14}/> Refresh
            </button>
            <NotificationBell socket={socket}/>
          </div>
        </div>

        {newApptAlert && (
          <div style={{ background:'linear-gradient(135deg,#1e40af,#3b82f6)', borderRadius:'12px', padding:'14px 18px', marginBottom:'16px', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
              <Bell size={20}/>
              <div>
                <div style={{ fontWeight:700 }}><Bell size={14} style={{ marginRight:'5px' }}/>New Appointment Request!</div>
                <div style={{ fontSize:'13px', color:'#bfdbfe' }}>
                  {newApptAlert.patient?.name} · {newApptAlert.triage?.severity} · {newApptAlert.appointment?.reason?.slice(0,50)}
                </div>
              </div>
            </div>
            <button onClick={()=>setNewApptAlert(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#fff' }}>✕</button>
          </div>
        )}

        {msg.text && <div className={`alert alert-${msg.type||'success'}`} style={{ fontWeight:600 }}>{msg.text}</div>}

        {emergencyCount > 0 && (
          <div className="emergency-flash" style={{ borderRadius:'12px', padding:'14px 18px', marginBottom:'16px', border:'2px solid #ef4444', display:'flex', gap:'10px', alignItems:'center' }}>
            <AlertTriangle size={20} color="#ef4444"/>
            <span style={{ fontWeight:700, color:'#991b1b' }}>{emergencyCount} EMERGENCY patient(s) — Immediate attention required!</span>
          </div>
        )}

        {pendingCount > 0 && filter!=='pending' && (
          <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:'#92400e', fontWeight:600, fontSize:'13px' }}><FileText size={12} style={{ marginRight:'4px' }}/> {pendingCount} appointment(s) waiting for your response</span>
            <button onClick={()=>setFilter('pending')} className="btn btn-warning btn-sm">Review Pending</button>
          </div>
        )}

        {/* Date + filters */}
        <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:'170px' }}/>
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {STATUSES.map(s => (
              <button key={s} onClick={()=>setFilter(s)}
                style={{ padding:'6px 12px', border:'none', borderRadius:'18px', cursor:'pointer', fontSize:'11px', fontWeight:600, transition:'all .15s',
                  background:filter===s?'#1e3a8a':'#fff', color:filter===s?'#fff':'#6b7280', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                {s==='all'?'All':s.replace(/_/g,' ')} ({s==='all'?appts.length:appts.filter(a=>a.status===s).length})
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> :
          visible.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'44px', color:'#9ca3af' }}>
              <Calendar size={44} style={{ marginBottom:'10px', opacity:.3 }}/>
              <div style={{ fontWeight:600 }}>No appointments for {date}</div>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'12px' }}>
              {[...visible].sort((a,b)=>{
                if (a.priority_level==='EMERGENCY'&&b.priority_level!=='EMERGENCY') return -1;
                if (b.priority_level==='EMERGENCY'&&a.priority_level!=='EMERGENCY') return 1;
                return (a.queuePosition||99)-(b.queuePosition||99);
              }).map(a => {
                const sc    = SEV_COLORS[a.priority_level]||'#9ca3af';
                const isExp = expanded===a._id;
                return (
                  <div key={a._id} className={`card ${a.priority_level==='EMERGENCY'?'emergency-flash':''}`}
                    style={{ borderLeft:`4px solid ${sc}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:'7px', alignItems:'center', marginBottom:'7px', flexWrap:'wrap' }}>
                          {a.queuePosition>0&&<div style={{ width:'26px',height:'26px',borderRadius:'50%',background:'#1e3a8a',color:'#fff',fontWeight:700,fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center' }}>#{a.queuePosition}</div>}
                          <span style={{ fontWeight:700, fontSize:'15px' }}>{a.patient?.name}</span>
                          <span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span>
                          <span className={`badge badge-${a.status}`}>{a.status?.replace(/_/g,' ')}</span>
                          <span className="badge badge-pending">{a.appointmentType}</span>
                          {a.ai_modified&&<span className="badge" style={{ background:'#ede9fe',color:'#5b21b6', display:'flex', alignItems:'center', gap:'3px' }}><Bot size={11}/>AI</span>}
                          {a.hasPrescription&&<span className="badge badge-completed" style={{ display:'flex', alignItems:'center', gap:'3px' }}><Pill size={11}/>Rx</span>}
                        </div>
                        <div style={{ display:'flex', gap:'14px', fontSize:'12px', color:'#6b7280', marginBottom:'6px', flexWrap:'wrap' }}>
                          <span>Age {a.patient?.age||'—'} · {a.patient?.gender||'—'}</span>
                          <span><Clock size={11}/> {a.time||'TBD'}</span>
                          {a.estimatedWaitMinutes>=0&&<span><Clock size={11}/> ~{a.estimatedWaitMinutes}min</span>}
                        </div>
                        <div style={{ padding:'8px 12px',background:'#f8fafc',borderRadius:'7px',marginBottom:'6px',fontSize:'12px',color:'#374151' }}>
                          <strong>Reason:</strong> {a.reason}
                        </div>
                        {a.triageResult?.detected_symptoms?.length>0&&<div style={{ fontSize:'11px',color:'#6b7280' }}>Symptoms: {a.triageResult.detected_symptoms.slice(0,3).join(', ')}</div>}
                        {a.triageResult?.redFlags?.length>0&&<div style={{ fontSize:'11px',color:'#ef4444',fontWeight:600,marginTop:'3px' }}><AlertTriangle size={11} style={{ marginRight:'3px' }}/>{a.triageResult.redFlags.join(', ')}</div>}
                        {a.patient?.medicalHistory?.length>0&&<div style={{ fontSize:'11px',color:'#7c3aed',marginTop:'3px' }}>History: {a.patient.medicalHistory.join(', ')}</div>}
                        {a.patient?.allergies?.length>0&&<div style={{ fontSize:'11px',color:'#dc2626',fontWeight:600,marginTop:'2px' }}>Allergies: {a.patient.allergies.join(', ')}</div>}
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'5px', flexShrink:0 }}>
                        {a.status==='pending'&&<>
                          <button onClick={()=>accept(a._id)} className="btn btn-success btn-sm"><Check size={13}/> Accept</button>
                          <button onClick={()=>setRejectModal(a._id)} className="btn btn-danger btn-sm"><X size={13}/> Reject</button>
                        </>}
                        {a.status==='confirmed'&&<>
                          <button onClick={()=>setCompleting(a._id)} className="btn btn-primary btn-sm"><FileText size={13}/> Complete</button>
                          <button onClick={()=>setReschedModal(a._id)} className="btn btn-warning btn-sm"><Calendar size={13}/> Reschedule</button>
                          <button onClick={()=>setRejectModal(a._id)} className="btn btn-danger btn-sm"><X size={13}/> Reject</button>
                        </>}
                        {a.status==='completed'&&!a.hasPrescription&&(
                          <a href="/doctor/prescriptions" className="btn btn-outline btn-sm" style={{ textDecoration:'none' }}><Pill size={13}/> Rx</a>
                        )}
                        <button onClick={()=>setExpanded(isExp?null:a._id)} className="btn btn-outline btn-sm">
                          {isExp?<ChevronUp size={13}/>:<ChevronDown size={13}/>} Triage
                        </button>
                      </div>
                    </div>
                    {isExp&&a.triageResult&&<div style={{ marginTop:'10px' }}><TriageResultBox triage={a.triageResult}/></div>}
                  </div>
                );
              })}
            </div>
          )}

        {/* Complete Modal */}
        {completing && (
          <div className="modal-overlay">
            <div className="card" style={{ maxWidth:'420px', width:'100%' }}>
              <h3 style={{ fontWeight:700, marginBottom:'16px' }}>Complete Consultation</h3>
              <div style={{ marginBottom:'12px' }}>
                <label>Actual Duration (minutes)</label>
                <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} min={1} max={180}/>
              </div>
              <div style={{ marginBottom:'16px' }}>
                <label>Consultation Notes</label>
                <textarea rows={3} placeholder="Diagnosis, treatment, follow-up..." value={notes} onChange={e=>setNotes(e.target.value)}/>
              </div>
              <div className="alert alert-info" style={{ fontSize:'12px', marginBottom:'12px' }}><Pill size={12} style={{ marginRight:'5px' }}/>After completing, go to Prescriptions tab to issue a prescription.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>setCompleting(null)} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                <button onClick={complete} className="btn btn-success" style={{ flex:1 }}>Mark Complete</button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="modal-overlay">
            <div className="card" style={{ maxWidth:'380px', width:'100%' }}>
              <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Reject Appointment</h3>
              <textarea rows={3} placeholder="Reason for rejection..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)} style={{ marginBottom:'14px' }}/>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{setRejectModal(null);setRejectReason('');}} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                <button onClick={reject} className="btn btn-danger" style={{ flex:1 }}>Confirm Reject</button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {reschedModal && (
          <div className="modal-overlay">
            <div className="card" style={{ maxWidth:'400px', width:'100%' }}>
              <h3 style={{ fontWeight:700, marginBottom:'14px' }}>Reschedule Appointment</h3>
              <div style={{ marginBottom:'10px' }}><label>New Date *</label><input type="date" min={new Date().toISOString().slice(0,10)} value={reschedData.newDate} onChange={e=>setReschedData({...reschedData,newDate:e.target.value})}/></div>
              <div style={{ marginBottom:'10px' }}><label>New Time</label><input type="time" value={reschedData.newTime} onChange={e=>setReschedData({...reschedData,newTime:e.target.value})}/></div>
              <div style={{ marginBottom:'14px' }}><label>Reason</label><input placeholder="Emergency, schedule conflict..." value={reschedData.reason} onChange={e=>setReschedData({...reschedData,reason:e.target.value})}/></div>
              <div className="alert alert-info" style={{ fontSize:'12px', marginBottom:'12px' }}>Patient will be notified by email instantly.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{setReschedModal(null);setReschedData({newDate:'',newTime:'',reason:''});}} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                <button onClick={reschedule} className="btn btn-primary" style={{ flex:1 }}>Reschedule & Notify</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
