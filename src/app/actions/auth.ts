/**
 * Auth Actions - Re-export Module
 *
 * This file re-exports all authentication-related server actions from the auth/ subdirectory.
 * For new imports, prefer importing directly from '@/app/actions/auth'.
 *
 * NOTE: 'use server' is NOT used here because re-exports are not allowed in server action files.
 * Each sub-module has its own 'use server' directive.
 *
 * @see src/app/actions/auth/signin.ts - Sign in/out functions
 * @see src/app/actions/auth/signup.ts - Registration
 * @see src/app/actions/auth/password.ts - Password management
 * @see src/app/actions/auth/account.ts - Account management (email, deletion)
 * @see src/app/actions/auth/profile.ts - Profile management
 */

// Re-export all auth functions for backward compatibility
export {
  // Sign in/out
  signIn,
  signInTestUser,
  signInWithMagicLink,
  signOut,
  signOutTest,
  // Registration
  signUp,
  resendSignUpConfirmation,
  // Password management
  changePassword,
  resetPassword,
  sendPasswordResetEmail,
  updatePassword,
  // Account management
  changeEmail,
  // Profile management
  updateProfile,
  getUserProfile,
} from "./auth/index";
