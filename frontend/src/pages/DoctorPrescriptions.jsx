import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pill, Plus, X, Save, Brain, AlertTriangle, CheckCircle, FileText, ClipboardList, Bot } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const EMPTY_MED = { name:'', dosage:'', duration:'', notes:'' };

export default function DoctorPrescriptions() {
  const [completedAppts, setCompletedAppts] = useState([]);
  const [pendingAppts,   setPendingAppts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState({ diagnosis:'', medicines:[{...EMPTY_MED}], instructions:'', followUpDate:'', followUpNotes:'', doctorNotes:'' });
  const [aiSugs,   setAiSugs]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState({ text:'', type:'' });
  const [tab,      setTab]      = useState('pending');

  const flash = (text, type='success') => { setMsg({ text, type }); setTimeout(()=>setMsg({text:'',type:''}),4000); };

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    Promise.all([
      axios.get('/appointments/doctor'),
      axios.get(`/appointments/doctor?date=${today}`),
    ]).then(([allRes, todayRes]) => {
      const all = allRes.data;
      setCompletedAppts(all.filter(a => a.status === 'completed'));
      setPendingAppts(todayRes.data.filter(a => ['confirmed','pending'].includes(a.status)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const startPrescription = (appt) => {
    setSelected(appt);
    setForm({ diagnosis:'', medicines:[{...EMPTY_MED}], instructions:'', followUpDate:'', followUpNotes:'', doctorNotes:'' });
    setAiSugs(null);
  };

  const addMed    = () => setForm(p => ({ ...p, medicines:[...p.medicines, {...EMPTY_MED}] }));
  const removeMed = (i) => setForm(p => ({ ...p, medicines:p.medicines.filter((_,idx)=>idx!==i) }));
  const updateMed = (i, field, val) => setForm(p => ({
    ...p, medicines:p.medicines.map((m,idx)=>idx===i?{...m,[field]:val}:m)
  }));

  const getAISuggestions = async () => {
    if (!form.diagnosis) { flash('Enter a diagnosis first','error'); return; }
    try {
      const { data } = await axios.post(`/prescriptions/${selected._id}`, {
        diagnosis: form.diagnosis, medicines:[], instructions:'',
        followUpDate:'', followUpNotes:'', doctorNotes: form.doctorNotes,
        _dryRun: true,
      });
      setAiSugs(data.aiSuggestions);
    } catch(err) {
      // Try anyway from triage result
      const triage = selected.triageResult;
      if (triage) {
        setAiSugs({ possibleConditions: triage.possibleConditions||[], warnings:[], medicineSuggestions:[], recommendedTests:[] });
      }
    }
  };

  const addSuggestedMed = (med) => {
    setForm(p => ({
      ...p,
      medicines: [...p.medicines.filter(m=>m.name), { name:med.name, dosage:'As prescribed', duration:'5-7 days', notes:med.note||'' }]
    }));
  };

  const submit = async () => {
    if (!form.diagnosis) { flash('Diagnosis is required','error'); return; }
    const hasMeds = form.medicines.some(m => m.name.trim());
    if (!hasMeds) { flash('Add at least one medicine','error'); return; }
    setSaving(true);
    try {
      const payload = {
        diagnosis:    form.diagnosis,
        medicines:    form.medicines.filter(m => m.name.trim()),
        instructions: form.instructions,
        followUpDate: form.followUpDate,
        followUpNotes:form.followUpNotes,
        doctorNotes:  form.doctorNotes,
      };
      const { data } = await axios.post(`/prescriptions/${selected._id}`, payload);
      flash('Prescription issued and emailed to patient');
      setSelected(null);
      // Refresh
      const allRes = await axios.get('/appointments/doctor');
      setCompletedAppts(allRes.data.filter(a => a.status === 'completed'));
    } catch(err) {
      flash(err.response?.data?.message || 'Failed to issue prescription','error');
    }
    setSaving(false);
  };

  const allAppts = tab === 'pending' ? pendingAppts : completedAppts;

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        <div className="page-header">
          <h1><Pill size={32} style={{ display:'inline', verticalAlign:'middle', marginRight:'8px' }}/> Prescriptions</h1>
          <p>Issue prescriptions after consultations • AI-assisted drug suggestions</p>
        </div>

        {msg.text && <div className={`alert alert-${msg.type||'success'}`}>{msg.text}</div>}

        {/* Tabs */}
        <div style={{ display:'flex', gap:'4px', background:'#fff', borderRadius:'10px', padding:'3px', marginBottom:'20px', width:'fit-content', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          {[['pending', <><ClipboardList size={14}/> Active Appointments</>],['completed', <><CheckCircle size={14}/> Completed</>]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{ padding:'9px 20px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:600, fontSize:'13px', transition:'all .18s',
                background:tab===k?'linear-gradient(135deg,#1e3a8a,#3b82f6)':'transparent', color:tab===k?'#fff':'#6b7280' }}>
              {l}
            </button>
          ))}
        </div>

        {loading ? <div className="loading"><div className="spinner"/></div> :
          allAppts.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'44px', color:'#9ca3af' }}>
              <Pill size={44} style={{ marginBottom:'10px', opacity:.3 }}/>
              <div style={{ fontWeight:600 }}>No {tab === 'pending' ? 'active' : 'completed'} appointments</div>
            </div>
          ) : (
            <div style={{ display:'grid', gap:'12px' }}>
              {allAppts.map(a => (
                <div key={a._id} className="card" style={{ borderLeft:`4px solid ${a.hasPrescription?'#10b981':a.priority_level==='EMERGENCY'?'#ef4444':a.priority_level==='HIGH'?'#f59e0b':'#3b82f6'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:'7px', alignItems:'center', marginBottom:'6px', flexWrap:'wrap' }}>
                        <span style={{ fontWeight:700, fontSize:'15px' }}>{a.patient?.name}</span>
                        <span className={`badge badge-${a.priority_level}`}>{a.priority_level}</span>
                        <span className={`badge badge-${a.status}`}>{a.status?.replace(/_/g,' ')}</span>
                        {a.hasPrescription && <span className="badge badge-completed" style={{ display:'flex', alignItems:'center', gap:'4px' }}><Pill size={12}/> Rx Issued</span>}
                      </div>
                      <div style={{ fontSize:'12px', color:'#6b7280' }}>
                        Age: {a.patient?.age||'—'} · {a.date} {a.time}
                        {a.patient?.allergies?.length > 0 && <span style={{ color:'#dc2626', marginLeft:'8px', fontWeight:600, display:'flex', alignItems:'center', gap:'3px' }}><AlertTriangle size={12}/> Allergies: {a.patient.allergies.join(', ')}</span>}
                      </div>
                      <div style={{ fontSize:'13px', color:'#374151', marginTop:'4px' }}>{a.reason}</div>
                      {a.triageResult?.detected_symptoms?.length > 0 && (
                        <div style={{ fontSize:'11px', color:'#9ca3af', marginTop:'2px' }}>AI: {a.triageResult.detected_symptoms.join(', ')}</div>
                      )}
                    </div>
                    <div>
                      {!a.hasPrescription ? (
                        <button onClick={() => startPrescription(a)} className="btn btn-primary btn-sm">
                          <Plus size={13}/> Issue Prescription
                        </button>
                      ) : (
                        <span style={{ fontSize:'12px', color:'#10b981', fontWeight:600 }}>Rx Sent</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* ── Prescription Modal ── */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="card" style={{ maxWidth:'680px', width:'100%', maxHeight:'92vh', overflowY:'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
                <h2 style={{ fontWeight:800, fontSize:'18px', display:'flex', alignItems:'center', gap:'8px' }}><Pill size={20}/> Issue Prescription</h2>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><X size={20}/></button>
              </div>

              {/* Patient info */}
              <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px' }}>
                <div style={{ fontWeight:700 }}>Patient: {selected.patient?.name}</div>
                <div style={{ fontSize:'12px', color:'#6b7280' }}>
                  Age {selected.patient?.age} · {selected.date} · Ticket: {selected.ticketNumber}
                </div>
                {selected.patient?.medicalHistory?.length > 0 && (
                  <div style={{ fontSize:'11px', color:'#7c3aed', marginTop:'3px', display:'flex', alignItems:'center', gap:'4px' }}><ClipboardList size={11}/> History: {selected.patient.medicalHistory.join(', ')}</div>
                )}
                {selected.patient?.allergies?.length > 0 && (
                  <div style={{ fontSize:'11px', color:'#dc2626', fontWeight:700, marginTop:'2px', display:'flex', alignItems:'center', gap:'4px' }}><AlertTriangle size={11}/> ALLERGIES: {selected.patient.allergies.join(', ')}</div>
                )}
              </div>

              <div style={{ display:'grid', gap:'14px' }}>
                {/* Diagnosis */}
                <div>
                  <label>Diagnosis *</label>
                  <input placeholder="e.g. Hypertension, Viral fever, URTI..." value={form.diagnosis}
                    onChange={e => setForm({...form, diagnosis:e.target.value})}/>
                </div>

                {/* AI Suggestions */}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={getAISuggestions} className="btn btn-warning btn-sm" disabled={!form.diagnosis}>
                    <Brain size={14}/> Get AI Suggestions
                  </button>
                </div>

                {aiSugs && (
                  <div style={{ background:'#f0f9ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'14px' }}>
                    <div style={{ fontWeight:700, marginBottom:'10px', fontSize:'13px', color:'#1e40af', display:'flex', alignItems:'center', gap:'6px' }}><Bot size={16}/> AI Suggestions</div>

                    {aiSugs.warnings?.length > 0 && (
                      <div style={{ marginBottom:'10px' }}>
                        {aiSugs.warnings.map((w,i) => (
                          <div key={i} style={{ background:'#fef2f2', color:'#991b1b', padding:'7px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:600, marginBottom:'4px' }}>
                            {w}
                          </div>
                        ))}
                      </div>
                    )}

                    {aiSugs.possibleConditions?.length > 0 && (
                      <div style={{ marginBottom:'8px' }}>
                        <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', marginBottom:'4px' }}>POSSIBLE CONDITIONS</div>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {aiSugs.possibleConditions.map((c,i) => (
                            <span key={i} style={{ background:'#dbeafe', color:'#1e40af', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiSugs.recommendedTests?.length > 0 && (
                      <div style={{ marginBottom:'8px' }}>
                        <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', marginBottom:'4px' }}>RECOMMENDED TESTS</div>
                        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                          {aiSugs.recommendedTests.map((t,i) => (
                            <span key={i} style={{ background:'#f5f3ff', color:'#5b21b6', padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiSugs.medicineSuggestions?.length > 0 && (
                      <div>
                        <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', marginBottom:'6px' }}>SUGGESTED MEDICINES (click to add)</div>
                        {aiSugs.medicineSuggestions.map((m,i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', borderRadius:'7px', padding:'8px 10px', marginBottom:'5px', border:'1px solid #e2e8f0' }}>
                            <div>
                              <div style={{ fontWeight:600, fontSize:'13px' }}>{m.name}</div>
                              <div style={{ fontSize:'11px', color:'#6b7280' }}>{m.note}
                                {m.caution && <span style={{ color:'#f59e0b', marginLeft:'6px', display:'flex', alignItems:'center', gap:'3px' }}><AlertTriangle size={10}/> {m.caution}</span>}
                              </div>
                            </div>
                            <button onClick={() => addSuggestedMed(m)} className="btn btn-success btn-sm">+ Add</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Medicines */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                    <label style={{ marginBottom:0 }}>Medicines *</label>
                    <button onClick={addMed} className="btn btn-outline btn-sm"><Plus size={12}/> Add</button>
                  </div>
                  {form.medicines.map((m, i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:'8px', marginBottom:'8px', alignItems:'center' }}>
                      <input placeholder="Medicine name" value={m.name} onChange={e=>updateMed(i,'name',e.target.value)}/>
                      <input placeholder="Dosage" value={m.dosage} onChange={e=>updateMed(i,'dosage',e.target.value)}/>
                      <input placeholder="Duration" value={m.duration} onChange={e=>updateMed(i,'duration',e.target.value)}/>
                      <input placeholder="Notes" value={m.notes} onChange={e=>updateMed(i,'notes',e.target.value)}/>
                      {form.medicines.length > 1 && (
                        <button onClick={()=>removeMed(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444' }}><X size={16}/></button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div>
                  <label>Instructions / Advice</label>
                  <textarea rows={2} placeholder="Take medicines after food, rest, drink plenty of water..." value={form.instructions}
                    onChange={e=>setForm({...form,instructions:e.target.value})}/>
                </div>

                {/* Follow-up */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div>
                    <label>Follow-up Date</label>
                    <input type="date" min={new Date().toISOString().slice(0,10)} value={form.followUpDate}
                      onChange={e=>setForm({...form,followUpDate:e.target.value})}/>
                  </div>
                  <div>
                    <label>Follow-up Notes</label>
                    <input placeholder="Review blood report, etc." value={form.followUpNotes}
                      onChange={e=>setForm({...form,followUpNotes:e.target.value})}/>
                  </div>
                </div>

                {/* Doctor notes */}
                <div>
                  <label>Internal Doctor Notes</label>
                  <textarea rows={2} placeholder="Internal notes (not sent to patient)" value={form.doctorNotes}
                    onChange={e=>setForm({...form,doctorNotes:e.target.value})}/>
                </div>

                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={() => setSelected(null)} className="btn btn-outline" style={{ flex:1 }}>Cancel</button>
                  <button onClick={submit} className="btn btn-primary" style={{ flex:2 }} disabled={saving}>
                    {saving ? <><div className="spinner" style={{ width:'16px',height:'16px' }}/> Sending…</> : <><Save size={16}/> Issue &amp; Email Prescription</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
