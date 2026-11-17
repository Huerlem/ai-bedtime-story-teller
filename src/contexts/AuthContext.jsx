'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase/firebaseConfig';
import { loginUser, logoutUser, registerUser } from '@/firebase/auth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Create context
const AuthContext = createContext();

// Auto-logout configuration
const IDLE_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes warning before logout

/**
 * Hook to use the auth context
 * 
 * @returns {Object} Auth context values
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

/**
 * Auth provider component with auto-logout functionality
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Auth provider component
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showIdleWarning, setShowIdleWarning] = useState(false);
    const router = useRouter();

    // Refs for timers
    const idleTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    /**
     * Clear all idle timers
     */
    const clearIdleTimers = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
    }, []);

    /**
     * Handle auto-logout due to inactivity
     */
    const handleAutoLogout = useCallback(async () => {
        console.log('🔄 Auto-logout triggered due to inactivity');
        setShowIdleWarning(false);
        clearIdleTimers();
        
        try {
            await logoutUser();
            
            // Clear any legacy role cookie written by older builds.
            document.cookie = 'user=;Max-Age=0; path=/';
            
            // Clear user state
            setUser(null);
            
            // Redirect to login with message
            router.push('/login?reason=idle');
        } catch (error) {
            console.error('❌ Error during auto-logout:', error);
        }
    }, [router, clearIdleTimers]);

    /**
     * Show warning before auto-logout
     */
    const showWarning = useCallback(() => {
        console.log('⚠️ Showing idle warning');
        setShowIdleWarning(true);
        
        // Set timer for actual logout
        idleTimerRef.current = setTimeout(() => {
            handleAutoLogout();
        }, WARNING_TIME);
    }, [handleAutoLogout]);

    /**
     * Reset idle timer
     */
    const resetIdleTimer = useCallback(() => {
        if (!user) return;
        
        lastActivityRef.current = Date.now();
        setShowIdleWarning(false);
        clearIdleTimers();
        
        // Set warning timer
        warningTimerRef.current = setTimeout(() => {
            showWarning();
        }, IDLE_TIME - WARNING_TIME);
        
        console.log('⏰ Idle timer reset');
    }, [user, clearIdleTimers, showWarning]);

    /**
     * Handle user activity
     */
    const handleUserActivity = useCallback(() => {
        if (user && Date.now() - lastActivityRef.current > 1000) { // Throttle to once per second
            resetIdleTimer();
        }
    }, [user, resetIdleTimer]);

    /**
     * Extend session (dismiss warning)
     */
    const extendSession = useCallback(() => {
        console.log('✅ Session extended by user');
        resetIdleTimer();
    }, [resetIdleTimer]);

    /**
     * Function to refresh user data from Firestore
     */
    const refreshUser = async () => {
        if (auth.currentUser) {
            try {
                console.log('🔄 Refreshing user data...');
                
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const updatedUserData = {
                        uid: auth.currentUser.uid,
                        email: auth.currentUser.email,
                        displayName: auth.currentUser.displayName,
                        ...userData
                    };
                    
                    
                    setUser(updatedUserData);
                    console.log('✅ User data refreshed successfully');
                } else {
                    console.warn('❌ User document not found in Firestore during refresh');
                }
            } catch (error) {
                console.error('❌ Error refreshing user data:', error);
            }
        } else {
            console.warn('❌ No authenticated user to refresh');
        }
    };

    // Register a new user
    const register = async (email, password, displayName) => {
        try {
            const newUser = await registerUser(email, password, displayName);
            return newUser;
        } catch (error) {
            console.error('❌ Register error:', error);
            throw error;
        }
    };

    // Log in a user
    const login = async (email, password) => {
        try {
            const user = await loginUser(email, password);

            // No role cookie is written: routing hints from the browser are never an
            // authorization boundary. Server routes verify Firebase ID tokens and
            // Firestore/Storage rules enforce family ownership.
            return user;
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    };

    // Log out the current user
    const logout = async () => {
        try {
            console.log('🚪 Logging out user');
            
            // Clear timers before logout
            clearIdleTimers();
            setShowIdleWarning(false);
            
            await logoutUser();

            // Clear any legacy role cookie written by older builds.
            document.cookie = 'user=;Max-Age=0; path=/';
            
            router.push('/login');
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    };

    // Set up activity listeners
    useEffect(() => {
        if (!user) return;

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const throttledHandler = (() => {
            let timeout = null;
            return () => {
                if (!timeout) {
                    timeout = setTimeout(() => {
                        handleUserActivity();
                        timeout = null;
                    }, 1000);
                }
            };
        })();

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, throttledHandler, true);
        });

        // Initialize timer
        resetIdleTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, throttledHandler, true);
            });
            clearIdleTimers();
        };
    }, [user, handleUserActivity, resetIdleTimer, clearIdleTimers]);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            try {
                
                if (authUser) {
                    console.log('📁 Getting user document from Firestore...');
                    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
                
                    if (userDoc.exists()) {
                        const firestoreData = userDoc.data();
                        
                        const combinedUserData = {
                            uid: authUser.uid,
                            email: authUser.email,
                            displayName: authUser.displayName,
                            ...firestoreData
                        };
                        
                        
                        setUser(combinedUserData);
                    } else {
                        console.warn('⚠️ User exists in Auth but not in Firestore - creating default document');
                        const defaultData = {
                            email: authUser.email,
                            displayName: authUser.displayName || '',
                            role: 'parent',
                            familyId: authUser.uid,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };

                        await setDoc(doc(db, 'users', authUser.uid), defaultData, { merge: true });

                        const newUserData = {
                            uid: authUser.uid,
                            ...defaultData
                        };
                        
                        setUser(newUserData);
                    }
                } else {
                    // User is signed out - clear timers
                    clearIdleTimers();
                    setShowIdleWarning(false);
                    setUser(null);
                    console.log('🚪 User signed out');
                }
            } catch (error) {
                console.error('❌ Auth state change error:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [clearIdleTimers]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearIdleTimers();
        };
    }, [clearIdleTimers]);

    useEffect(() => {
        if (typeof window !== 'undefined' && user?.role === 'child') {
            const currentPath = window.location.pathname;
            
            // If child somehow ends up on dashboard, redirect them to home
            if (currentPath === '/dashboard') {
                console.log('🔄 AuthContext: Child detected on dashboard, redirecting to home');
                router.push('/');
            }
        }
    }, [user, router]);

    // Provide authentication context value
    const value = {
        user,
        loading,
        register,
        login,
        logout,
        refreshUser,
        showIdleWarning,
        extendSession,
        handleAutoLogout
    };

    // Show loading screen while initializing
    if (loading) {
        return <LoadingSpinner fullScreen message="Loading..." />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
            
            {/* Idle Warning Modal */}
            {showIdleWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Session Timeout Warning
                                </h3>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-500">
                                You will be automatically logged out in 5 minutes due to inactivity. 
                                Click "Stay Logged In" to extend your session.
                            </p>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleAutoLogout}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                Logout Now
                            </button>
                            <button
                                onClick={extendSession}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                            >
                                Stay Logged In
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export default AuthContext;