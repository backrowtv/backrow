'use client'

import * as React from 'react'
import { Input, InputProps } from './input'

export interface TextareaProps
  extends Omit<InputProps, 'type'> {
  rows?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ rows = 4, ...props }, ref) => {
    return (
      <Input
        type="textarea"
        rows={rows}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }

