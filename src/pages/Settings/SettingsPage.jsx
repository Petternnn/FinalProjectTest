import React from 'react';
import Sidebar from '../../components/SideBar/Sidebar';
import Tabs from '../../components/Tabs/Tabs'; // Import the new Tabs component
import ProfilePanel from './panels/ProfilePanel'; // Import the ProfilePanel
import styles from './SettingsPage.module.css';

// Placeholders for other settings sections to fill later
const AppearancePanel = () => <div className={styles.placeholderPanel}>Appearance Settings (Coming Soon)</div>;
const SecurityPanel = () => <div className={styles.placeholderPanel}>Security Settings (Coming Soon)</div>;
const BillingPanel = () => <div className={styles.placeholderPanel}>Billing Information (Coming Soon)</div>;
const MessagesPanel = () => <div className={styles.placeholderPanel}>Messages Settings (Coming Soon)</div>;
const DataExportPanel = () => <div className={styles.placeholderPanel}>Data Export (Coming Soon)</div>;


// Component: SettingsPage
// Description: Page for users to manage their account settings and profile information.
export default function SettingsPage() {
  const settingsTabs = [
    { id: 'appearance', label: 'Appearance', component: <AppearancePanel /> },
    { id: 'personal-info', label: 'Personal Information', component: <ProfilePanel /> },
    { id: 'security', label: 'Security', component: <SecurityPanel /> },
    { id: 'billing', label: 'Billing Information', component: <BillingPanel /> },
    { id: 'messages', label: 'Messages', component: <MessagesPanel /> },
    { id: 'data-export', label: 'Data Export', component: <DataExportPanel /> },
  ];

  return (
    <div className={styles.pageContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <h1 className={styles.pageHeader}>Settings</h1>
        <div className={styles.settingsLayout}>
          <Tabs tabs={settingsTabs} defaultTabId="personal-info" />
        </div>
      </main>
    </div>
  );
}
