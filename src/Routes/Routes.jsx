import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login/Login';
import SignUp from '../pages/SignUp/SignUp';
import VerifyEmail from '../pages/VerifyEmail/VerifyEmail';
import AuthActionHandler from '../services/AuthActionHandler';
import Create from '../pages/Create/Create'; 
import ProtectedRoute from './ProtectedRoute';
// import SettingsPage from '../pages/Settings/SettingsPage';
import QuizModules from '../pages/QuizModules/QuizModules';

// Component: AppRoutes
// This component defines all application routes for the application.
export default function AppRoutes() {
  console.log('[AppRoutes] Defining application routes.');
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth-action" element={<AuthActionHandler />} />

      {/* Protected Routes */}
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <Create/>
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/quiz-modules"
        element={
          <ProtectedRoute>
            <QuizModules />
          </ProtectedRoute>
        }
      />

      {/* redirect to /login for any other path */}
      <Route path="*" element={<Login />} />
    </Routes>
  );
} 