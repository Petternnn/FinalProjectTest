// src/pages/Login.jsx
import { useState, useRef } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Login.module.css';
import { useLoginValidation } from '../../hooks/useLoginValidation'; // Import the new hook
import logoImage from '../../assets/logo.png';

// Component: Login
// Description: Component for user login. Handles email/password authentication.

export default function Login() {
  const navigate = useNavigate();
  const { validate, errors: validationErrors } = useLoginValidation(); // Use the hook

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [submitError, setSubmitError] = useState(''); // For Firebase/general errors
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (submitError) setSubmitError('');
  };

  const handleLoginSubmit = async () => {
    setSubmitError('');

    if (!validate(formData)) {
      console.warn('[Login] Validation failed by hook:', validationErrors);
      // validationErrors state is already updated by the hook
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log('[Login] User signed in successfully. Navigating to dashboard.');
      navigate('/create');
    } catch (error) {
      console.error('[Login] Firebase authentication error:', error);
      let userFriendlyError = 'Invalid email or password. Please try again.';
      setSubmitError(userFriendlyError);
    } finally {
      setLoading(false);
    }
  };


  const handleFormEventSubmit = async (e) => {
    e.preventDefault();
    await handleLoginSubmit();
  };

  return (
    <div className={styles.container}>
      <img 
        src={logoImage}
        alt="Company Logo"
        className={styles.logo}
        draggable="false"
      />
      <form onSubmit={handleFormEventSubmit} className={styles.form}>
      
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
          />
          {validationErrors.password && <p className={styles.error}>{validationErrors.password}</p>}
        </div>

        {/* Display general submission errors (e.g., from Firebase) */}
        {submitError && <p className={styles.error}>{submitError}</p>}

        <button
          type="submit"
          className={`${styles.button} ${loading ? styles.disabled : ''}`}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
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
