// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

// Context for managing authentication state and actions.
export const AuthContext = createContext();

// Custom hook to easily access the AuthContext.
// Returns the authentication context value.
export function useAuth() {
  return useContext(AuthContext);
}

// Provides authentication context to its children.
// Manages the current user state and authentication functions.
// Props:
//   children: The child components to be wrapped by the provider.
export function AuthProvider({ children }) {
  // Stores the currently authenticated user object or null.
  const [currentUser, setCurrentUser] = useState(null);
  // Indicates if the initial auth state is being determined.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener.');
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        console.log('[AuthContext] User signed in:', user.uid, user.email, 'Verified:', user.emailVerified);
      } else {
        console.log('[AuthContext] User signed out.');
      }
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('[AuthContext] Cleaning up auth state listener.');
      unsubscribe();
    };
  }, []);

  // Signs out the current user.
  // Returns a Promise.
  const logout = () => {
    console.log('[AuthContext] Attempting to logout user.');
    return signOut(auth);
  };

  // Creates a new user account with email and password.
  // Parameters:
  //   email: The user's email.
  //   password: The user's password.
  // Returns a Firebase user credential object.
  const signUp = (email, password) => {
    console.log(`[AuthContext] Attempting to sign up user with email: ${email}`);
    return createUserWithEmailAndPassword(auth, email, password);
  };
  
  // Updates the current user's email in Firebase Authentication and sends a verification email to the new address.
  // Parameters:
  //   newEmail: The new email address.
  // Returns a Promise.
  const updateUserEmailInAuth = async (newEmail) => {
    if (!currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update email for user ${currentUser.uid} to ${newEmail}`);
    await updateEmail(currentUser, newEmail);
    // After updating the email, send a verification email to the new address.
    // updateEmail itself handles setting the new email (unverified) in the auth backend.
    await sendEmailVerification(currentUser);
    console.log(`[AuthContext] Verification email sent to new address: ${newEmail}`);
  };

  // Updates the current user's password in Firebase Authentication.
  // Parameters:
  //   newPassword: The new password.
  // Returns a Promise.
  const updateUserPasswordInAuth = (newPassword) => {
    if (!currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update password for user ${currentUser.uid}`);
    return updatePassword(currentUser, newPassword);
  };

  // Re-authenticates the current user with their password.
  // Parameters:
  //   password: The user's current password.
  // Returns a Promise.
  const reauthenticateUser = (password) => {
    if (!currentUser) throw new Error("No user is currently signed in.");
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    return reauthenticateWithCredential(currentUser, credential);
  };

  const value = {
    currentUser,
    loading,
    logout,
    signUp,
    updateUserEmailInAuth,
    updateUserPasswordInAuth,
    reauthenticateUser,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
