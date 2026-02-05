import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import GlobalSearch from '../../features/Search/GlobalSearch';
import CameraScanner from '../../features/Scanner/CameraScanner';
import AccessTimer from '../../features/AccessRequest/AccessTimer';
import AccessNotificationBadge from '../../features/AccessRequest/AccessNotificationBadge';
import PinSetupModal from '../../features/Auth/PinSetupModal';
import ProfileModal from '../../features/Auth/ProfileModal';
import { useNotification } from '../../../contexts/NotificationContext';
import NotificationPanel from '../../common/Notification/NotificationPanel';
import './Header.css';

export default function Header({ jobContext, onMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout, userHasPin } = useAuth();
  const { unreadCount, isOpen, togglePanel, setIsOpen } = useNotification();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSearch, setShowSearch] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for keyboard shortcut (Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.notification-wrapper')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Handle scan complete - auto navigate to detail page
  const handleScanComplete = (data) => {
    setShowScanner(false);
    const scannedId = data.result?.barcode?.id;
    if (scannedId) {
      navigate(`/inventory/detail/${scannedId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="menu-toggle" onClick={onMenuToggle}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {jobContext && (
            <div className="job-context">
              <span className="job-id">{jobContext.id}</span>
              <span className="job-client">({jobContext.client})</span>
            </div>
          )}
        </div>

        <div className="header-center">
          <h1 className="header-title">HOSE INVENTORY</h1>

          {/* Search Bar with Scanner */}
          <div className="header-search">
            <button
              className="search-bar"
              onClick={() => setShowSearch(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="search-placeholder">Cari ID atau nama barang...</span>
              <kbd className="search-shortcut">Ctrl+K</kbd>
            </button>
            <button
              className="header-search-btn"
              onClick={() => setShowScanner(true)}
              title="Scan QR Code / Barcode"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
              </svg>
            </button>
          </div>
        </div>

        <div className="header-right">
          {/* Access Timer */}
          <AccessTimer />

          {/* Notification Bell */}
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <button
              className={`header-btn-icon ${isOpen ? 'active' : ''}`}
              onClick={togglePanel}
              title="Notifikasi"
            >
              <span className="icon">🔔</span>
              {unreadCount > 0 && (
                <span className="badge-count">{unreadCount}</span>
              )}
            </button>
            {isOpen && <NotificationPanel />}
          </div>

          {/* Access Request Notifications */}
          <AccessNotificationBadge />

          <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-indicator"></span>
            <span className="status-text">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {user && (
            <div className="user-menu-wrapper">
              <button
                className="user-info"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div
                  className="user-avatar"
                  style={{ backgroundColor: user.roleConfig?.color }}
                >
                  {user.roleConfig?.icon || user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.name}</span>
              </button>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <span className="dropdown-name">{user.name}</span>
                    <span
                      className="dropdown-role"
                      style={{ backgroundColor: user.roleConfig?.color }}
                    >
                      {user.roleConfig?.label}
                    </span>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfile(true);
                    }}
                  >
                    👤 Edit Profil
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowPinSetup(true);
                    }}
                  >
                    {userHasPin() ? '🔐 Ubah PIN Perangkat' : '📌 Aktifkan PIN Cepat'}
                  </button>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="dropdown-overlay" onClick={() => setShowUserMenu(false)} />
      )}

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Quick Scanner */}
      <CameraScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleScanComplete}
        scanMode="qr"
        title="Scan Cepat"
      />

      {/* PIN Setup Modal */}
      <PinSetupModal
        isOpen={showPinSetup}
        onClose={() => setShowPinSetup(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}

