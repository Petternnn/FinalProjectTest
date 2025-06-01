// src/pages/Create.jsx
import React from 'react';
import Sidebar from '../../components/SideBar/Sidebar';
import ContentQAWizard from '../../components/QA_Quiz_Generator/ContentQAWizard';
import styles from './Create.module.css';

// Component: Create
// Description: Page that hosts the content creation tools, primarily featuring the ContentQAWizard.
export default function Create() {
  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.main}>
        <h1 className={styles.header}>Create Page</h1>
        <p className={styles.p}>This is where you can create your academic content and quizzes.</p>
        <div className={styles.wizardHost}>
          <ContentQAWizard />
        </div>
      </main>
    </div>
  );
}
