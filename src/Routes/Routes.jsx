import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from 'react-router-dom';

// Layout Component
import App from '../App'; //w serves as the root layout

// Page Components
import Login from '../pages/Login/Login';
import SignUp from '../pages/SignUp/SignUp';
import VerifyEmail from '../pages/VerifyEmail/VerifyEmail';
import AuthActionHandler from '../services/AuthActionHandler';
import Create from '../pages/Create/Create';
import QuizModules from '../pages/QuizModules/QuizModules';
import SettingsPage from '../pages/Settings/SettingsPage';

// Utility and Guard Components
import ProtectedRoute from './ProtectedRoute';
import RootRedirect from '../components/RootRedirect'; // Import the new RootRedirect component

// This component defines all application routes for the application.
export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {/* Index Route: Handles navigation from the root path */}
      <Route index element={<RootRedirect />} />

      {/* Public Routes */}
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<SignUp />} />
      <Route path="verify-email" element={<VerifyEmail />} />
      <Route path="auth-action" element={<AuthActionHandler />} />

      {/* Protected Routes */}
      <Route
        path="create"
        element={
          <ProtectedRoute>
            <Create />
          </ProtectedRoute>
        }
      />
      <Route
        path="quiz-modules"
        element={
          <ProtectedRoute>
            <QuizModules />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
     
      {/* Fallback for any other unmatched path under "/" */}
      <Route path="*" element={<Login />} />
    </Route>
  )
); 