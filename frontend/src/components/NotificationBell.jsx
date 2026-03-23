import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, X, Check } from 'lucide-react';

const TYPE_COLOR = {
  emergency:'#ef4444', appointment_confirmed:'#10b981', appointment_booked:'#3b82f6',
  appointment_rejected:'#ef4444', appointment_cancelled:'#f59e0b', appointment_rescheduled:'#8b5cf6',
  no_show:'#6b7280', fatigue_alert:'#f97316', late_running:'#f59e0b',
  doctor_approved:'#10b981', login_alert:'#9ca3af', system:'#9ca3af', reminder:'#3b82f6',
};

export default function NotificationBell({ socket }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const { data } = await axios.get('/notifications');
      setNotifs(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (n) => { setNotifs(p => [n, ...p.slice(0, 29)]); setUnread(p => p + 1); };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  const markAll = async () => {
    await axios.put('/notifications/read-all');
    setUnread(0);
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ position:'relative', background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', borderRadius:'9px', padding:'9px', cursor:'pointer', display:'flex', alignItems:'center' }}>
        <Bell size={18} color="#fff"/>
        {unread > 0 && (
          <span style={{ position:'absolute', top:'-5px', right:'-5px', background:'#ef4444', color:'#fff', borderRadius:'50%', width:'18px', height:'18px', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position:'absolute', right:0, top:'46px', width:'340px', background:'#fff', borderRadius:'14px', boxShadow:'0 20px 50px rgba(0,0,0,.18)', border:'1px solid #e2e8f0', zIndex:1000, overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontWeight:700, fontSize:'14px' }}>
              Notifications {unread > 0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:'20px', padding:'2px 7px', fontSize:'10px', marginLeft:'5px' }}>{unread}</span>}
            </span>
            <div style={{ display:'flex', gap:'6px' }}>
              {unread > 0 && (
                <button onClick={markAll} style={{ background:'none', border:'none', cursor:'pointer', color:'#3b82f6', fontSize:'11px', display:'flex', alignItems:'center', gap:'3px' }}>
                  <Check size={11}/>Read all
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}><X size={14}/></button>
            </div>
          </div>
          <div style={{ maxHeight:'380px', overflowY:'auto' }}>
            {notifs.length === 0
              ? <div style={{ padding:'28px', textAlign:'center', color:'#9ca3af', fontSize:'13px' }}>No notifications</div>
              : notifs.map(n => (
                  <div key={n._id}
                    onClick={async () => { await axios.put(`/notifications/${n._id}/read`); setNotifs(p => p.map(x => x._id===n._id ? {...x,isRead:true} : x)); if (!n.isRead) setUnread(p => Math.max(0, p-1)); }}
                    style={{ padding:'12px 16px', borderBottom:'1px solid #f9fafb', background:n.isRead?'#fff':'#f0f9ff', cursor:'pointer', transition:'background .15s' }}>
                    <div style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
                      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:TYPE_COLOR[n.type]||'#9ca3af', flexShrink:0, marginTop:'5px' }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:'12px', color:'#111827' }}>{n.title}</div>
                        <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'1px', lineHeight:1.4 }}>{n.message}</div>
                        <div style={{ fontSize:'10px', color:'#d1d5db', marginTop:'3px' }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
