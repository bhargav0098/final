import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login               from './pages/Login';
import Register            from './pages/Register';
import AdminDashboard      from './pages/AdminDashboard';
import UserManagement      from './pages/UserManagement';
import DoctorDashboard     from './pages/DoctorDashboard';
import DoctorAppointments  from './pages/DoctorAppointments';
import PatientDashboard    from './pages/PatientDashboard';
import BookAppointment     from './pages/BookAppointment';
import MyAppointments      from './pages/MyAppointments';
import EditProfile         from './pages/EditProfile';
import LiveQueue           from './pages/LiveQueue';
import Prescriptions       from './pages/Prescriptions';
import DoctorPrescriptions from './pages/DoctorPrescriptions';
import ProtectedRoute      from './components/ProtectedRoute';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) { setSocket(null); return; }
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    s.on('connect', () => {
      s.emit('join', user._id);
      if (user.role === 'doctor') s.emit('join_doctor', user._id);
      if (user.role === 'admin')  s.emit('join_admin');
    });
    setSocket(s);
    return () => s.disconnect();
  }, [user?._id, user?.role]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f0f4f8' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'52px', marginBottom:'12px' }}>🏥</div>
        <div style={{ fontWeight:800, color:'#1e3a8a', fontSize:'18px' }}>MediQueueAI</div>
        <div style={{ marginTop:'14px', display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/"         element={user ? <Navigate to={`/${user.role}`} replace/> : <Navigate to="/login" replace/>}/>
      <Route path="/login"    element={!user ? <Login/> : <Navigate to={`/${user.role}`} replace/>}/>
      <Route path="/register" element={!user ? <Register/> : <Navigate to={`/${user.role}`} replace/>}/>

      {/* Admin */}
      <Route path="/admin"              element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/analytics"    element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/queue"        element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/capacity"     element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/doctors"      element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/patients"     element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/appointments" element={<ProtectedRoute role="admin"><AdminDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/admin/users"        element={<ProtectedRoute role="admin"><UserManagement socket={socket}/></ProtectedRoute>}/>

      {/* Doctor */}
      <Route path="/doctor"               element={<ProtectedRoute role="doctor"><DoctorDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/doctor/appointments"  element={<ProtectedRoute role="doctor"><DoctorAppointments socket={socket}/></ProtectedRoute>}/>
      <Route path="/doctor/analytics"     element={<ProtectedRoute role="doctor"><DoctorDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/doctor/prescriptions" element={<ProtectedRoute role="doctor"><DoctorPrescriptions/></ProtectedRoute>}/>

      {/* Patient */}
      <Route path="/patient"          element={<ProtectedRoute role="patient"><PatientDashboard socket={socket}/></ProtectedRoute>}/>
      <Route path="/book-appointment" element={<ProtectedRoute role="patient"><BookAppointment/></ProtectedRoute>}/>
      <Route path="/my-appointments"  element={<ProtectedRoute role="patient"><MyAppointments/></ProtectedRoute>}/>
      <Route path="/prescriptions"    element={<ProtectedRoute role="patient"><Prescriptions/></ProtectedRoute>}/>

      {/* Shared */}
      <Route path="/live-queue"   element={<ProtectedRoute><LiveQueue socket={socket}/></ProtectedRoute>}/>
      <Route path="/edit-profile" element={<ProtectedRoute><EditProfile/></ProtectedRoute>}/>

      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes/>
      </BrowserRouter>
    </AuthProvider>
  );
}
