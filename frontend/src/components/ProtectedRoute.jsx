import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner"/>
    </div>
  );
  if (!user) return <Navigate to="/login" replace/>;
  // If role specified, check it. If no role specified, any logged-in user can access.
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace/>;
  return children;
}
