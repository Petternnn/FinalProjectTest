// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

// Context for managing authentication state and actions.
export const AuthContext = createContext();

// Custom hook to access AuthContext.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provides authentication context.
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // True until initial auth check completes.
  const [firestoreUnsubscribe, setFirestoreUnsubscribe] = useState(() => null);

  useEffect(() => {
    console.log('[AuthContext] Setting up auth state listener.');

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (firestoreUnsubscribe) {
        console.log('[AuthContext] Cleaning up previous Firestore listener.');
        firestoreUnsubscribe();
        setFirestoreUnsubscribe(() => null);
      }

      if (user) {
        let reloadedUser = user;
        try {
          await user.reload(); // Refresh user state (e.g., emailVerified)
          reloadedUser = auth.currentUser || user;
          console.log('[AuthContext] User reloaded. UID:', reloadedUser.uid, 'Email Verified:', reloadedUser.emailVerified);
        } catch (reloadError) {
          console.warn('[AuthContext] Failed to reload user state upon auth change:', reloadError);
        }

        // Set initial currentUser with core auth data.
        setCurrentUser({
          uid: reloadedUser.uid,
          email: reloadedUser.email,
          emailVerified: reloadedUser.emailVerified,
          displayName: reloadedUser.displayName,
          photoURL: reloadedUser.photoURL,
          // Initialize other expected Firestore fields as undefined or null
          // firstname: undefined,
          // lastname: undefined,
          // profilePictureUrl: undefined,
        });
        setLoading(false);
        console.log('[AuthContext] Initial currentUser set. UID:', reloadedUser.uid, 'Verified:', reloadedUser.emailVerified);

        // Listen for Firestore updates to enrich currentUser.
        const userDocRef = doc(db, 'users', reloadedUser.uid);
        const unsubscribeFirestoreListener = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            console.log('[AuthContext] Firestore user data received, enriching currentUser:', docSnap.data());
            setCurrentUser(prevUser => ({
              ...prevUser,
              ...docSnap.data(),
              // Ensure core auth properties are not overwritten by stale Firestore data.
              uid: reloadedUser.uid,
              email: reloadedUser.email,
              emailVerified: reloadedUser.emailVerified,
              displayName: reloadedUser.displayName,
              photoURL: reloadedUser.photoURL,
            }));
          } else {
            console.warn('[AuthContext] No Firestore document found for user:', reloadedUser.uid);
          }
        }, (error) => {
          console.error("[AuthContext] Error listening to user document:", error);
        });
        setFirestoreUnsubscribe(() => unsubscribeFirestoreListener);

      } else {
        console.log('[AuthContext] User signed out.');
        setCurrentUser(null);
        setLoading(false);
      }
    });

    // Cleanup auth and Firestore listeners on unmount.
    return () => {
      console.log('[AuthContext] Cleaning up auth state listener.');
      unsubscribeAuth();
      if (firestoreUnsubscribe) {
        console.log('[AuthContext] Cleaning up Firestore listener on AuthProvider unmount.');
        firestoreUnsubscribe();
      }
    };
  }, []); // Empty dependency array is correct to run only on mount and unmount.

  const logout = () => {
    console.log('[AuthContext] Attempting to logout user.');
    return signOut(auth);
  };

  const signUp = (email, password) => {
    console.log(`[AuthContext] Attempting to sign up user with email: ${email}`);
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Updates user's email in Firebase Auth & sends verification email.
  const updateUserEmailInAuth = async (newEmail) => {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update email for user ${auth.currentUser.uid} to ${newEmail}`);
    await updateEmail(auth.currentUser, newEmail);
    await sendEmailVerification(auth.currentUser); // Send to new email
    console.log(`[AuthContext] Verification email sent to new address: ${newEmail}`);
  };

  // Updates user's password in Firebase Auth.
  const updateUserPasswordInAuth = (newPassword) => {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update password for user ${auth.currentUser.uid}`);
    return updatePassword(auth.currentUser, newPassword);
  };

  // Re-authenticates current user.
  const reauthenticateUser = (password) => {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return reauthenticateWithCredential(auth.currentUser, credential);
  };

  // Optimistically updates currentUser in context.
  // Firestore listener will eventually ensure consistency.
  const updateUserContext = (newUserData) => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null;
      const updatedUser = { ...prevUser, ...newUserData };
      console.log("[AuthContext] Context optimistically updated with new user data:", updatedUser);
      return updatedUser;
    });
  };

  const value = {
    currentUser,
    loading,
    logout,
    signUp,
    updateUserEmailInAuth,
    updateUserPasswordInAuth,
    reauthenticateUser,
    updateUserContext,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
