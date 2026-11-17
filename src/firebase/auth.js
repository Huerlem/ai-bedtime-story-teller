import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

/**
 * Register a new user
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User object
 */
export const registerUser = async (email, password, displayName) => {
    try {
        // Only adult account-holders can register. Children are profiles created by a
        // parent (see createChildAccount); a client-chosen role or familyId is never
        // accepted. Firestore rules enforce the same invariant server-side.
        const role = 'parent';

        // Create the user in Firebase Auth (fails with auth/email-already-in-use if taken;
        // avoids the email-enumeration API fetchSignInMethodsForEmail).
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update the user profile with display name
        await updateProfile(user, { displayName });
        
        // A parent's family is identified by their own uid.
        const familyId = user.uid;

        //Verify if document already exist on Firebase
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        // Create user document in Firestore
        if (!docSnap.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
                email,
                displayName,
                role,
                familyId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        return user;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

/**
 * Log in a user
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
};

/**
 * Log out the current user
 * 
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
};

/**
 * Send a password reset email
 * 
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

/**
 * Update user's display name
 * 
 * @param {string} displayName - New display name
 * @returns {Promise<void>}
 */
export const updateUserDisplayName = async (displayName) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user is logged in');
        
        // Update in Firebase Auth
        await updateProfile(user, { displayName });
        
        // Update in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            displayName,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating display name:', error);
        throw error;
    }
};

/**
 * Update user's email address
 * 
 * @param {string} newEmail - New email address
 * @param {string} password - Current password for verification
 * @returns {Promise<void>}
 */
export const updateUserEmail = async (newEmail, password) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user is logged in');
        
        // Re-authenticate user before sensitive operations
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        
        // Update in Firebase Auth
        await updateEmail(user, newEmail);
        
        // Update in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: newEmail,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating email:', error);
        throw error;
    }
};

/**
 * Update user's password
 * 
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const updateUserPassword = async (currentPassword, newPassword) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user is logged in');
        
        // Re-authenticate user before sensitive operations
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password in Firebase Auth
        await updatePassword(user, newPassword);
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
};