import { useUserManagement } from '../../../contexts/UserContext';
import Modal from '../../common/Modal/Modal';
import Button from '../../common/Button/Button';
import './DeleteUserModal.css';

export default function DeleteUserModal() {
    const {
        showDeleteModal,
        deletingUser,
        closeDeleteModal,
        deleteUser,
        ROLE_CONFIG
    } = useUserManagement();

    if (!deletingUser) return null;

    const hasTransactions = deletingUser.transactionCount > 0;
    const roleConfig = ROLE_CONFIG[deletingUser.role];

    const handleDelete = () => {
        deleteUser(deletingUser.id);
    };

    return (
        <Modal
            isOpen={showDeleteModal}
            onClose={closeDeleteModal}
            title=""
            size="sm"
        >
            <div className="delete-user-modal">
                {/* Warning Icon */}
                <div className="delete-warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="delete-title">⚠️ Hapus Pengguna?</h2>

                {/* User Info */}
                <div className="delete-user-info">
                    <div className={`user-avatar ${deletingUser.gender}`}>
                        {deletingUser.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <span className="user-name">{deletingUser.name}</span>
                        <span className="user-role">
                            {roleConfig?.icon} {roleConfig?.label}
                        </span>
                    </div>
                </div>

                {/* Warning Message */}
                <div className="delete-warning-message">
                    {hasTransactions ? (
                        <>
                            <div className="warning-box soft-delete">
                                <span className="warning-icon">ℹ️</span>
                                <div className="warning-text">
                                    <strong>Mode: Soft Delete (Nonaktifkan)</strong>
                                    <p>
                                        User ini memiliki <strong>{deletingUser.transactionCount} transaksi</strong> tercatat.
                                        Akun akan dinonaktifkan, namun riwayat transaksi tetap tersimpan (arsip).
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="warning-box hard-delete">
                                <span className="warning-icon">⚠️</span>
                                <div className="warning-text">
                                    <strong>PERINGATAN: Hapus Permanen</strong>
                                    <p>
                                        Tindakan ini <strong>tidak dapat dibatalkan</strong>.
                                        Riwayat login akan hilang dari sistem.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="delete-actions">
                    <Button variant="secondary" onClick={closeDeleteModal}>
                        Batal
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        className="delete-confirm-btn"
                    >
                        {hasTransactions ? '🔒 Nonaktifkan User' : '🗑️ Ya, Hapus Permanen'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
