import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, getUser } from '../services/userApi';

// Define roles and their permissions
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    MANAGER: 'manager',
    SALES_MANAGER: 'sales_manager',
    SALES: 'sales',
    ADMIN_SALES: 'admin_sales',
    SENIOR_TECHNICIAN: 'senior_technician',
    TECHNICIAN: 'technician',
    WAREHOUSE: 'warehouse',
    QC: 'qc',
    PURCHASING: 'purchasing',
    FINANCE: 'finance',
    DELIVERY: 'delivery',
    DEVELOPER: 'developer'
};

// Role configurations with permissions
export const ROLE_CONFIG = {
    [ROLES.DEVELOPER]: {
        label: 'Developer',
        icon: '💻',
        color: '#000000',
        permissions: ['*'],
        canEditHPP: true,
        canApproveQuotation: true,
        canAccessKiosk: true,
        canAccessAllMachines: true,
        isHidden: true // Flag to hide from UI management
    },
    [ROLES.SUPER_ADMIN]: {
        label: 'Super Admin',
        icon: '👑',
        color: '#9c27b0',
        permissions: ['*'],
        canEditHPP: true,
        canApproveQuotation: true,
        canAccessKiosk: true,
        canAccessAllMachines: true
    },
    [ROLES.MANAGER]: {
        label: 'Manager',
        icon: '🎯',
        color: '#673ab7',
        permissions: ['dashboard', 'production', 'inventory', 'sales', 'rma', 'analytics', 'vendor', 'predictive', 'manager'],
        canEditHPP: true,
        canApproveQuotation: true,
        canAccessKiosk: true,
        canAccessAllMachines: true
    },
    [ROLES.SALES_MANAGER]: {
        label: 'Sales Manager',
        icon: '💼',
        color: '#2196f3',
        permissions: ['dashboard', 'sales', 'inventory', 'analytics', 'manager', 'predictive'],
        canEditHPP: true,
        canApproveQuotation: true,
        canAccessKiosk: false,
        canAccessAllMachines: false
    },
    [ROLES.SALES]: {
        label: 'Sales',
        icon: '🤝',
        color: '#4caf50',
        permissions: ['dashboard', 'sales', 'inventory', 'production', 'predictive'],
        canEditHPP: true,
        canApproveQuotation: false,
        canAccessKiosk: true,
        canAccessAllMachines: false
    },
    [ROLES.ADMIN_SALES]: {
        label: 'Admin Sales',
        icon: '📝',
        color: '#00bcd4',
        permissions: ['dashboard', 'sales', 'inventory'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: false,
        canAccessAllMachines: false
    },
    [ROLES.SENIOR_TECHNICIAN]: {
        label: 'Teknisi Senior',
        icon: '🔧',
        color: '#ff9800',
        permissions: ['dashboard', 'production', 'inventory', 'rma'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: true,
        canAccessAllMachines: true
    },
    [ROLES.TECHNICIAN]: {
        label: 'Teknisi',
        icon: '🛠️',
        color: '#ff5722',
        permissions: ['dashboard', 'production'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: true,
        canAccessAllMachines: false
    },
    [ROLES.WAREHOUSE]: {
        label: 'Warehouse',
        icon: '📦',
        color: '#795548',
        permissions: ['dashboard', 'inventory', 'inbound', 'rma'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: false,
        canAccessAllMachines: false
    },
    [ROLES.QC]: {
        label: 'Quality Control',
        icon: '✅',
        color: '#607d8b',
        permissions: ['dashboard', 'qc', 'production', 'rma', 'inbound'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: true,
        canAccessAllMachines: false
    },
    [ROLES.PURCHASING]: {
        label: 'Purchasing',
        icon: '🛒',
        color: '#3f51b5',
        permissions: ['dashboard', 'inventory', 'vendor', 'inbound'],
        canEditHPP: true,
        canApproveQuotation: false,
        canAccessKiosk: false,
        canAccessAllMachines: false
    },
    [ROLES.FINANCE]: {
        label: 'Finance',
        icon: '💰',
        color: '#009688',
        permissions: ['dashboard', 'analytics', 'sales', 'admin'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: false,
        canAccessAllMachines: false
    },
    [ROLES.DELIVERY]: {
        label: 'Delivery',
        icon: '🚚',
        color: '#e91e63',
        permissions: ['dashboard', 'dispatch'],
        canEditHPP: false,
        canApproveQuotation: false,
        canAccessKiosk: false,
        canAccessAllMachines: false
    }
};

// MOCK_USERS removed - using backend API
// export const MOCK_USERS = ...

// Generate simple device fingerprint
const getDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device Fingerprint', 2, 2);

    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
    ].join('|');

    // Simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'DEV-' + Math.abs(hash).toString(16).toUpperCase();
};

// Auth Context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deviceId, setDeviceId] = useState(null);
    const [devicePins, setDevicePins] = useState({}); // { pin: userId }
    const [hasPinSetup, setHasPinSetup] = useState(false);

    // Initialize device fingerprint and load saved data
    useEffect(() => {
        const fingerprint = getDeviceFingerprint();
        setDeviceId(fingerprint);

        // Load saved session
        const savedUser = localStorage.getItem('hosepro_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse saved user", e);
                localStorage.removeItem('hosepro_user');
            }
        }

        // Load device-bound PINs
        const savedPins = localStorage.getItem(`hosepro_pins_${fingerprint}`);
        if (savedPins) {
            try {
                setDevicePins(JSON.parse(savedPins));
                setHasPinSetup(true);
            } catch (e) {
                console.error("Failed to parse saved pins", e);
                localStorage.removeItem(`hosepro_pins_${fingerprint}`);
            }
        }

        setIsLoading(false);
    }, []);

    // Save device PINs
    const savePins = useCallback((pins) => {
        if (deviceId) {
            localStorage.setItem(`hosepro_pins_${deviceId}`, JSON.stringify(pins));
            setDevicePins(pins);
            setHasPinSetup(Object.keys(pins).length > 0);
        }
    }, [deviceId]);

    // Login by Email + Password
    const loginByEmail = useCallback(async (email, password) => {
        try {
            const res = await loginUser(email, password);
            if (res.status === 'success') {
                const userData = {
                    ...res.data,
                    access_token: res.access_token,
                    roleConfig: ROLE_CONFIG[res.data.role],
                    loginTime: new Date().toISOString(),
                    loginMethod: 'email'
                };
                delete userData.password; // Should define backend to not send pass, but double safety
                setUser(userData);
                localStorage.setItem('hosepro_user', JSON.stringify(userData));
                return userData;
            } else {
                throw new Error(res.message || 'Login failed');
            }
        } catch (error) {
            throw error;
        }
    }, []);

    // Login by QR/Barcode (User ID)
    const loginByBarcode = useCallback(async (barcode) => {
        try {
            // Usually barcode matches ID or a specific barcode field
            // Here we assume barcode == ID (int or string)
            // But API expects int ID. The mock used "U001" etc.
            // My User model uses int ID (1, 2, 3..).
            // Frontend mock used "U001".
            // The seed script created users with int IDs.
            // I need to parse "U001" -> 1 if needed, or update seed to use custom string ID?
            // User model defined ID as Integer.
            // Let's try to query by ID. Or maybe search?
            // "U001" format suggests I should parse it.
            let userId = barcode;
            if (typeof barcode === 'string' && barcode.startsWith('U')) {
                userId = parseInt(barcode.substring(1));
            }

            const res = await getUser(userId);
            if (res.status === 'success') {
                const userData = {
                    ...res.data,
                    roleConfig: ROLE_CONFIG[res.data.role],
                    loginTime: new Date().toISOString(),
                    loginMethod: 'barcode'
                };
                delete userData.password;
                setUser(userData);
                localStorage.setItem('hosepro_user', JSON.stringify(userData));
                return userData;
            } else {
                throw new Error('Barcode tidak valid');
            }
        } catch (error) {
            throw new Error('Barcode tidak valid');
        }
    }, []);

    // Login by Device PIN
    const loginByPin = useCallback(async (pin) => {
        try {
            // Check local PIN mapping
            // Note: devicePins stores "U001" style IDs if they were saved before.
            // New users will have int IDs (1, 2).
            // devicePins: { "123456": 1, "654321": "U001" }
            const userIdRaw = devicePins[pin];

            if (!userIdRaw) {
                throw new Error('PIN tidak terdaftar di perangkat ini');
            }

            // Normalize ID
            let userId = userIdRaw;
            if (typeof userIdRaw === 'string' && userIdRaw.startsWith('U')) {
                userId = parseInt(userIdRaw.substring(1));
            }

            const res = await getUser(userId);
            if (res.status === 'success') {
                const userData = {
                    ...res.data,
                    roleConfig: ROLE_CONFIG[res.data.role],
                    loginTime: new Date().toISOString(),
                    loginMethod: 'pin'
                };
                delete userData.password;
                setUser(userData);
                localStorage.setItem('hosepro_user', JSON.stringify(userData));
                return userData;
            } else {
                throw new Error('User tidak ditemukan');
            }
        } catch (error) {
            throw new Error(error.message || 'Login gagal');
        }
    }, [devicePins]);

    // Setup PIN for current user on this device
    const setupPin = useCallback((pin) => {
        return new Promise((resolve, reject) => {
            if (!user) {
                reject(new Error('Anda harus login terlebih dahulu'));
                return;
            }

            if (pin.length < 4 || pin.length > 6) {
                reject(new Error('PIN harus 4-6 digit'));
                return;
            }

            // Check if PIN already used by another user on this device
            const existingUser = devicePins[pin];
            if (existingUser && existingUser !== user.id) {
                reject(new Error('PIN sudah digunakan oleh user lain di perangkat ini'));
                return;
            }

            // Remove old PIN for this user (if any)
            const newPins = { ...devicePins };
            Object.keys(newPins).forEach(p => {
                if (newPins[p] === user.id) {
                    delete newPins[p];
                }
            });

            // Set new PIN
            newPins[pin] = user.id;
            savePins(newPins);

            resolve({ message: 'PIN berhasil diaktifkan untuk perangkat ini' });
        });
    }, [user, devicePins, savePins]);

    // Remove PIN for current user
    const removePin = useCallback(() => {
        return new Promise((resolve) => {
            if (!user) return resolve();

            const newPins = { ...devicePins };
            Object.keys(newPins).forEach(p => {
                if (newPins[p] === user.id) {
                    delete newPins[p];
                }
            });
            savePins(newPins);
            resolve({ message: 'PIN berhasil dihapus dari perangkat ini' });
        });
    }, [user, devicePins, savePins]);

    // Check if current user has PIN on this device
    const userHasPin = useCallback(() => {
        if (!user) return false;
        return Object.values(devicePins).includes(user.id);
    }, [user, devicePins]);

    // Get current user's PIN (masked)
    const getUserPinMasked = useCallback(() => {
        if (!user) return null;
        const pin = Object.keys(devicePins).find(p => devicePins[p] === user.id);
        if (!pin) return null;
        return '*'.repeat(pin.length);
    }, [user, devicePins]);

    // Update user profile
    const updateProfile = useCallback((profileData) => {
        return new Promise((resolve, reject) => {
            if (!user) {
                reject(new Error('User tidak ditemukan'));
                return;
            }

            setTimeout(() => {
                try {
                    const updatedUser = {
                        ...user,
                        name: profileData.name || user.name,
                        email: profileData.email || user.email,
                        phone: profileData.phone || '',
                        address: profileData.address || '',
                        bio: profileData.bio || '',
                        photo: profileData.photo || null,
                        updatedAt: new Date().toISOString()
                    };

                    setUser(updatedUser);
                    localStorage.setItem('hosepro_user', JSON.stringify(updatedUser));
                    resolve(updatedUser);
                } catch (err) {
                    reject(new Error('Gagal memperbarui profil'));
                }
            }, 500);
        });
    }, [user]);

    // Logout
    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('hosepro_user');
    }, []);

    // Permission helpers
    const hasPermission = useCallback((permission) => {
        if (!user) return false;
        const permissions = user.roleConfig?.permissions || [];
        return permissions.includes('*') || permissions.includes(permission);
    }, [user]);

    const canAccess = useCallback((feature) => {
        if (!user) return false;
        return user.roleConfig?.[feature] ?? false;
    }, [user]);

    return (
        <AuthContext.Provider value={{
            // State
            user,
            isLoading,
            isAuthenticated: !!user,
            deviceId,
            hasPinSetup,

            // Login methods
            loginByEmail,
            loginByBarcode,
            loginByPin,
            logout,

            // Profile management
            updateProfile,

            // PIN management
            setupPin,
            removePin,
            userHasPin,
            getUserPinMasked,

            // Permission helpers
            hasPermission,
            canAccess
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
