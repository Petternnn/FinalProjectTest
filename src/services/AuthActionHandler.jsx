import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Define styles for this component (Inline exception for the styles)
const actionStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    padding: '2rem',
    textAlign: 'center',
    fontFamily: 'sans-serif',
    color: 'var(--color-text)',
  },
  contentBox: {
    padding: '2rem',
    border: '1px solid #eee',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-sm)',
    backgroundColor: '#fff',
    maxWidth: '500px',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
  },
  message: {
    fontSize: '1rem',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  button: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: 'var(--border-radius)',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '1rem',
    textDecoration: 'none', // For Link component
  },
  errorMessage: {
    color: 'red',
    marginTop: '1rem',
  },
  successMessage: {
    color: 'green',
    marginTop: '1rem',
  }
};

//  AuthActionHandler
// Description: Handles Firebase authentication actions like email verification
// triggered from a link (in email).
export default function AuthActionHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  // State: message
  // Feedback message to display to the user.
  const [message, setMessage] = useState('Processing your request...');

  // State: error
  // Stores any error message.
  const [error, setError] = useState('');

  // State: success
  // Indicates if the action was successful.
  const [success, setSuccess] = useState(false);

  // State: loading
  // Indicates if the action code is being processed.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');

    console.log('[AuthActionHandler] Mounted. Mode:', mode, 'Action Code:', actionCode);

    if (!actionCode || !mode) {
      setError('Invalid request. Missing action code or mode.');
      setMessage('');
      setLoading(false);
      console.warn('[AuthActionHandler] Invalid request: Missing action code or mode.');
      return;
    }

    const handleAction = async () => {
      try {
        switch (mode) {
          case 'verifyEmail':
            console.log('[AuthActionHandler] Verifying email with action code:', actionCode);
            // optionally check the action code first for info like email
            // const info = await checkActionCode(auth, actionCode);
            // console.log('[AuthActionHandler] Action code info:', info);
            await applyActionCode(auth, actionCode);
            setMessage('Your email address has been successfully verified! You can now log in.');
            setSuccess(true);
            setError('');
            console.log('[AuthActionHandler] Email verification successful.');
            break;
          // TODO: Handle other modes like 'resetPassword' or 'recoverEmail' if needed
          default:
            setError('Unsupported action mode.');
            setMessage('');
            console.warn('[AuthActionHandler] Unsupported action mode:', mode);
        }
      } catch (err) {
        console.error('[AuthActionHandler] Error applying action code:', err);
        setError(`Error: ${err.message || 'Failed to process your request. The link may be invalid or expired.'}`);
        setMessage('');
      } finally {
        setLoading(false);
      }
    };

    handleAction();
  }, [location.search]);

  if (loading) {
    return (
      <div style={actionStyles.container}>
        <div style={actionStyles.contentBox}>
          <p style={actionStyles.message}>Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={actionStyles.container}>
      <div style={actionStyles.contentBox}>
        <h1 style={actionStyles.title}>Email Verification</h1>
        {message && <p style={success ? actionStyles.successMessage : actionStyles.message}>{message}</p>}
        {error && <p style={actionStyles.errorMessage}>{error}</p>}
        {success && (
          <Link to="/login" style={actionStyles.button}>
            Proceed to Login
          </Link>
        )}
        {!success && !loading && (
           <Link to="/login" style={actionStyles.button}>
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
} 