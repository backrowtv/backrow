'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FestivalResultsModal } from '@/components/results/FestivalResultsModal'

interface ViewResultsButtonProps {
  festivalId: string
}

export function ViewResultsButton({ festivalId }: ViewResultsButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setModalOpen(true)}
        className="w-full"
      >
        View Results
      </Button>
      <FestivalResultsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        festivalId={festivalId}
      />
    </>
  )
}

