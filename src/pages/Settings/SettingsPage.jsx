import React from 'react';
import Sidebar from '../../components/SideBar/Sidebar';
import { useAuth } from '../../contexts/AuthContext'; // To access user data
import styles from './SettingsPage.module.css'; // We'll create this CSS module next

// Component: SettingsPage
// Description: Page for users to manage their account settings and profile information.
export default function SettingsPage() {
  const { currentUser } = useAuth();

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.mainContent}>
        <h1 className={styles.header}>Settings</h1>
        <div className={styles.settingsPanel}>
          <h2 className={styles.panelTitle}>User Profile</h2>
          {currentUser ? (
            <div className={styles.profileInfo}>
              <p>
                <strong>Email:</strong> {currentUser.email}
              </p>
              <p>
                <strong>Name:</strong> {currentUser.displayName || 'Not set'}
              </p>
              <p>
                <strong>UID:</strong> {currentUser.uid}
              </p>
              <p>
                <strong>Email Verified:</strong> {currentUser.emailVerified ? 'Yes' : 'No'}
              </p>
              {/* Add more profile fields or edit options here later */}
            </div>
          ) : (
            <p>Loading user information...</p>
          )}
        </div>
        {/* You can add more panels for other settings later, e.g., preferences, notifications */}
      </main>
    </div>
  );
}
