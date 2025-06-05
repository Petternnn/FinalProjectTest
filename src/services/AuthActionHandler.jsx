import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';

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
            
            // Optionally, check the action code first to get user's email if needed for logging
            // const info = await checkActionCode(auth, actionCode);
            // console.log('[AuthActionHandler] Action code info for email:', info.data.email);

            await applyActionCode(auth, actionCode); // This marks email as verified in Firebase Auth

            // NOW, update Firestore
            if (auth.currentUser) { // User should be signed in (or just became signed in by this action)
              const userDocRef = doc(db, 'users', auth.currentUser.uid);
              try {
                await updateDoc(userDocRef, {
                  emailVerified: true,
                  updatedAt: serverTimestamp() // Good practice to update timestamp
                });
                console.log('[AuthActionHandler] Firestore user document updated for email verification for UID:', auth.currentUser.uid);
              } catch (firestoreError) {
                console.error('[AuthActionHandler] Failed to update Firestore document for email verification:', firestoreError);
                // Decide if this should be a user-facing error.
                // For now, the primary success is Auth verification.
              }
            } else {
              // This might happen if the user verified on a different browser/device where they aren't logged in.
              // Or if the action code itself doesn't auto-log in the user.
              // In this case, AuthContext on their primary device will eventually sync when they user.reload().
              console.warn('[AuthActionHandler] auth.currentUser is null after applying email verification code. Firestore document not updated immediately by handler.');
              // One strategy here could be to extract the email from `info` (if you uncomment checkActionCode)
              // and then do a query for the user by email to update their doc, but that's more complex.
              // For now, we rely on AuthContext's sync.
            }

            setMessage('Your email address has been successfully verified! You can now log in or continue.');
            setSuccess(true);
            setError('');
            console.log('[AuthActionHandler] Email verification successful in Firebase Auth.');
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