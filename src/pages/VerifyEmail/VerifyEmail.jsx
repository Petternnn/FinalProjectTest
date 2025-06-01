import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../../services/firebaseConfig";
import { sendEmailVerification } from "firebase/auth";
import styles from "./VerifyEmail.module.css";

// VerifyEmail
// Description: Page for users to verify their email address.
// Displays instructions, allows resending verification email, and polls for verification status.
const VerifyEmail = () => {
  const currentUser = auth.currentUser; // Get current user once at the top

  // State: emailVerified
  // Description: Tracks if the current user's email is verified.
  const [emailVerified, setEmailVerified] = useState(currentUser?.emailVerified || false);

  // State: emailSent
  // Description: Tracks if a new verification email has been sent.
  const [emailSent, setEmailSent] = useState(false);

  // State: error
  // Description: Stores any error message related to email verification.
  const [error, setError] = useState(null);

  // State: loadingResend
  // Description: Indicates if the resend verification email process is active.
  const [loadingResend, setLoadingResend] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[VerifyEmail] Component mounted. Current user:', currentUser?.uid, 'Email verified status:', currentUser?.emailVerified);

    if (!currentUser) {
      console.log('[VerifyEmail] No user signed in. Redirecting to /login.');
      navigate('/login');
      return;
    }

    if (currentUser.emailVerified) {
      console.log('[VerifyEmail] Email already verified. Redirecting to /dashboard.');
      setEmailVerified(true);
      setTimeout(() => navigate('/create'), 1500);
      return;
    }

    console.log('[VerifyEmail] Setting up interval to check email verification status.');
    const interval = setInterval(async () => {
      // crucial to get the latest user object before reloading
      // as the "currentUser" from the outer scope might be stale.
      const latestUser = auth.currentUser; 
      if (latestUser) {
        // console.log('[VerifyEmail] Interval: Checking verification status for user:', latestUser.uid);
        await latestUser.reload();
        // console.log('[VerifyEmail] Interval: User reloaded. New verification status:', latestUser.emailVerified);
        if (latestUser.emailVerified) {
          console.log('[VerifyEmail] Interval: Email verified! Clearing interval and redirecting to /create.');
          setEmailVerified(true);
          clearInterval(interval);
          navigate('/create');
        }
      } else {
        console.log('[VerifyEmail] Interval: User signed out or unavailable. Clearing interval then redirecting to /login.');
        clearInterval(interval);
        navigate('/login');
      }
    }, 5000);

    return () => {
      console.log('[VerifyEmail] Component unmounting. Clearing verification check interval.');
      clearInterval(interval);
    };
  }, [navigate, currentUser]); // Added currentUser to dependency array

  // Function: handleResendVerification
  // Description: Handles the request to resend the verification email.
  const handleResendVerification = async () => {
    setError(null);
    setEmailSent(false);
    setLoadingResend(true);
    console.log('[VerifyEmail] Attempting to resend verification email for user:', currentUser?.email);

    if (!currentUser) {
      const errMsg = "You are not signed in. Please login to resend verification.";
      console.warn('[VerifyEmail] Resend failed:', errMsg);
      setError(errMsg);
      setLoadingResend(false);
      return;
    }

    try {
      await sendEmailVerification(currentUser);
      console.log('[VerifyEmail] Verification email resent successfully to:', currentUser.email);
      setEmailSent(true);
    } catch (err) {
      console.error("[VerifyEmail] Error resending verification email:", err);
      setError("Error re-sending verification email. Please try again later or contact support if the issue persists.");
    } finally {
      setLoadingResend(false);
    }
  };

  // Display loading or redirect if user status is initially unknown or changes
  if (!currentUser && !emailVerified) { // Added !emailVerified to prevent flash if already verified and redirecting
    console.log('[VerifyEmail] Render: No current user, showing minimal content or redirecting soon.');
    // Later show a loading spinner or a message
    return <div className={styles.container}><p className={styles.loadingText}>Loading user information...</p></div>;
  }

  if (emailVerified) {
    return (
      <div className={styles.container}>
        <div className={styles.contentBox}>
          <h1 className={styles.title}>Email Verified! 🎉</h1>
          <p className={styles.message}>Redirecting to your create page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentBox}>
        <h2 className={styles.title}>Verify Your Email Address</h2>
        <p className={styles.message}>
          A verification email has been sent to <strong>{auth.currentUser?.email || 'your email'}</strong>.
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
