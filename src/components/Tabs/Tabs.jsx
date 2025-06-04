import React, { useState, useEffect, useRef } from 'react';
import styles from './Tabs.module.css';

// A simple icon component (you can replace with SVGs or an icon library)
const TabIcon = ({ color = 'currentColor' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.tabIcon}>
    <circle cx="8" cy="8" r="3" fill={color} />
  </svg>
);

export default function Tabs({ tabs, defaultTabId }) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || (tabs.length > 0 ? tabs[0].id : null));
  const tabButtonsRef = useRef({});

  useEffect(() => {
    if (!activeTabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const handleTabClick = (tabId) => {
    setActiveTabId(tabId);
  };

  // Add event listeners for keyboard navigation
  useEffect(() => {
    const currentButtons = Object.values(tabButtonsRef.current).filter(Boolean);

    const handleKeyDown = (event) => {
      const currentIndex = currentButtons.findIndex(
        (button) => button === document.activeElement
      );

      if (currentIndex === -1) return;

      let nextIndex = -1;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % currentButtons.length;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        nextIndex = (currentIndex - 1 + currentButtons.length) % currentButtons.length;
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const tabId = currentButtons[currentIndex].id.replace('tab-', '');
        handleTabClick(tabId);
      }

      if (nextIndex !== -1) {
        currentButtons[nextIndex].focus();
      }
    };
    
    currentButtons.forEach(button => {
      button.removeEventListener('keydown', handleKeyDown); 
      button.addEventListener('keydown', handleKeyDown);
    });

    return () => {
      currentButtons.forEach(button => button.removeEventListener('keydown', handleKeyDown));
    };
  }, [tabs, activeTabId, handleTabClick]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Icon colors based on the image provided
  const iconColors = [
    '#FF6B6B', // appearance (red-ish)
    'var(--color-primary)', // personal information (blue)
    '#FFD166', // security (yellow-ish)
    '#06D6A0', // billing information (green-ish)
    '#7289DA', // messages (discord-like purple/blue)
    '#F78C6C', // data export (orange-ish)
  ];

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabNavigation} role="tablist" aria-orientation="vertical">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={el => tabButtonsRef.current[tab.id] = el}
            role="tab"
            aria-selected={activeTabId === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`${styles.tabButton} ${activeTabId === tab.id ? styles.active : ''}`}
            onClick={() => handleTabClick(tab.id)}
            type="button"
          >
            <TabIcon color={activeTabId === tab.id ? 'var(--color-primary)' : iconColors[index % iconColors.length]} />
            {tab.label}
          </button>
        ))}
      </nav>
      <div
        className={styles.tabContent}
        role="tabpanel"
        id={`tabpanel-${activeTabId}`}
        aria-labelledby={`tab-${activeTabId}`}
        tabIndex="0" // Make content focusable
      >
        {activeTab ? activeTab.component : <p>Select a tab.</p>}
      </div>
    </div>
  );
}
