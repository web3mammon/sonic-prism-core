import { Navigate } from 'react-router-dom';

// Legacy /auth route - redirect to /login
export default function Auth() {
  return <Navigate to="/login" replace />;
}
