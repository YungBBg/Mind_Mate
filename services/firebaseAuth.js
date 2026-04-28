import { auth } from '../firebase/config.js';  // 你的 config.js 路徑
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 如果有 displayName，更新使用者資料
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    console.log('Signup success - Real Firebase displayName:', user.displayName);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || undefined,
      createdAt: new Date().toISOString(),
    };
    } catch (error) {
    console.error('Signup error details:', error.code, error.message);  // ← Add this line!
    let friendlyMessage = 'Sign up failed. Please try again.';
    
    switch (error.code) {
      case 'auth/operation-not-allowed':
        friendlyMessage = 'Email/Password sign-up is not enabled in Firebase Console.';
        break;
      case 'auth/invalid-email':
        friendlyMessage = 'Invalid email format.';
        break;
      case 'auth/email-already-in-use':
        friendlyMessage = 'This email is already registered.';
        break;
      case 'auth/weak-password':
        friendlyMessage = 'Password is too weak (must be at least 6 characters).';
        break;
      case 'auth/network-request-failed':
        friendlyMessage = 'Network error - check your internet connection.';
        break;
      default:
        friendlyMessage = error.message || 'Unknown error';
    }
    
    throw new Error(friendlyMessage);
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Login success - Real Firebase displayName:', user.displayName);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || undefined,
    };
  } catch (error) {
    console.error('Login error details:', error.code, error.message);  // ← for debugging

    let friendlyMessage = 'Login failed. Please try again.';
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        friendlyMessage = 'Invalid email or password.';
        break;
      case 'auth/invalid-email':
        friendlyMessage = 'Invalid email format.';
        break;
      case 'auth/user-disabled':
        friendlyMessage = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        friendlyMessage = 'Too many attempts. Try again later.';
        break;
      default:
        friendlyMessage = error.message || 'Unknown error';
    }

    throw new Error(friendlyMessage);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw new Error('Logout failed');
  }
};

// 監聽登入狀態（取代原本的 onAuthStateChanged）
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || undefined,
      });
    } else {
      callback(null);
    }
  });
};