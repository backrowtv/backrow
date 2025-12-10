'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PollForm } from './PollForm'
import { ChartBar } from '@phosphor-icons/react'

interface CreatePollModalProps {
  clubId: string
  trigger?: React.ReactNode
}

export function CreatePollModal({ clubId, trigger }: CreatePollModalProps) {
  const [open, setOpen] = useState(false)

  const defaultTrigger = (
    <Button variant="club-accent">
      <ChartBar className="h-4 w-4 mr-2" />
      Create Poll
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[550px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChartBar className="h-5 w-5" />
            Create Poll
          </DialogTitle>
        </DialogHeader>
        <PollForm clubId={clubId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
