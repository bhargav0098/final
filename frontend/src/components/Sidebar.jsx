import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Settings, Shield, TrendingUp, Tv2, FileText, Pill, Building2, Crown, Stethoscope, Thermometer, Circle,
  LayoutDashboard, Calendar, Activity, UserCog, Users, BarChart3, PlusCircle, ClipboardList, User, LogOut
} from 'lucide-react';

const NAV = {
  admin: [
    { to:'/admin',              icon:LayoutDashboard, label:'Dashboard'        },
    { to:'/admin/users',        icon:Shield,          label:'User Management'  },
    { to:'/live-queue',         icon:Tv2,             label:'Live Queue'       },
    { to:'/admin/appointments', icon:Calendar,        label:'Appointments'     },
    { to:'/admin/capacity',     icon:Activity,        label:'Capacity'         },
    { to:'/admin/doctors',      icon:UserCog,         label:'Doctors'          },
    { to:'/admin/patients',     icon:Users,           label:'Patients'         },
    { to:'/admin/analytics',    icon:TrendingUp,      label:'Analytics'        },
    { to:'/admin/queue',        icon:BarChart3,       label:'Queue Overview'   },
    { to:'/edit-profile',       icon:Settings,        label:'My Settings'      },
  ],
  doctor: [
    { to:'/doctor',              icon:LayoutDashboard, label:'Dashboard'        },
    { to:'/doctor/appointments', icon:Calendar,        label:'Patient Queue'    },
    { to:'/live-queue',          icon:Tv2,             label:'Live Queue'       },
    { to:'/doctor/prescriptions',icon:Pill,            label:'Prescriptions'    },
    { to:'/doctor/analytics',    icon:BarChart3,       label:'Analytics'        },
    { to:'/edit-profile',        icon:User,            label:'Edit Profile'     },
  ],
  patient: [
    { to:'/patient',          icon:LayoutDashboard, label:'Dashboard'        },
    { to:'/book-appointment', icon:PlusCircle,      label:'Book Appointment' },
    { to:'/my-appointments',  icon:ClipboardList,   label:'My Appointments'  },
    { to:'/live-queue',       icon:Tv2,             label:'My Queue'         },
    { to:'/prescriptions',    icon:Pill,            label:'Prescriptions'    },
    { to:'/edit-profile',     icon:User,            label:'Edit Profile'     },
  ],
};

const ROLE_COLORS = { admin:'#7c3aed', doctor:'#0891b2', patient:'#059669' };
const ROLE_ICONS  = { admin: Crown, doctor: Stethoscope, patient: Thermometer };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const loc  = useLocation();
  const nav  = useNavigate();
  const links = NAV[user?.role] || [];
  const color = ROLE_COLORS[user?.role] || '#3b82f6';

  const isActive = (to) => {
    if (to === '/admin') return loc.pathname === '/admin';
    if (to === '/doctor') return loc.pathname === '/doctor';
    if (to === '/patient') return loc.pathname === '/patient';
    return loc.pathname.startsWith(to);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px',
            background:`linear-gradient(135deg,${color},${color}99)`,
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <Building2 size={20}/>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:'15px', color:'#1e3a8a' }}>MediQueueAI</div>
            <div style={{ fontSize:'10px', color:'#9ca3af', display:'flex', alignItems:'center', gap:'4px' }}>
              {(() => { const Icon = ROLE_ICONS[user?.role]; return Icon ? <Icon size={10}/> : null; })()} 
              {user?.role?.charAt(0).toUpperCase()+user?.role?.slice(1)} Portal
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'8px', flex:1, overflowY:'auto' }}>
        <nav className="sidebar-nav">
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className={isActive(to) ? 'active' : ''}>
              <Icon size={16}/>{label}
              {label.includes('Queue') && <Circle size={6} fill="#ef4444" stroke="none" style={{ marginLeft:'auto' }}/>}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ padding:'12px', borderTop:'1px solid #f1f5f9' }}>
        <Link to="/edit-profile" style={{ textDecoration:'none' }}>
          <div style={{
            display:'flex', alignItems:'center', gap:'9px', padding:'10px',
            background:'#f8fafc', borderRadius:'10px', marginBottom:'10px', cursor:'pointer',
            transition:'background .15s',
          }}
            onMouseOver={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseOut={e  => e.currentTarget.style.background = '#f8fafc'}>
            <div style={{
              width:'34px', height:'34px', borderRadius:'50%',
              background:`linear-gradient(135deg,${color},${color}99)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:700, fontSize:'15px', flexShrink:0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:'12px', color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize:'10px', color:'#9ca3af' }}>
                {user?.specialization || user?.email?.split('@')[0]}
              </div>
            </div>
            <User size={12} color="#9ca3af"/>
          </div>
        </Link>
        <button onClick={() => { logout(); nav('/login'); }}
          className="btn btn-outline" style={{ width:'100%', justifyContent:'center', fontSize:'13px' }}>
          <LogOut size={14}/> Logout
        </button>
      </div>
    </div>
  );
}
