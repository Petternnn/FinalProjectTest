// src/components/Sidebar.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import useWindowSize from '../../hooks/useWindowSize'; // Import the custom hook
import logoImage from '../../assets/logo.png';
import styles from './Sidebar.module.css';
// It's good practice to have a default avatar if the user doesn't have one.
// For now, we'll rely on alt text or a broken image icon if no profilePictureUrl is present.
import defaultAvatar from '../../assets/default-avatar.png'; // Example if you add one later

const MOBILE_BREAKPOINT = 768;

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { width: windowWidth } = useWindowSize(); 
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const logoutButtonRef = useRef(null);

  // Effect to handle closing mobile menu on resize to desktop
  useEffect(() => {
    if (windowWidth && windowWidth > MOBILE_BREAKPOINT && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [windowWidth, isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleLogout = async () => {
    if (logout) {
      try {
        await logout();
        console.log('User logged out successfully.');
        navigate('/login'); // Navigate to login page after logout
      } catch (error) {
        console.error('Failed to logout:', error);
      }
    } else {
      console.error("Logout function not found in context");
    }
  };

  // Effect for attaching and detaching logout button event listener
  useEffect(() => {
    const button = logoutButtonRef.current;
    if (button) {
      button.addEventListener('click', handleLogout);
    }
    return () => {
      if (button) {
        button.removeEventListener('click', handleLogout);
      }
    };
  }, [handleLogout]); // re-run if handleLogout changes 

  const getLinkClassName = ({ isActive }) => {
    return `${styles['nav-link']} ${isActive ? styles.active : ''}`;
  };

  const sidebarToggleClasses = `${styles['sidebar-toggle']} ${isMobileMenuOpen ? styles['sidebar-toggle--open'] : ''}`;
  const sidebarClasses = `${styles.sidebar} ${isMobileMenuOpen ? styles['sidebar--mobile-open'] : ''}`;

  return (
    <>
      <button
        className={sidebarToggleClasses}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation"
        aria-expanded={isMobileMenuOpen}
      >
        <span className={styles['sidebar-toggle-icon']}></span>
      </button>
      <div className={sidebarClasses}>
        <div className={styles['sidebar-header']}>
          <div className={styles['sidebar-logo-container']}>
            <img src={logoImage} alt="Logo" className={styles['sidebar-logo-img']} draggable={false} />
          </div>
          {currentUser && (
            <div className={styles['sidebar-user-profile']}>
              {currentUser.profilePictureUrl ? (
                <img
                  src={currentUser.profilePictureUrl}
                  alt={`${currentUser.firstname || 'User'}'s avatar`}
                  className={styles['sidebar-user-avatar']}
                  draggable={false}
                />
              ) : (
                <div className={styles['sidebar-user-avatar-placeholder']}>
                  <span>{(currentUser.firstname || 'U').charAt(0)}</span>
                </div>
              )}
              <div className={styles['sidebar-user-info']}>
                <span className={styles['sidebar-user-name']}>
                  {`${currentUser.firstname || ''} ${currentUser.lastname || ''}`.trim() || 'User Name'}
                </span>
                <span className={styles['sidebar-user-role']}>
                  {currentUser.role || 'User Role'}
                </span>
              </div>
            </div>
          )}
        </div>
        <nav className={styles.nav}>
          <div className={styles['nav-links']}>
            <NavLink 
              to="/create" 
              className={getLinkClassName} 
              end 
              onClick={isMobileMenuOpen ? toggleMobileMenu : undefined}
            >
              Create
            </NavLink>
            <NavLink 
              to="/quiz-modules" 
              className={getLinkClassName} 
              onClick={isMobileMenuOpen ? toggleMobileMenu : undefined}
            >
              Quiz modules
            </NavLink>
            <NavLink 
              to="/settings" 
              className={getLinkClassName} 
              onClick={isMobileMenuOpen ? toggleMobileMenu : undefined}
            >
              Settings
            </NavLink>
          </div>
          <button ref={logoutButtonRef} className={styles['logout-button']}>
            Logout
          </button>
        </nav>
      </div>
      {isMobileMenuOpen && windowWidth && windowWidth <= MOBILE_BREAKPOINT && (
        <div className={styles['sidebar-overlay']} onClick={toggleMobileMenu}></div>
      )}
    </>
  );
}
//com.pgouiran.rocketquiz