'use client'

import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { AuthForm } from '@/components/auth-form'
import { Navigation } from '@/components/navigation'
import { InsulinSettings } from '@/components/insulin-settings'

function InsulinContent() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>
  if (!user) return <AuthForm />
  return (
    <>
      <Navigation />
      <main className="flex-1 pb-20 pt-2">
        <InsulinSettings userId={user.id} />
      </main>
    </>
  )
}

export default function InsulinPage() {
  return <AuthProvider><InsulinContent /></AuthProvider>
}
