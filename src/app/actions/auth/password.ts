'use server'

/**
 * Password Management Actions
 *
 * Functions for managing user passwords.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Change password using current password verification
 * @deprecated Use sendPasswordResetEmail instead for better security
 */
export async function changePassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return { error: 'You must be signed in to change your password' }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validate inputs
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All password fields are required' }
  }

  // Validate password length (8+ characters)
  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  // Validate password strength requirements
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword)

  if (!hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      error:
        'Password must contain at least one uppercase letter, one number, and one special character',
    }
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  // Validate new password is different from current
  if (currentPassword === newPassword) {
    return { error: 'New password must be different from your current password' }
  }

  // Verify current password by attempting to sign in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verifyError) {
    return { error: 'Current password is incorrect' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { error: updateError.message || 'Failed to update password' }
  }

  return { success: true, message: 'Password updated successfully' }
}

export async function resetPassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string

  // Validate input
  if (!email) {
    return { error: 'Email is required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: 'Please enter a valid email address' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  // Always return success message (don't reveal if email exists)
  return {
    success: true,
    message: "If an account with that email exists, we've sent you a password reset link.",
  }
}

/**
 * Send password reset email for logged-in user (from account settings)
 */
export async function sendPasswordResetEmail(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in' }
  }

  const email = formData.get('email') as string

  // Verify the email matches the logged-in user
  if (email !== user.email) {
    return { error: 'Email mismatch' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { error: 'Unable to send reset email. Please try again.' }
  }

  return { success: true, message: 'Password reset link sent to your email' }
}

export async function updatePassword(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be signed in to update your password' }
  }

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validate inputs
  if (!password || !confirmPassword) {
    return { error: 'All password fields are required' }
  }

  // Validate password length
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  // Validate password strength requirements
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  if (!hasUppercase || !hasNumber || !hasSpecialChar) {
    return {
      error:
        'Password must contain at least one uppercase letter, one number, and one special character',
    }
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: password,
  })

  if (updateError) {
    return { error: updateError.message || 'Failed to update password' }
  }

  // Revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/')
}
