/**
 * Background Image Upload Helper
 * 
 * Handles uploading custom background images to Supabase Storage
 */

import { createClient } from '@/lib/supabase/server'

export interface BackgroundUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Uploads a custom background image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user ID for unique filename generation
 * @returns The public URL of the uploaded image or an error
 */
export async function uploadBackgroundImage(
  file: File,
  userId: string
): Promise<BackgroundUploadResult> {
  const supabase = await createClient()

  try {
    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Background image file size must be less than 5MB',
      }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Background must be an image file (JPEG, PNG, GIF, or WebP)',
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-bg-${Date.now()}.${fileExt}`
    const filePath = fileName

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('club-backgrounds')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Background upload error:', uploadError)
      return {
        success: false,
        error: 'Failed to upload background image. Please try again.',
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('club-backgrounds')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: urlData.publicUrl,
    }
  } catch (error) {
    console.error('Background upload error:', error)
    return {
      success: false,
      error: 'Failed to upload background image. Please try again.',
    }
  }
}

/**
 * Deletes a background image from Supabase Storage
 * @param url - The public URL of the image to delete
 * @returns Success status or error
 */
export async function deleteBackgroundImage(
  url: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Extract filename from URL
    const urlParts = url.split('/')
    const filenameIndex = urlParts.findIndex((part: string) => part === 'club-backgrounds')
    
    if (filenameIndex === -1 || !urlParts[filenameIndex + 1]) {
      return {
        success: false,
        error: 'Invalid background image URL',
      }
    }

    const filePath = urlParts[filenameIndex + 1]

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('club-backgrounds')
      .remove([filePath])

    if (deleteError) {
      console.error('Background delete error:', deleteError)
      return {
        success: false,
        error: 'Failed to delete background image.',
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Background delete error:', error)
    return {
      success: false,
      error: 'Failed to delete background image.',
    }
  }
}






















