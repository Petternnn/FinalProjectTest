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

// Custom hook to easily access the AuthContext.
// Returns the authentication context value.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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
        let reloadedUser = user; // Use a new variable for the reloaded user
        try {
          // Attempt to refresh the user state, especially emailVerified
          await user.reload();
          // After reload, auth.currentUser should be the most up-to-date instance
          reloadedUser = auth.currentUser || user; 
          console.log('[AuthContext] User reloaded. UID:', reloadedUser.uid, 'Email Verified:', reloadedUser.emailVerified);
        } catch (reloadError) {
          console.warn('[AuthContext] Failed to reload user state upon auth change:', reloadError);
          // Proceed with the 'user' object if reload fails, it might be stale for emailVerified
        }

        // Set initial currentUser with core auth data (including reloaded emailVerified)
        // This allows ProtectedRoute to get a quick, accurate emailVerified status.
        setCurrentUser({
          uid: reloadedUser.uid,
          email: reloadedUser.email,
          emailVerified: reloadedUser.emailVerified,
          displayName: reloadedUser.displayName,
          photoURL: reloadedUser.photoURL,
          // Initialize other expected fields from Firestore as undefined or null
          // so components don't break if they expect them before Firestore loads.
          // Example:
          // firstname: undefined, 
          // lastname: undefined,
          // profilePictureUrl: undefined, 
        });
        setLoading(false); // Set loading to false NOW, after initial user object is set
        console.log('[AuthContext] Initial currentUser set, loading is false. User:', reloadedUser.uid, 'Verified:', reloadedUser.emailVerified);

        // Now, set up Firestore listener to enrich the currentUser object
        const userDocRef = doc(db, 'users', reloadedUser.uid);
        const unsubscribeFirestoreListener = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            console.log('[AuthContext] Firestore user data received, enriching currentUser:', docSnap.data());
            setCurrentUser(prevUser => ({
              ...prevUser, // Keep the already set auth properties from reloadedUser
              ...docSnap.data(), // Add/overwrite with Firestore data
              // Ensure core auth properties from reloadedUser are not accidentally overwritten by stale Firestore data
              // This is a safeguard, especially if Firestore data might lag Auth.
              uid: reloadedUser.uid,
              email: reloadedUser.email,
              emailVerified: reloadedUser.emailVerified, 
              displayName: reloadedUser.displayName,
              photoURL: reloadedUser.photoURL,
            }));
          } else {
            console.warn('[AuthContext] No Firestore document found for user:', reloadedUser.uid, '. User profile might be incomplete.');
            // currentUser is already set with auth data; Firestore just didn't add more.
          }
        }, (error) => {
          console.error("[AuthContext] Error listening to user document:", error);
          // currentUser is already set with auth data. Firestore listener failed.
          // No need to change loading state here again.
        });
        setFirestoreUnsubscribe(() => unsubscribeFirestoreListener);

      } else {
        console.log('[AuthContext] User signed out.');
        setCurrentUser(null);
        setLoading(false); // Also set loading to false on sign out
      }
    });

    // Cleanup auth subscription on unmount
    return () => {
      console.log('[AuthContext] Cleaning up auth state listener.');
      unsubscribeAuth();
      if (firestoreUnsubscribe) {
        console.log('[AuthContext] Cleaning up Firestore listener on AuthProvider unmount.');
        firestoreUnsubscribe();
      }
    };
  }, []); // Empty dependency array is correct here

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
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update email for user ${auth.currentUser.uid} to ${newEmail}`);
    await updateEmail(auth.currentUser, newEmail);
    await sendEmailVerification(auth.currentUser); // Send to new email
    console.log(`[AuthContext] Verification email sent to new address: ${newEmail}`);
    // The onSnapshot listener and user.reload() on next auth state change will pick up emailVerified status.
  };

  // Updates the current user's password in Firebase Authentication.
  // Parameters:
  //   newPassword: The new password.
  // Returns a Promise.
  const updateUserPasswordInAuth = (newPassword) => {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    console.log(`[AuthContext] Attempting to update password for user ${auth.currentUser.uid}`);
    return updatePassword(auth.currentUser, newPassword);
  };

  // Re-authenticates the current user with their password.
  // Parameters:
  //   password: The user's current password.
  // Returns a Promise.
  const reauthenticateUser = (password) => {
    if (!auth.currentUser) throw new Error("No user is currently signed in.");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return reauthenticateWithCredential(auth.currentUser, credential);
  };

  // Function to allow components to optimistically update the context's currentUser state.
  // The onSnapshot listener will eventually ensure consistency with Firestore.
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
    updateUserContext, // Provide this function
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
