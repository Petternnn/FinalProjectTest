import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ensure this path is correct

export default function RootRedirect() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // You might want to render a global loading spinner here
    return null;
  }

  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/create" replace />;
  }
  // If not authenticated, or authenticated but email not verified and they land on "/",
  // send them to login. /verify-email will be handled by ProtectedRoute on specific routes.
  return <Navigate to="/login" replace />;
} 