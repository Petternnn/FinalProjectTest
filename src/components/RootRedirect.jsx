import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 

export default function RootRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // might want to render a  loading spinner here
    return null;
  }

  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/create" replace />;
  }
  // when not authenticated, or authenticated but email not verified and they land on "/",
  // send them to login. /verify-email will be handled by ProtectedRoute on specific routes.
  return <Navigate to="/login" replace />;
} 