import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ROLES, ROLE_CONFIG } from './AuthContext';
import { getUsers, createUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser } from '../services/userApi';
import { useAuth } from './AuthContext';

// User Context
const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState([]);

    const [loading, setLoading] = useState(true);

    // Modal states
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);

    // Message states
    const [actionMessage, setActionMessage] = useState(null);

    // Load users from API only when authenticated
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            loadUsers();
        }
    }, [isAuthenticated]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers({ limit: 100 });
            if (res.status === 'success') {
                const userList = res.data.map(u => ({
                    ...u,
                    // Ensure roleConfig exists for permission checks if needed directly on User object 
                    // (though usually AuthContext checks current user)
                    roleConfig: ROLE_CONFIG[u.role]
                }));
                setUsers(userList);

                // Extract institutions (if we add institution field to backend later, for now mock or use empty)
                // My User model doesn't have 'institution'. I'll skip it or default it.
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    // Show action message
    const showMessage = useCallback((type, text) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 4000);
    }, []);

    // Get active (non-deleted) users
    const getActiveUsers = useCallback(() => {
        return users.filter(u => u.isActive);
    }, [users]);

    // Add new user
    const addUser = useCallback(async (userData) => {
        try {
            const res = await createUser(userData);
            if (res.status === 'success') {
                showMessage('success', `✅ Pengguna "${res.data.name}" berhasil ditambahkan!`);
                setShowAddEditModal(false);
                setEditingUser(null);
                loadUsers();
                return res.data;
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            showMessage('error', `Gagal menambah user: ${err.message}`);
        }
    }, [showMessage]);

    // Update existing user
    const updateUser = useCallback(async (userId, userData) => {
        try {
            const res = await apiUpdateUser(userId, userData);
            if (res.status === 'success') {
                showMessage('success', `✅ Data pengguna "${res.data.name}" berhasil diperbarui!`);
                setShowAddEditModal(false);
                setEditingUser(null);
                loadUsers();
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            showMessage('error', `Update gagal: ${err.message}`);
        }
    }, [showMessage]);

    // Delete user
    const deleteUser = useCallback(async (userId) => {
        try {
            const res = await apiDeleteUser(userId);
            if (res.status === 'success') {
                showMessage('success', `✅ Pengguna berhasil dihapus.`);
                setShowDeleteModal(false);
                setDeletingUser(null);
                loadUsers();
            } else {
                throw new Error(res.message);
            }
        } catch (err) {
            showMessage('error', `Hapus gagal: ${err.message}`);
        }
    }, [showMessage]);

    // ... modal helpers ...
    const openAddModal = useCallback(() => {
        setEditingUser(null);
        setShowAddEditModal(true);
    }, []);

    const openEditModal = useCallback((user) => {
        setEditingUser(user);
        setShowAddEditModal(true);
    }, []);

    const openDeleteModal = useCallback((user) => {
        setDeletingUser(user);
        setShowDeleteModal(true);
    }, []);

    const closeAddEditModal = useCallback(() => {
        setShowAddEditModal(false);
        setEditingUser(null);
    }, []);

    const closeDeleteModal = useCallback(() => {
        setShowDeleteModal(false);
        setDeletingUser(null);
    }, []);


    return (
        <UserContext.Provider value={{
            // State
            users,
            institutions,
            loading,
            showAddEditModal,
            editingUser,
            showDeleteModal,
            deletingUser,
            actionMessage,

            // Getters
            getActiveUsers,

            // Actions
            addUser,
            updateUser,
            deleteUser,
            openAddModal,
            openEditModal,
            openDeleteModal,
            closeAddEditModal,
            closeDeleteModal,
            refreshUsers: loadUsers,

            // Constants
            ROLES,
            ROLE_CONFIG
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUserManagement() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserManagement must be used within a UserProvider');
    }
    return context;
}

export { ROLES, ROLE_CONFIG };
