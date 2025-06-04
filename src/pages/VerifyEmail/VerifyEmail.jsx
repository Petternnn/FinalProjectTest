import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../../services/firebaseConfig";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext"; // Import useAuth
import styles from "./VerifyEmail.module.css";

// VerifyEmail
// Description: Page for users to verify their email address.
// Displays instructions, allows resending verification email, and polls for verification status.
const VerifyEmail = () => {
  const { currentUser, loading: authLoading, updateUserContext } = useAuth(); // Use context
  const navigate = useNavigate();

  // Local state for UI feedback (e.g., "Resending email...")
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState(null);
  const [loadingResend, setLoadingResend] = useState(false);
  // Local state to manage the "Verified! Redirecting..." message visibility
  const [isVerifiedAndRedirecting, setIsVerifiedAndRedirecting] = useState(false);

  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (authLoading) {
      console.log('[VerifyEmail] AuthContext is loading. Waiting...');
      return;
    }

    // If AuthContext says user is not logged in, redirect to login
    if (!currentUser) {
      console.log('[VerifyEmail] No user in AuthContext. Redirecting to /login.');
      navigate('/login');
      return;
    }

    // If AuthContext says email is verified
    if (currentUser.emailVerified) {
      console.log('[VerifyEmail] Email is verified (per AuthContext). Setting up redirect to /create.');
      setIsVerifiedAndRedirecting(true);
      const timer = setTimeout(() => {
        console.log('[VerifyEmail] Navigating to /create.');
        navigate('/create'); // Or your desired post-verification page
      }, 1500);
      return () => clearTimeout(timer); // Cleanup timer
    }

    // If email is not verified according to AuthContext, start polling
    // We use auth.currentUser for the reload capability.
    console.log('[VerifyEmail] Email not verified in AuthContext. Setting up polling.');
    const interval = setInterval(async () => {
      const latestFirebaseAuthUser = auth.currentUser;
      if (latestFirebaseAuthUser) {
        try {
          await latestFirebaseAuthUser.reload();
          if (latestFirebaseAuthUser.emailVerified) {
            console.log('[VerifyEmail] Polling: Firebase Auth user email is NOW verified.');
            clearInterval(interval);
            // IMPORTANT: Update the AuthContext so ProtectedRoute and other components know.
            if (updateUserContext) {
              updateUserContext({
                emailVerified: true,
                // It's good practice to also update other auth-related fields
                // that might change on reload, if your context uses them.
                // For example, if displayName or photoURL could be updated by another process.
                displayName: latestFirebaseAuthUser.displayName,
                photoURL: latestFirebaseAuthUser.photoURL,
              });
            }
            // The component will re-render due to currentUser change in context,
            // and the (currentUser.emailVerified) block above will handle the redirect.
            // No need to call navigate() directly here.
          } else {
            // console.log('[VerifyEmail] Polling: Firebase Auth user email still not verified.');
          }
        } catch (reloadError) {
          console.error('[VerifyEmail] Error reloading user during poll:', reloadError);
          // Consider stopping polling if reload consistently fails
        }
      } else {
        console.log('[VerifyEmail] Polling: No Firebase Auth user found (user signed out). Clearing interval.');
        clearInterval(interval);
        // If context also confirms no user, navigate to login
        if (!currentUser) navigate('/login');
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      console.log('[VerifyEmail] Component unmounting. Clearing verification check interval.');
      clearInterval(interval);
    };
  }, [currentUser, authLoading, navigate, updateUserContext]); // Dependencies

  const handleResendVerification = async () => {
    setError(null);
    setEmailSent(false);

    // Use auth.currentUser for the resend action, as it's the direct SDK object
    const firebaseAuthUserToResend = auth.currentUser;

    if (!firebaseAuthUserToResend) {
      setError("You are not signed in. Please login to resend verification.");
      console.warn('[VerifyEmail] Resend failed: No Firebase Auth user.');
      return;
    }

    setLoadingResend(true);
    console.log('[VerifyEmail] Attempting to resend verification email for user:', firebaseAuthUserToResend.email);
    try {
      await sendEmailVerification(firebaseAuthUserToResend);
      console.log('[VerifyEmail] Verification email resent successfully to:', firebaseAuthUserToResend.email);
      setEmailSent(true);
    } catch (err) {
      console.error("[VerifyEmail] Error resending verification email:", err);
      setError("Error re-sending verification email. Please try again later.");
    } finally {
      setLoadingResend(false);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Loading user information...</p>
      </div>
    );
  }

  if (isVerifiedAndRedirecting) {
    return (
      <div className={styles.container}>
        <div className={styles.contentBox}>
          <h1 className={styles.title}>Email Verified! 🎉</h1>
          <p className={styles.message}>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // If not loading, and not verified (and not yet redirecting)
  return (
    <div className={styles.container}>
      <div className={styles.contentBox}>
        <h2 className={styles.title}>Verify Your Email Address</h2>
        <p className={styles.message}>
          A verification email has been sent to <strong>{currentUser?.email || 'your email'}</strong>.
          Please check your inbox (and spam folder) and click the link to verify your account.
        </p>
        <p className={styles.message}>
          If you haven't received the email or it has expired, you can request a new one.
        </p>
        <div className={styles.buttonContainer}>
          <button
            className={styles.button}
            type="button"
            onClick={handleResendVerification}
            disabled={loadingResend}
          >
            {loadingResend ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <Link to="/login" className={styles.secondaryButton}>
            Go to Login
          </Link>
        </div>
        {emailSent && (
          <p className={styles.successMessage}>
            A new verification email has been sent. Please check your inbox.
          </p>
        )}
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

export default VerifyEmail;
