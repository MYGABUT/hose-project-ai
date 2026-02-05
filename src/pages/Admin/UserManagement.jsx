import { useState } from 'react';
import { useUserManagement } from '../../contexts/UserContext';
import { useAuth, ROLES } from '../../contexts/AuthContext';
import Button from '../../components/common/Button/Button';
import AddEditUserModal from '../../components/features/UserManagement/AddEditUserModal';
import DeleteUserModal from '../../components/features/UserManagement/DeleteUserModal';
import './UserManagement.css';

// Roles yang diizinkan mengakses User Management
const ALLOWED_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

export default function UserManagement() {
    const { user } = useAuth();
    const {
        getActiveUsers,
        openAddModal,
        openEditModal,
        openDeleteModal,
        actionMessage,
        ROLE_CONFIG
    } = useUserManagement();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    // Check if user has permission
    const hasAccess = user && ALLOWED_ROLES.includes(user.role);

    // If no access, show access denied page
    if (!hasAccess) {
        return (
            <div className="user-management-page">
                <div className="access-denied">
                    <div className="denied-icon">🔒</div>
                    <h2>Akses Ditolak</h2>
                    <p>Halaman <strong>User Management</strong> hanya dapat diakses oleh:</p>
                    <ul>
                        <li>👑 Super Admin</li>
                        <li>🎯 Manager</li>
                    </ul>
                    <p className="current-role">
                        Role Anda saat ini: <span className="role-badge-inline">{user?.roleConfig?.icon} {user?.roleConfig?.label}</span>
                    </p>
                    <p className="hint">Hubungi Super Admin jika Anda memerlukan akses ke halaman ini.</p>
                </div>
            </div>
        );
    }

    const activeUsers = getActiveUsers();

    // Filter users
    const filteredUsers = activeUsers.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.institution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="user-management-page">
            {/* Action Message Toast */}
            {actionMessage && (
                <div className={`action-toast ${actionMessage.type}`}>
                    {actionMessage.text}
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>👥 Manajemen Pengguna</h1>
                    <p>Kelola user, akses login, dan hak akses sistem</p>
                </div>
                <Button variant="primary" onClick={openAddModal}>
                    ➕ Tambah User Baru
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-icon">👥</span>
                    <div className="stat-content">
                        <span className="stat-value">{activeUsers.length}</span>
                        <span className="stat-label">Total User Aktif</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🌐</span>
                    <div className="stat-content">
                        <span className="stat-value">{activeUsers.filter(u => u.loginMethods?.web).length}</span>
                        <span className="stat-label">Akses Web</span>
                    </div>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📱</span>
                    <div className="stat-content">
                        <span className="stat-value">{activeUsers.filter(u => u.loginMethods?.kiosk).length}</span>
                        <span className="stat-label">Akses Kiosk</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="filter-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama, lembaga, atau email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="role-filter"
                >
                    <option value="all">Semua Role</option>
                    {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => (
                        <option key={roleKey} value={roleKey}>
                            {config.icon} {config.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>NAMA & GENDER</th>
                            <th>LEMBAGA</th>
                            <th>ROLE</th>
                            <th>KONTAK</th>
                            <th>AKSES</th>
                            <th>AKSI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-state">
                                    <span className="empty-icon">📭</span>
                                    <p>Tidak ada user ditemukan</p>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => {
                                const roleConfig = ROLE_CONFIG[user.role];
                                return (
                                    <tr key={user.id}>
                                        {/* Name & Gender */}
                                        <td>
                                            <div className="user-cell">
                                                <div className={`user-avatar ${user.gender}`}>
                                                    {user.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-info">
                                                    <span className="user-name">
                                                        {user.name}
                                                        <span className="gender-icon">
                                                            {user.gender === 'male' ? '♂️' : '♀️'}
                                                        </span>
                                                    </span>
                                                    <span className="user-id">ID: {user.id}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Institution */}
                                        <td>
                                            <span className="institution">{user.institution || '-'}</span>
                                        </td>

                                        {/* Role */}
                                        <td>
                                            <span
                                                className="role-badge"
                                                style={{ backgroundColor: roleConfig?.color }}
                                            >
                                                {roleConfig?.icon} {roleConfig?.label}
                                            </span>
                                        </td>

                                        {/* Contact */}
                                        <td>
                                            <div className="contact-info">
                                                {user.email && (
                                                    <span className="email">📧 {user.email}</span>
                                                )}
                                                {user.phone ? (
                                                    <span className="phone">📱 {user.phone}</span>
                                                ) : (
                                                    !user.email && <span className="no-contact">-</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Access Methods */}
                                        <td>
                                            <div className="access-badges">
                                                {user.loginMethods?.web && (
                                                    <span className="access-badge web">Web</span>
                                                )}
                                                {user.loginMethods?.kiosk && (
                                                    <span className="access-badge kiosk">Kiosk</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={() => openEditModal(user)}
                                                    title="Edit User"
                                                >
                                                    🖊️
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => openDeleteModal(user)}
                                                    title="Hapus User"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Info Box */}
            <div className="info-box">
                <h4>ℹ️ Tentang User Management</h4>
                <ul>
                    <li><strong>Akses Web:</strong> Login dengan email untuk mengakses dashboard via browser</li>
                    <li><strong>Akses Kiosk:</strong> Login dengan PIN 4 digit untuk tablet di lantai produksi</li>
                    <li><strong>Soft Delete:</strong> User dengan riwayat transaksi hanya dinonaktifkan, data tetap tersimpan</li>
                </ul>
            </div>

            {/* Modals */}
            <AddEditUserModal />
            <DeleteUserModal />
        </div>
    );
}
