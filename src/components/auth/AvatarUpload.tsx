'use client'

import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Upload, X } from '@phosphor-icons/react'

interface AvatarUploadProps {
  className?: string
  value?: string | null
  onChange?: (file: File | null, preview: string | null) => void
  disabled?: boolean
}

export function AvatarUpload({ className, value, onChange, disabled }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (15MB = 15 * 1024 * 1024 bytes)
    const maxSize = 15 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Avatar file size must be less than 15MB')
      e.target.value = ''
      return
    }

    // Validate file type (handle mobile browsers that may not set type correctly)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
    const fileExtension = file.name ? '.' + file.name.split('.').pop()?.toLowerCase() : ''
    const hasValidType = file.type && allowedTypes.includes(file.type.toLowerCase())
    const hasValidExtension = allowedExtensions.includes(fileExtension)
    
    if (!hasValidType && !hasValidExtension) {
      toast.error('Avatar must be an image file (JPEG, PNG, GIF, WebP, or HEIC)')
      e.target.value = ''
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      const previewUrl = reader.result as string
      setPreview(previewUrl)
      onChange?.(file, previewUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onChange?.(null, null)
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {preview ? (
        <div className="relative">
          <Avatar
            src={preview}
            alt="Avatar preview"
            size="xl"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove avatar"
              className="absolute -top-2 -right-2 rounded-full p-1.5 bg-[var(--error)] text-white hover:bg-[var(--error)]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--error)]/50 focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center bg-[var(--surface-1)]">
          <Upload className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {preview ? 'Change Avatar' : 'Upload Avatar'}
        </Button>
        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
          Max 15MB • JPEG, PNG, GIF, or WebP
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
      />
    </div>
  )
}

