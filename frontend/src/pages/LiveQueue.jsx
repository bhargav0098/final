import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { RefreshCw, Clock, AlertTriangle, Users, Activity, Zap, AlertCircle, Info, Bot, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const SEV_COLORS = { LOW:'#10b981', MEDIUM:'#3b82f6', HIGH:'#f59e0b', EMERGENCY:'#ef4444' };
const SEV_BG     = { LOW:'#f0fdf4', MEDIUM:'#eff6ff', HIGH:'#fffbeb', EMERGENCY:'#fef2f2' };

const STAT_COLORS = {
  pending:'#f59e0b', confirmed:'#3b82f6', rescheduled_by_ai:'#8b5cf6',
  rescheduled_by_doctor:'#7c3aed',
};

export default function LiveQueue({ socket }) {
  const { user } = useAuth();
  const [queue,   setQueue]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [date,    setDate]    = useState(new Date().toISOString().slice(0,10));
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filterSev, setFilterSev]   = useState('all');
  const [stats,   setStats]   = useState({ total:0, emergency:0, high:0, medium:0, low:0 });

  const loadQueue = useCallback(async () => {
    try {
      let data;
      if (user.role === 'admin') {
        const res = await axios.get(`/queue/hospital?date=${date}`);
        data = res.data;
      } else if (user.role === 'doctor') {
        const res = await axios.get(`/queue/doctor/${user._id}?date=${date}`);
        data = res.data;
      } else {
        const res = await axios.get(`/queue/patient/my?date=${date}`);
        data = res.data;
      }
      setQueue(data);
      setStats({
        total:     data.length,
        emergency: data.filter(a=>a.priority_level==='EMERGENCY').length,
        high:      data.filter(a=>a.priority_level==='HIGH').length,
        medium:    data.filter(a=>a.priority_level==='MEDIUM').length,
        low:       data.filter(a=>a.priority_level==='LOW').length,
      });
      setLastUpdate(new Date());
    } catch(err) {
      console.error('Queue load error:', err.message);
    }
    setLoading(false);
  }, [date, user]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_live_queue', { date });
    if (user.role === 'doctor') socket.emit('join_doctor', user._id);
    if (user.role === 'admin')  socket.emit('join_admin');

    const handlers = {
      queue_updated:      () => loadQueue(),
      queue_reordered:    () => loadQueue(),
      hospital_queue_update: (q) => { setQueue(q); setLastUpdate(new Date()); },
      emergency_inserted: () => loadQueue(),
      new_appointment:    () => loadQueue(),
      no_show_detected:   () => loadQueue(),
    };
    for (const [ev, fn] of Object.entries(handlers)) socket.on(ev, fn);
    return () => { for (const ev of Object.keys(handlers)) socket.off(ev); };
  }, [socket, date, loadQueue]);

  const visible = filterSev === 'all' ? queue : queue.filter(a => a.priority_level === filterSev);

  const priorityIcon = (level) => {
    if (level === 'EMERGENCY') return <AlertCircle size={14} style={{ color:'#ef4444' }}/>;
    if (level === 'HIGH')      return <AlertTriangle size={14} style={{ color:'#f59e0b' }}/>;
    if (level === 'MEDIUM')    return <Info size={14} style={{ color:'#3b82f6' }}/>;
    return <CheckCircle size={14} style={{ color:'#10b981' }}/>;
  };

  return (
    <div className="main-layout">
      <Sidebar/>
      <div className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h1>Live Queue</h1>
            <p>Real-time patient queue • Auto-updates via WebSocket {lastUpdate && `• Last: ${lastUpdate.toLocaleTimeString()}`}</p>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{ width:'160px', padding:'8px 12px', border:'2px solid rgba(255,255,255,.3)', borderRadius:'8px', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:'13px' }}/>
            <button onClick={loadQueue} className="btn" style={{ background:'rgba(255,255,255,.2)', color:'#fff', border:'1px solid rgba(255,255,255,.3)' }}>
              <RefreshCw size={14}/> Refresh
            </button>
            {/* Live indicator */}
            <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(16,185,129,.2)', padding:'6px 12px', borderRadius:'20px', border:'1px solid rgba(16,185,129,.4)' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#10b981', animation:'pulse 1.5s infinite' }}/>
              <span style={{ color:'#fff', fontSize:'12px', fontWeight:600 }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom:'20px' }}>
          {[
            { label:'Total in Queue', value:stats.total,     color:'#3b82f6', bg:'#eff6ff',  icon:Users },
            { label:'Emergency',   value:stats.emergency, color:'#ef4444', bg:'#fef2f2',  icon:AlertCircle },
            { label:'High',        value:stats.high,      color:'#f59e0b', bg:'#fffbeb',  icon:AlertTriangle },
            { label:'Medium/Low',  value:stats.medium+stats.low, color:'#10b981', bg:'#f0fdf4', icon:Info },
          ].map((s,i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background:s.bg }}><s.icon size={20} color={s.color}/></div>
              <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div></div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'18px', flexWrap:'wrap' }}>
          {['all','EMERGENCY','HIGH','MEDIUM','LOW'].map(f => (
            <button key={f} onClick={()=>setFilterSev(f)}
              style={{ padding:'7px 16px', border:'none', borderRadius:'20px', cursor:'pointer', fontSize:'12px', fontWeight:700, transition:'all .18s',
                background: filterSev===f ? (SEV_COLORS[f]||'#1e3a8a') : '#fff',
                color: filterSev===f ? '#fff' : '#6b7280',
                boxShadow:'0 1px 3px rgba(0,0,0,.07)',
              }}>
              {f === 'all' ? `All (${queue.length})` : <><span style={{display: 'inline-flex', alignItems: 'center', gap: '5px'}}>{priorityIcon(f)} {f}</span> ({queue.filter(a=>a.priority_level===f).length})</>}
            </button>
          ))}
        </div>

        {/* Emergency alert */}
        {stats.emergency > 0 && (
          <div className="emergency-flash" style={{ borderRadius:'12px', padding:'14px 20px', marginBottom:'18px', border:'2px solid #ef4444', display:'flex', gap:'12px', alignItems:'center' }}>
            <AlertTriangle size={22} color="#ef4444"/>
            <div>
              <div style={{ fontWeight:800, color:'#991b1b', fontSize:'15px' }}>
                {stats.emergency} EMERGENCY Patient(s) in Queue
              </div>
              <div style={{ fontSize:'12px', color:'#dc2626', marginTop:'2px' }}>
                These patients require IMMEDIATE attention. They have been placed at the top of the queue.
              </div>
            </div>
          </div>
        )}

        {/* Queue table */}
        {loading ? (
          <div className="loading"><div className="spinner"/></div>
        ) : visible.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px', color:'#9ca3af' }}>
            <Users size={48} style={{ marginBottom:'12px', opacity:.3 }}/>
            <div style={{ fontWeight:600, fontSize:'16px' }}>Queue is empty for {date}</div>
            <div style={{ fontSize:'13px', marginTop:'4px' }}>No active appointments in queue</div>
          </div>
        ) : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontWeight:700 }}>Queue ({visible.length} patients)</h3>
              <span style={{ fontSize:'12px', color:'#9ca3af' }}>Auto-refreshes every 5 min</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    {user.role !== 'doctor' && <th>Doctor</th>}
                    <th>Symptoms</th>
                    <th>AI Severity</th>
                    <th>Time</th>
                    <th>Wait</th>
                    <th>ETA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...visible].sort((a,b)=>{
                    const order = { EMERGENCY:0, HIGH:1, MEDIUM:2, LOW:3 };
                    const oa = order[a.priority_level]??4;
                    const ob = order[b.priority_level]??4;
                    if (oa !== ob) return oa - ob;
                    return (a.queuePosition||99) - (b.queuePosition||99);
                  }).map((a, idx) => (
                    <tr key={a._id} style={{ background: a.priority_level==='EMERGENCY' ? '#fff5f5' : idx%2===0 ? '#fff' : '#fafafa' }}>
                      <td>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%',
                          background: SEV_COLORS[a.priority_level]||'#9ca3af',
                          color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:800, fontSize:'13px' }}>
                          {a.queuePosition || idx+1}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight:600 }}>{a.patient?.name||'—'}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af' }}>Age {a.patient?.age||'—'} · {a.patient?.gender||'—'}</div>
                      </td>
                      {user.role !== 'doctor' && (
                        <td>
                          <div style={{ fontWeight:600, fontSize:'13px' }}>Dr. {a.doctor?.name||'—'}</div>
                          <div style={{ fontSize:'11px', color:'#9ca3af' }}>{a.doctor?.specialization||'—'}</div>
                        </td>
                      )}
                      <td style={{ maxWidth:'200px' }}>
                        <div style={{ fontSize:'12px', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.reason?.slice(0,50)||'—'}
                        </div>
                        {a.triageResult?.detected_symptoms?.length > 0 && (
                          <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'2px' }}>
                            {a.triageResult.detected_symptoms.slice(0,2).join(', ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:SEV_COLORS[a.priority_level], flexShrink:0 }}/>
                          <span style={{
                            background: SEV_BG[a.priority_level], color:SEV_COLORS[a.priority_level],
                            padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700
                          }}>{priorityIcon(a.priority_level)} {a.priority_level}</span>
                        </div>
                        {a.triageResult?.confidence && (
                          <div style={{ fontSize:'10px', color:'#9ca3af', marginTop:'2px' }}>
                            {a.triageResult.confidence}% confidence
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize:'13px', fontWeight:600 }}>{a.time||'TBD'}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'12px', color:'#374151' }}>
                          <Clock size={12} color="#9ca3af"/>
                          {a.estimatedWaitMinutes > 0 ? `~${a.estimatedWaitMinutes} min` : '—'}
                        </div>
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:'12px', color:'#374151' }}>
                        {a.estimatedStartTime||'—'}
                      </td>
                      <td>
                        <span style={{
                          background: (STAT_COLORS[a.status]||'#9ca3af')+'22',
                          color: STAT_COLORS[a.status]||'#6b7280',
                          padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:600
                        }}>{a.status?.replace(/_/g,' ')}</span>
                        {a.ai_modified && <div style={{ fontSize:'10px', color:'#8b5cf6', marginTop:'2px', display:'flex', alignItems:'center', gap:'3px' }}><Bot size={10}/> AI adjusted</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </div>
  );
}
