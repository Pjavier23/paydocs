'use client'

import Link from 'next/link'
import { useLang } from './LanguageContext'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { lang, setLang, t } = useLang()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="bg-ink text-white px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-display text-xl text-accent tracking-tight">
        PayDocs
      </Link>
      <div className="flex items-center gap-6">
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-accent transition-colors"
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </button>

        {user ? (
          <>
            <Link
              href="/bookkeeping"
              className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-accent transition-colors"
            >
              Bookkeeping
            </Link>
            <Link
              href="/dashboard"
              className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              {t('nav_dashboard')}
            </Link>
            <button
              onClick={handleLogout}
              className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              {t('nav_logout')}
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className="font-mono text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
          >
            {t('nav_login')}
          </Link>
        )}
      </div>
    </nav>
  )
}
