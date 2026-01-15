'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShareNetwork, Check } from '@phosphor-icons/react'
import toast from 'react-hot-toast'

interface FestivalShareButtonProps {
  festivalSlug: string
  clubSlug: string
  theme: string | null
}

export function FestivalShareButton({ festivalSlug, clubSlug, theme }: FestivalShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const festivalUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/club/${clubSlug}/festival/${festivalSlug}`
    : ''

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: theme || 'Festival',
          text: `Check out this festival: ${theme || 'Festival'}`,
          url: festivalUrl,
        })
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          handleCopy()
        }
      }
    } else {
      handleCopy()
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(festivalUrl)
      setCopied(true)
      toast.success('Festival link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <ShareNetwork className="w-4 h-4" />
          Share
        </>
      )}
    </Button>
  )
}

