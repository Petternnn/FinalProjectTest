// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Component: ProtectedRoute
// Description: A route guard component. If the user is not authenticated,
// it redirects them to the login page. Otherwise, it renders the child components.
// Props:
//   children (React.ReactNode): The child components to render if authenticated.
// Returns (React.ReactElement): Either the child components or a Navigate component to redirect.
export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth(); // Use loading state from AuthContext

  console.log('[ProtectedRoute] Checking auth status. CurrentUser:', currentUser, 'Loading:', loading);

  
   // If authentication state is still loading, don't render anything yet or show a loader.
   // prevents a flash of the login page before the auth state is resolved.
  
  if (loading) {
    console.log('[ProtectedRoute] Auth state loading, rendering null (or a loader).');
    // return a loading spinner component here later
    return null; 
  }

  if (!currentUser) {
    console.log('[ProtectedRoute] No current user. Redirecting to /login.');
    return <Navigate to="/login" replace />;
  }

  // Require email verification
  if (!currentUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  console.log('[ProtectedRoute] User authenticated. Rendering protected content for user:', currentUser.uid);
  return children;
}
