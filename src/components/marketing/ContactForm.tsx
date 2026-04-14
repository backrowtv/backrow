'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { submitContactForm } from '@/app/actions/contact'
import toast from 'react-hot-toast'

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.name.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Please enter your email')
      return
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject')
      return
    }
    if (!formData.message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsSubmitting(true)

    try {
      const formDataToSubmit = new FormData()
      formDataToSubmit.append('name', formData.name)
      formDataToSubmit.append('email', formData.email)
      formDataToSubmit.append('subject', formData.subject)
      formDataToSubmit.append('message', formData.message)

      const result = await submitContactForm(formDataToSubmit)

      if (result.success) {
        toast.success('Thank you for your message! We\'ll get back to you soon.')
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        })
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again later.')
      console.error('Contact form error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        label="Name"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={isSubmitting}
        autoComplete="name"
      />

      <Input
        type="email"
        label="Email"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        disabled={isSubmitting}
        autoComplete="email"
      />

      <Input
        type="text"
        label="Subject"
        required
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        disabled={isSubmitting}
        maxLength={200}
        showCharacterCount
      />

      <Textarea
        label="Message"
        required
        rows={5}
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        disabled={isSubmitting}
        maxLength={2000}
        showCharacterCount
        placeholder="Tell us what's on your mind..."
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}

