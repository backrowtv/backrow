import { redirect } from 'next/navigation'

// Redirect old route to new club creation wizard
export default function NewClubPage() {
  redirect('/create-club')
}
