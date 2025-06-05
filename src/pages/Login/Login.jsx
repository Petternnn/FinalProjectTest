// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css';
import { useLoginValidation } from '../../hooks/useLoginValidation';
import { useAuth } from '../../contexts/AuthContext';
import logoImage from '../../assets/logo.png';

// Component: Login
// Description: Component for user login. Handles email/password authentication.

export default function Login() {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { validate, errors: validationErrors } = useLoginValidation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[Login Page useEffect] Triggered. Auth Loading:', authLoading, 'CurrentUser:', currentUser);
    if (!authLoading && currentUser) {
      console.log('[Login Page useEffect] Auth loaded and currentUser exists. Email Verified:', currentUser.emailVerified);
      if (currentUser.emailVerified) {
        console.log('[Login] AuthContext updated. User is logged in and verified. Navigating to /create.');
        navigate('/create');
      } else {
        console.log('[Login] AuthContext updated. User is logged in but email NOT verified. Navigating to /verify-email.');
        navigate('/verify-email');
      }
    } else if (authLoading) {
      console.log('[Login Page useEffect] Still waiting for auth to load...');
    } else if (!currentUser) {
      console.log('[Login Page useEffect] Auth loaded, but no currentUser found.');
    }
  }, [currentUser, authLoading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (submitError) setSubmitError('');
  };

  const performLogin = async () => {
    setSubmitError('');

    if (!validate(formData)) {
      console.warn('[Login] Validation failed by hook:', validationErrors);
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log('[Login] Firebase signInWithEmailAndPassword successful. AuthContext will handle user update.');
    } catch (error) {
      console.error('[Login] Firebase authentication error:', error);
      let userFriendlyError = 'Invalid email or password. Please try again.';
      setSubmitError(userFriendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    performLogin();
  };

  if (!authLoading && currentUser && currentUser.emailVerified) {
    console.log('[Login] Render: User already logged in and verified, redirecting (fallback).');
    return null;
  }

  return (
    <div className={styles.container}>
      <img
        src={logoImage}
        alt="Company Logo"
        className={styles.logo}
        draggable="false"
      />
      <form onSubmit={handleSubmit} className={styles.form}>

        <h2 className={styles.title}>Login</h2>

        <div className={styles.formFieldGroup}>
          <label htmlFor="email" className={styles.label}>Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
          />
          {validationErrors.email && <p className={styles.error}>{validationErrors.email}</p>}
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="password" className={styles.label}>Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
          />
          {validationErrors.password && <p className={styles.error}>{validationErrors.password}</p>}
        </div>

        {submitError && <p className={styles.error}>{submitError}</p>}

        <button
          type="submit"
          className={`${styles.button} ${loading ? styles.disabled : ''}`}
          disabled={loading || authLoading}
        >
          {loading || authLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className={styles.signupText}>
        Don't have an account?{' '}
        <Link
          to="/signup"
          className={styles.signupLink}
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
