/**
 * Auth Actions
 *
 * Re-exports all authentication-related server actions from organized modules.
 */

// Sign in/out functions
export { signIn, signInTestUser, signInWithMagicLink, signOut, signOutTest } from './signin'

// Registration
export { signUp } from './signup'

// Password management
export { changePassword, resetPassword, sendPasswordResetEmail, updatePassword } from './password'

// Account management
export { changeEmail, deleteAccount } from './account'

// Profile management
export { updateProfile, getUserProfile } from './profile'
