'use client'

import { createClient } from '@/lib/supabase-browser'
import { Nav } from '@/components/Nav'

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient()
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  return (
    <>
      <Nav />
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <h1 className="font-formula text-3xl text-ink-1000">Sign in to manage your listing</h1>
          <button
            onClick={handleLogin}
            className="bg-ink-1000 text-white px-6 py-3 rounded-full font-semibold hover:bg-ink-800 transition-colors"
          >
            Continue with Google
          </button>
        </div>
      </main>
    </>
  )
}
