import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search, CheckCircle, Brain, Zap, DollarSign, Clock,
  Star, Calendar, User, ChevronRight, RotateCcw, AlertCircle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TriageResultBox from '../components/TriageResultBox';
import { useAuth } from '../context/AuthContext';

const SPECS = ['All','Cardiology','Dermatology','Emergency Medicine','General Medicine',
  'Gynecology','Neurology','Oncology','Ophthalmology','Orthopedics',
  'Pediatrics','Psychiatry','Pulmonology','Surgery','Urology'];

export default function BookAppointment() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [step,     setStep]     = useState(1);
  const [doctors,  setDoctors]  = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [spec,     setSpec]     = useState('All');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({ date:'', time:'', reason:'', description:'', appointmentType:'new' });
  const [loading,  setLoading]  = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [error,    setError]    = useState('');
  const [alts,     setAlts]     = useState([]);
  const [success,  setSuccess]  = useState(null);
  const today = new Date().toISOString().slice(0,10);

  useEffect(() => {
    axios.get('/doctors').then(({ data }) => { setDoctors(data); setFiltered(data); });
  }, []);

  useEffect(() => {
    let list = doctors;
    if (spec !== 'All') list = list.filter(d => d.specialization === spec);
    if (search) list = list.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.specialization||'').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(list);
  }, [spec, search, doctors]);

  const getFee = (doc) => {
    if (!doc) return null;
    const type = form.appointmentType;
    if (type === 'emergency' && doc.emergencyFee) return { amount: doc.emergencyFee, label: 'Emergency Fee' };
    if (type === 'follow-up' && doc.followUpFee)  return { amount: doc.followUpFee,  label: 'Follow-up Fee' };
    if (doc.consultationFee) return { amount: doc.consultationFee, label: 'Consultation Fee' };
    return null;
  };

  const runTriage = async () => {
    if (!form.reason) return;
    setTriageLoading(true);
    try {
      const { data } = await axios.post('/appointments/triage', {
        reason: form.reason, description: form.description, age: user?.age || 30,
      });
      setTriageResult(data);
      if (data.severity === 'EMERGENCY') setForm(p => ({ ...p, appointmentType:'emergency' }));
    } catch {}
    setTriageLoading(false);
  };

  const submit = async () => {
    if (!form.date || !form.reason) { setError('Date and reason are required'); return; }
    setLoading(true); setError(''); setAlts([]);
    try {
      const { data } = await axios.post('/appointments/book', {
        doctorId: selected._id, ...form,
      });
      setTriageResult(data.triage);
      setSuccess(data.appointment);
      setStep(4);
    } catch (err) {
      const d = err.response?.data;
      if (d?.doctorFull) { setError(d.message); setAlts(d.alternatives || []); }
      else setError(d?.message || 'Booking failed. Please try again.');
    }
    setLoading(false);
  };

  const fee = getFee(selected);

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header">
          <h1>Book Appointment</h1>
          <p>AI-Powered Triage • Smart Doctor Matching • Real-time Queue</p>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', background:'#fff', borderRadius:'12px', overflow:'hidden', marginBottom:'24px', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          {['Choose Doctor','Details + Triage','Confirm','Done!'].map((s,i) => (
            <div key={i} style={{ flex:1, padding:'12px', textAlign:'center',
              background: step===i+1 ? 'linear-gradient(135deg,#1e3a8a,#3b82f6)' : step>i+1 ? '#f0fdf4' : '#fff',
              borderRight: i<3 ? '1px solid #e2e8f0' : '' }}>
              <span style={{ fontWeight:700, fontSize:'12px',
                color: step===i+1 ? '#fff' : step>i+1 ? '#10b981' : '#9ca3af' }}>
                {step>i+1 ? '' : `${i+1}. `}{s}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1 — Choose Doctor */}
        {step === 1 && (
          <div>
            <div className="card" style={{ marginBottom:'18px' }}>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <div style={{ flex:'2', minWidth:'180px', position:'relative' }}>
                  <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}/>
                  <input placeholder="Search doctor or specialization..." value={search}
                    onChange={e => setSearch(e.target.value)} style={{ paddingLeft:'32px' }}/>
                </div>
                <select value={spec} onChange={e => setSpec(e.target.value)} style={{ flex:'1', minWidth:'160px' }}>
                  {SPECS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2">
              {filtered.length === 0
                ? <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'48px', color:'#9ca3af' }}>No doctors found</div>
                : filtered.map(d => (
                    <div key={d._id} className="card"
                      style={{ cursor:'pointer', border:`2px solid ${selected?._id===d._id ? '#3b82f6':'transparent'}`, transition:'all .2s' }}
                      onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
                      onMouseOut={e  => e.currentTarget.style.transform=''}
                      onClick={() => { setSelected(d); setStep(2); }}>
                      <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                        <div style={{ width:'52px', height:'52px', borderRadius:'50%',
                          background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#fff', fontWeight:800, fontSize:'20px', flexShrink:0 }}>
                          {d.name[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'15px' }}>Dr. {d.name}</div>
                          <div style={{ color:'#3b82f6', fontSize:'12px', fontWeight:600 }}>{d.specialization}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'3px' }}>
                            {d.experience ? `${d.experience} yrs exp` : ''} {d.qualifications ? `• ${d.qualifications}` : ''}
                          </div>
                          {d.bio && <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'3px', fontStyle:'italic' }}>{d.bio.slice(0,60)}…</div>}

                          {/* Fee badges */}
                          <div style={{ display:'flex', gap:'6px', marginTop:'8px', flexWrap:'wrap' }}>
                            {d.consultationFee > 0 && (
                              <span style={{ background:'#f0fdf4', color:'#166534', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700 }}>
                                <DollarSign size={11} style={{ marginRight:'3px' }}/> ${d.consultationFee} consult
                              </span>
                            )}
                            {d.followUpFee > 0 && (
                              <span style={{ background:'#eff6ff', color:'#1e40af', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>
                                <RotateCcw size={11} style={{ marginRight:'3px' }}/> ${d.followUpFee} follow-up
                              </span>
                            )}
                            {d.emergencyFee > 0 && (
                              <span style={{ background:'#fef2f2', color:'#991b1b', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>
                                <AlertCircle size={11} style={{ marginRight:'3px' }}/> ${d.emergencyFee} emergency
                              </span>
                            )}
                          </div>

                          <div style={{ display:'flex', gap:'8px', marginTop:'8px', alignItems:'center' }}>
                            <span style={{ fontSize:'11px', color:'#9ca3af' }}>
                              <Clock size={11}/> {d.avgConsultTime} min/consult
                            </span>
                            <span className={`badge ${d.isAvailable ? 'badge-completed' : 'badge-rejected'}`}>
                              {d.isAvailable ? '● Available' : '● Unavailable'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={18} color="#9ca3af"/>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 2 && selected && (
          <div style={{ maxWidth:'580px' }}>
            {/* Selected doctor card */}
            <div className="card" style={{ marginBottom:'16px', background:'#eff6ff', border:'1px solid #bfdbfe' }}>
              <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'50%',
                  background:'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontWeight:800, fontSize:'18px' }}>{selected.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700 }}>Dr. {selected.name}</div>
                  <div style={{ fontSize:'12px', color:'#3b82f6' }}>{selected.specialization}</div>
                </div>
                <button onClick={() => setStep(1)} className="btn btn-outline btn-sm">Change</button>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {alts.length > 0 && (
              <div className="alert alert-warning" style={{ flexDirection:'column', gap:'8px' }}>
                <strong>Doctor fully booked! Available alternatives:</strong>
                {alts.map(alt => (
                  <div key={alt.doctor._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', padding:'8px 12px', borderRadius:'8px' }}>
                    <span style={{ fontSize:'13px', fontWeight:600 }}>
                      Dr. {alt.doctor.name} — {alt.remainingSlots} slots left
                      {alt.doctor.consultationFee ? ` · $${alt.doctor.consultationFee}` : ''}
                    </span>
                    <button onClick={() => { setSelected(alt.doctor); setAlts([]); setError(''); }} className="btn btn-primary btn-sm">Select</button>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ display:'grid', gap:'14px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div>
                  <label>Appointment Date *</label>
                  <input type="date" min={today} value={form.date} onChange={e => setForm({...form, date:e.target.value})}/>
                </div>
                <div>
                  <label>Preferred Time</label>
                  <input type="time" value={form.time} onChange={e => setForm({...form, time:e.target.value})}/>
                </div>
              </div>
              <div>
                <label>Appointment Type</label>
                <select value={form.appointmentType} onChange={e => setForm({...form, appointmentType:e.target.value})}>
                  <option value="new">New Consultation{selected.consultationFee ? ` — $${selected.consultationFee}` : ''}</option>
                  <option value="follow-up">Follow-up Visit{selected.followUpFee ? ` — $${selected.followUpFee}` : ''}</option>
                  <option value="emergency">Emergency{selected.emergencyFee ? ` — $${selected.emergencyFee}` : ''}</option>
                </select>
              </div>

              {/* Fee display */}
              {fee && (
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <DollarSign size={18} color="#059669"/>
                    <div>
                      <div style={{ fontWeight:700, color:'#166534', fontSize:'14px' }}>{fee.label}</div>
                      <div style={{ fontSize:'11px', color:'#6b7280' }}>Payable at clinic · {selected.currency || 'USD'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:'24px', fontWeight:800, color:'#059669' }}>
                    ${fee.amount}
                  </div>
                </div>
              )}

              <div>
                <label>Main Reason / Chief Complaint *</label>
                <input placeholder="e.g. chest pain, breathing difficulty, fever..." value={form.reason}
                  onChange={e => setForm({...form, reason:e.target.value})}/>
              </div>
              <div>
                <label>Detailed Description</label>
                <textarea rows={3} placeholder="Duration, severity, other symptoms..."
                  value={form.description} onChange={e => setForm({...form, description:e.target.value})}
                  style={{ resize:'vertical' }}/>
              </div>

              <button onClick={runTriage} className="btn btn-warning" style={{ justifyContent:'center' }}
                disabled={!form.reason || triageLoading}>
                {triageLoading
                  ? <><div className="spinner" style={{ width:'16px', height:'16px' }}/> Analyzing…</>
                  : <><Brain size={16}/> Run AI Pre-Triage</>}
              </button>

              {triageResult && <TriageResultBox triage={triageResult}/>}

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={() => setStep(1)} className="btn btn-outline" style={{ flex:1 }}>← Back</button>
                <button onClick={() => setStep(3)} className="btn btn-primary" style={{ flex:2 }}
                  disabled={!form.date || !form.reason}>Continue →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Confirm */}
        {step === 3 && selected && (
          <div style={{ maxWidth:'480px' }}>
            <div className="card">
              <h3 style={{ fontWeight:700, marginBottom:'18px' }}>Confirm Your Appointment</h3>
              <div style={{ display:'grid', gap:'8px', marginBottom:'18px' }}>
                {[
                  ['Doctor',     `Dr. ${selected.name}`],
                  ['Specialization', selected.specialization],
                  ['Date',       form.date],
                  ['Time',       form.time || 'Doctor will assign'],
                  ['Type',       form.appointmentType],
                  ['Reason',     form.reason],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', gap:'12px', padding:'9px 12px', background:'#f8fafc', borderRadius:'8px' }}>
                    <span style={{ fontSize:'12px', fontWeight:600, color:'#6b7280', minWidth:'90px' }}>{k}:</span>
                    <span style={{ fontSize:'13px', color:'#111827', flex:1 }}>{v}</span>
                  </div>
                ))}
                {/* Fee summary */}
                {getFee(selected) && (
                  <div style={{ display:'flex', gap:'12px', padding:'12px', background:'#f0fdf4', borderRadius:'8px', border:'1px solid #bbf7d0' }}>
                    <span style={{ fontSize:'12px', fontWeight:600, color:'#6b7280', minWidth:'90px' }}>Fee:</span>
                    <span style={{ fontSize:'14px', fontWeight:800, color:'#059669' }}>
                      ${getFee(selected).amount} {selected.currency || 'USD'} — {getFee(selected).label}
                    </span>
                  </div>
                )}
              </div>

              {triageResult && <TriageResultBox triage={triageResult}/>}

              <div className="alert alert-info" style={{ fontSize:'12px', marginBottom:'14px' }}>
                <Zap size={13}/> AI triage will auto-assign queue priority. Emergency cases go to top.
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={() => setStep(2)} className="btn btn-outline" style={{ flex:1 }}>← Back</button>
                <button onClick={submit} className="btn btn-primary" style={{ flex:2 }} disabled={loading}>
                  {loading ? <><div className="spinner" style={{ width:'16px', height:'16px' }}/> Booking…</> : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Success */}
        {step === 4 && success && (
          <div style={{ maxWidth:'480px' }}>
            <div className="card" style={{ textAlign:'center' }}>
              <CheckCircle size={60} color="#10b981" style={{ marginBottom:'14px' }}/>
              <h2 style={{ fontWeight:800, fontSize:'22px', marginBottom:'6px' }}>Appointment Booked!</h2>
              <p style={{ color:'#6b7280', marginBottom:'18px', fontSize:'13px' }}>
                Ticket: <strong style={{ fontFamily:'monospace', color:'#1e3a8a' }}>{success.ticketNumber}</strong>
              </p>
              {triageResult && <TriageResultBox triage={triageResult}/>}
              {success.consultationFee > 0 && (
                <div style={{ margin:'14px 0', padding:'12px', background:'#f0fdf4', borderRadius:'8px', fontSize:'13px', color:'#166534' }}>
                  <DollarSign size={13} style={{ marginRight:'4px', display:'inline' }}/> Consultation fee: <strong>${success.consultationFee} {selected?.currency||'USD'}</strong> — payable at clinic
                </div>
              )}
              <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                <button onClick={() => { setStep(1); setSelected(null); setForm({ date:'',time:'',reason:'',description:'',appointmentType:'new' }); setSuccess(null); setTriageResult(null); }}
                  className="btn btn-outline" style={{ flex:1 }}>Book Another</button>
                <button onClick={() => navigate('/my-appointments')} className="btn btn-primary" style={{ flex:1 }}>
                  My Appointments
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
