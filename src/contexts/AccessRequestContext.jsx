import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, ROLE_CONFIG } from './AuthContext';
import { getUsers } from '../services/userApi';

// Define restricted features that require request access
export const RESTRICTED_FEATURES = {
    EDIT_HPP: {
        id: 'edit_hpp',
        label: 'Edit Harga Dasar (HPP)',
        module: 'Sales',
        icon: '💰',
        description: 'Mengubah harga modal/HPP produk'
    },
    APPROVE_BIG_DISCOUNT: {
        id: 'approve_big_discount',
        label: 'Approve Diskon > 50%',
        module: 'Sales',
        icon: '🎫',
        description: 'Menyetujui diskon besar di atas 50%'
    },
    DELETE_STOCK: {
        id: 'delete_stock',
        label: 'Hapus Data Stok',
        module: 'Inventory',
        icon: '🗑️',
        description: 'Menghapus data stok secara permanen'
    },
    OVERRIDE_VENDOR_BLOCK: {
        id: 'override_vendor_block',
        label: 'Override Block Vendor',
        module: 'Purchasing',
        icon: '🔓',
        description: 'Membuka blokir vendor yang di-suspend'
    },
    EXPORT_FINANCIAL: {
        id: 'export_financial',
        label: 'Export Data Keuangan',
        module: 'Finance',
        icon: '📊',
        description: 'Mengekspor laporan keuangan sensitif'
    }
};

// Get potential approvers for a user
// DEPRECATED: Use the one from useAccessRequest() instead
export const getApproversFor = (userId) => {
    console.warn('Using deprecated standalone getApproversFor. Please migrate to useAccessRequest().getApproversFor()');
    return [];
};

// Access Request Context
const AccessRequestContext = createContext(null);

export function AccessRequestProvider({ children }) {
    const { user } = useAuth();

    // Pending requests (waiting for approval)
    const [pendingRequests, setPendingRequests] = useState([]);

    // Active temporary access grants
    const [activeGrants, setActiveGrants] = useState([]);

    // Activity logs for session recap
    const [activityLogs, setActivityLogs] = useState([]);

    // Completed sessions (for recap)
    const [completedSessions, setCompletedSessions] = useState([]);

    // Request modal state
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestingFeature, setRequestingFeature] = useState(null);

    // Approval modal state
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    // Extension modal state
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [extensionGrant, setExtensionGrant] = useState(null);

    // Session recap modal state
    const [showRecapModal, setShowRecapModal] = useState(false);
    const [recapSession, setRecapSession] = useState(null);

    // Warning/expiry state
    const [expiringGrant, setExpiringGrant] = useState(null);
    const [showExpiryWarning, setShowExpiryWarning] = useState(false);

    // Approvers list (fetched from API)
    const [approvers, setApprovers] = useState([]);

    // Load from localStorage
    useEffect(() => {
        const savedRequests = localStorage.getItem('hosepro_access_requests');
        const savedGrants = localStorage.getItem('hosepro_active_grants');
        const savedLogs = localStorage.getItem('hosepro_activity_logs');
        const savedSessions = localStorage.getItem('hosepro_completed_sessions');

        try {
            if (savedRequests) setPendingRequests(JSON.parse(savedRequests));
            if (savedGrants) setActiveGrants(JSON.parse(savedGrants));
            if (savedLogs) setActivityLogs(JSON.parse(savedLogs));
            if (savedSessions) setCompletedSessions(JSON.parse(savedSessions));
        } catch (e) {
            console.error('Failed to parse saved access requests data', e);
            // Fallback to empty if corrupted
            setPendingRequests([]);
            setActiveGrants([]);
            setActivityLogs([]);
            setCompletedSessions([]);
        }

        // Load approvers from API
        loadApprovers();
    }, []);

    const loadApprovers = async () => {
        try {
            // Fetch all active users and filter for approvers (managers/admins)
            const res = await getUsers({ limit: 100, active_only: true });
            if (res.status === 'success') {
                const potentialApprovers = res.data.filter(u =>
                    u.role === 'manager' ||
                    u.role === 'admin' ||
                    u.role === 'super_admin'
                );
                setApprovers(potentialApprovers);
            }
        } catch (err) {
            console.error('Failed to load approvers:', err);
        }
    };

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('hosepro_access_requests', JSON.stringify(pendingRequests));
    }, [pendingRequests]);

    useEffect(() => {
        localStorage.setItem('hosepro_active_grants', JSON.stringify(activeGrants));
    }, [activeGrants]);

    useEffect(() => {
        localStorage.setItem('hosepro_activity_logs', JSON.stringify(activityLogs));
    }, [activityLogs]);

    useEffect(() => {
        localStorage.setItem('hosepro_completed_sessions', JSON.stringify(completedSessions));
    }, [completedSessions]);

    // Check and expire grants every second + panic management
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            setActiveGrants(prev => {
                const stillActive = [];
                const expired = [];

                prev.forEach(g => {
                    const remaining = new Date(g.expiresAt).getTime() - now;

                    if (remaining <= 0) {
                        // Grant expired
                        expired.push(g);
                    } else {
                        stillActive.push(g);

                        // Check for warning (5 minutes)
                        if (remaining <= 5 * 60 * 1000 && remaining > 60 * 1000 && g.userId === user?.id) {
                            if (!expiringGrant || expiringGrant.id !== g.id) {
                                setExpiringGrant(g);
                                setShowExpiryWarning(true);
                            }
                        }
                        // Critical warning (1 minute)
                        if (remaining <= 60 * 1000 && g.userId === user?.id) {
                            setExpiringGrant(g);
                            setShowExpiryWarning(true);
                        }
                    }
                });

                // Handle expired grants - create session recap
                expired.forEach(g => {
                    endSession(g, 'expired');
                });

                return stillActive;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [user, expiringGrant]);

    // End a session and create recap
    const endSession = useCallback((grant, reason = 'expired') => {
        const sessionLogs = activityLogs.filter(log => log.grantId === grant.id);
        const startTime = new Date(grant.createdAt).getTime();
        const endTime = Date.now();
        const durationUsed = Math.floor((endTime - startTime) / 60000); // minutes

        const session = {
            id: `SESSION-${Date.now()}`,
            grantId: grant.id,
            userId: grant.userId,
            userName: grant.userName,
            featureId: grant.featureId,
            featureLabel: grant.featureLabel,
            grantedDuration: grant.grantedDuration,
            durationUsedMinutes: durationUsed,
            endReason: reason, // 'expired', 'early_lock', 'extension_approved'
            isEarlyLock: reason === 'early_lock',
            activities: sessionLogs,
            activityCount: sessionLogs.length,
            approverUserId: grant.grantedBy,
            approverName: grant.grantedByName,
            completedAt: new Date().toISOString()
        };

        setCompletedSessions(prev => [...prev, session]);

        // Clear logs for this grant
        setActivityLogs(prev => prev.filter(log => log.grantId !== grant.id));

        console.log(`Session ended: ${grant.featureId} for ${grant.userName} - ${reason}`);
    }, [activityLogs]);

    // Log an activity during PAM session
    const logActivity = useCallback((action, targetItem, oldValue, newValue) => {
        if (!user) return;

        // Find active grant for user
        const grant = activeGrants.find(g =>
            g.userId === user.id &&
            new Date(g.expiresAt).getTime() > Date.now()
        );

        if (!grant) return;

        const log = {
            id: `LOG-${Date.now()}`,
            grantId: grant.id,
            userId: user.id,
            userName: user.name,
            action, // 'CREATE', 'UPDATE', 'DELETE'
            targetItem,
            oldValue,
            newValue,
            timestamp: new Date().toISOString()
        };

        setActivityLogs(prev => [...prev, log]);
    }, [user, activeGrants]);

    // Request extension (high priority)
    const requestExtension = useCallback((grantId, additionalMinutes = 15) => {
        const grant = activeGrants.find(g => g.id === grantId);
        if (!grant) return null;

        // Create high priority extension request
        const request = {
            id: `EXT-${Date.now()}`,
            type: 'extension',
            priority: 'high',
            userId: grant.userId,
            userName: grant.userName,
            featureId: grant.featureId,
            featureLabel: grant.featureLabel,
            originalGrantId: grantId,
            requestedMinutes: additionalMinutes,
            reason: 'Waktu hampir habis - butuh perpanjangan',
            approverId: grant.grantedBy,
            approverName: grant.grantedByName,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        setPendingRequests(prev => [...prev, request]);

        // Grant grace period (5 minutes automatic)
        setActiveGrants(prev => prev.map(g => {
            if (g.id === grantId) {
                return {
                    ...g,
                    expiresAt: new Date(new Date(g.expiresAt).getTime() + 5 * 60 * 1000).toISOString(),
                    hasGracePeriod: true
                };
            }
            return g;
        }));

        setShowExpiryWarning(false);
        setExpiringGrant(null);

        return request;
    }, [activeGrants]);

    // Early finish - user voluntarily ends session
    const earlyFinish = useCallback((grantId) => {
        const grant = activeGrants.find(g => g.id === grantId);
        if (!grant) return;

        // End session with early_lock reason
        endSession(grant, 'early_lock');

        // Remove grant
        setActiveGrants(prev => prev.filter(g => g.id !== grantId));

        return true;
    }, [activeGrants, endSession]);

    // Add a demo grant directly (for testing expiry warnings)
    const addDemoGrant = useCallback((grant) => {
        // Remove any existing demo grants first
        setActiveGrants(prev => [...prev.filter(g => !g.id.startsWith('DEMO-')), grant]);
    }, []);

    // Check if user has access to a feature (permanent or temporary)
    const hasFeatureAccess = useCallback((featureId) => {
        if (!user) return false;

        // Super admin has all access
        if (user.role === 'super_admin') return true;

        // Check role-based permanent access
        const roleConfig = ROLE_CONFIG[user.role];
        if (roleConfig) {
            if (featureId === 'edit_hpp' && roleConfig.canEditHPP) return true;
            if (featureId === 'approve_big_discount' && roleConfig.canApproveQuotation) return true;
        }

        // Check temporary grants
        const grant = activeGrants.find(g =>
            g.userId === user.id &&
            g.featureId === featureId &&
            new Date(g.expiresAt).getTime() > Date.now()
        );

        return !!grant;
    }, [user, activeGrants]);

    // Get remaining time for a feature grant
    const getGrantRemainingTime = useCallback((featureId) => {
        if (!user) return null;

        const grant = activeGrants.find(g =>
            g.userId === user.id &&
            g.featureId === featureId
        );

        if (!grant) return null;

        const remaining = new Date(grant.expiresAt).getTime() - Date.now();
        return remaining > 0 ? remaining : null;
    }, [user, activeGrants]);

    // Request access to a feature
    const requestAccess = (featureId, durationHours, reason, approverId) => {
        const feature = Object.values(RESTRICTED_FEATURES).find(f => f.id === featureId);
        const approver = null;

        const request = {
            id: `REQ-${Date.now()}`,
            type: 'new_access',
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            featureId,
            featureLabel: feature?.label,
            featureModule: feature?.module,
            requestedDuration: durationHours,
            reason,
            approverId,
            approverName: null,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        setPendingRequests(prev => [...prev, request]);
        setShowRequestModal(false);
        setRequestingFeature(null);

        return request;
    };

    // Approve a request (with possible duration adjustment)
    const approveRequest = (requestId, grantedDuration, approverNote) => {
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) return null;

        // Handle extension request
        if (request.type === 'extension') {
            setActiveGrants(prev => prev.map(g => {
                if (g.id === request.originalGrantId) {
                    return {
                        ...g,
                        expiresAt: new Date(new Date(g.expiresAt).getTime() + grantedDuration * 60 * 1000).toISOString(),
                        hasGracePeriod: false,
                        extensionApproved: true
                    };
                }
                return g;
            }));

            setPendingRequests(prev => prev.map(r =>
                r.id === requestId
                    ? { ...r, status: 'approved', grantedMinutes: grantedDuration, approverNote, approvedAt: new Date().toISOString() }
                    : r
            ));

            return { type: 'extension', grantedMinutes: grantedDuration };
        }

        // Create new grant
        const grant = {
            id: `GRANT-${Date.now()}`,
            requestId,
            userId: request.userId,
            userName: request.userName,
            featureId: request.featureId,
            featureLabel: request.featureLabel,
            grantedDuration,
            grantedBy: user.id,
            grantedByName: user.name,
            approverNote,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + grantedDuration * 60 * 60 * 1000).toISOString()
        };

        setPendingRequests(prev => prev.map(r =>
            r.id === requestId
                ? { ...r, status: 'approved', grantedDuration, approverNote, approvedAt: new Date().toISOString() }
                : r
        ));

        setActiveGrants(prev => [...prev, grant]);
        setShowApprovalModal(false);
        setSelectedRequest(null);

        return grant;
    };

    // Reject a request
    const rejectRequest = (requestId, rejectReason) => {
        setPendingRequests(prev => prev.map(r =>
            r.id === requestId
                ? { ...r, status: 'rejected', rejectReason, rejectedAt: new Date().toISOString() }
                : r
        ));
        setShowApprovalModal(false);
        setSelectedRequest(null);
    };

    // Open request modal for a feature
    const openRequestModal = (featureId) => {
        const feature = Object.values(RESTRICTED_FEATURES).find(f => f.id === featureId);
        setRequestingFeature(feature);
        setShowRequestModal(true);
    };

    // Open approval modal for a request
    const openApprovalModal = (request) => {
        setSelectedRequest(request);
        setShowApprovalModal(true);
    };

    // Open session recap modal
    const openRecapModal = (session) => {
        setRecapSession(session);
        setShowRecapModal(true);
    };

    // Get pending requests for current user (as approver)
    const getPendingRequestsForApprover = useCallback(() => {
        if (!user) return [];
        return pendingRequests.filter(r =>
            r.approverId === user.id && r.status === 'pending'
        );
    }, [user, pendingRequests]);

    // Get user's own requests
    const getMyRequests = useCallback(() => {
        if (!user) return [];
        return pendingRequests.filter(r => r.userId === user.id);
    }, [user, pendingRequests]);

    // Get user's active grants
    const getMyActiveGrants = useCallback(() => {
        if (!user) return [];
        return activeGrants.filter(g =>
            g.userId === user.id &&
            new Date(g.expiresAt).getTime() > Date.now()
        );
    }, [user, activeGrants]);

    // Get completed sessions for approver (reports)
    const getSessionReportsForApprover = useCallback(() => {
        if (!user) return [];
        return completedSessions.filter(s => s.approverUserId === user.id);
    }, [user, completedSessions]);

    // Dismiss expiry warning
    const dismissExpiryWarning = useCallback(() => {
        setShowExpiryWarning(false);
    }, []);

    return (
        <AccessRequestContext.Provider value={{
            // State
            pendingRequests,
            activeGrants,
            activityLogs,
            completedSessions,
            showRequestModal,
            requestingFeature,
            showApprovalModal,
            selectedRequest,
            showExtensionModal,
            extensionGrant,
            showRecapModal,
            recapSession,
            showExpiryWarning,
            expiringGrant,

            // Actions
            hasFeatureAccess,
            getGrantRemainingTime,
            requestAccess,
            approveRequest,
            rejectRequest,
            openRequestModal,
            openApprovalModal,
            setShowRequestModal,
            setShowApprovalModal,
            logActivity,
            requestExtension,
            earlyFinish,
            openRecapModal,
            setShowRecapModal,
            dismissExpiryWarning,
            addDemoGrant,

            // Getters
            getPendingRequestsForApprover,
            getMyRequests,
            getMyActiveGrants,
            getApproversFor: (userId) => {
                // Return approvers excluding self
                return approvers.filter(a => a.id !== userId);
            },
            getSessionReportsForApprover
        }}>
            {children}
        </AccessRequestContext.Provider>
    );
}

export function useAccessRequest() {
    const context = useContext(AccessRequestContext);
    if (!context) {
        throw new Error('useAccessRequest must be used within an AccessRequestProvider');
    }
    return context;
}

