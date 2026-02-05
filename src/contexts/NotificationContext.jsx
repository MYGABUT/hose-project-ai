import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // Add a new notification
    // type: 'info', 'success', 'warning', 'error', 'approval'
    const addNotification = useCallback((title, message, type = 'info', link = null) => {
        const newNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title,
            message,
            type,
            link,
            read: false,
            createdAt: new Date().toISOString()
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Auto-show panel/badge animation if needed (optional logic here)
    }, []);

    // Mark as read
    const markAsRead = useCallback((id) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Remove specific notification
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Toggle panel
    const togglePanel = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isOpen,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearAll,
            removeNotification,
            setIsOpen,
            togglePanel
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
