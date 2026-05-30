'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { Nav } from '@/components/Nav'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const supabase = createClient()

  const handleGoogle = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage({ text: error.message, ok: false })
      else setMessage({ text: 'Account created — check your email to confirm, then sign in.', ok: true })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ text: error.message, ok: false })
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })
    if (error) setMessage({ text: error.message, ok: false })
    else setMessage({ text: 'Magic link sent — check your inbox.', ok: true })
    setLoading(false)
  }

  return (
    <>
      <Nav />
      <main className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="font-formula text-2xl text-ink-1000">Sign in to manage your listing</h1>
            <p className="text-ink-500 text-sm mt-1">Update hours, photos, and details for your business.</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-ink-200 rounded-lg px-4 py-3 font-semibold text-sm hover:bg-ink-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-ink-300 text-xs">
            <div className="flex-1 h-px bg-ink-150" />
            <span className="uppercase tracking-wider font-narrow">or</span>
            <div className="flex-1 h-px bg-ink-150" />
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-ink-150 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('password'); setMessage(null) }}
              className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${mode === 'password' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('magic'); setMessage(null) }}
              className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${mode === 'magic' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`}
            >
              Magic link
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink-900 text-white py-3 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors disabled:opacity-50"
              >
                {loading ? '…' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
                className="w-full text-sm text-ink-500 hover:text-ink-900 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full border border-ink-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink-900 text-white py-3 rounded-lg font-semibold text-sm hover:bg-ink-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
              <p className="text-xs text-ink-400 text-center">We'll email you a one-click sign-in link — no password needed.</p>
            </form>
          )}

          {message && (
            <p className={`text-sm text-center font-medium ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
        </div>
      </main>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.108 17.64 11.8 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
