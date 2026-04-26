'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth'

const NAV_ITEMS = [
  { href: '/', label: 'ホーム', icon: '📊' },
  { href: '/record', label: '記録', icon: '📝' },
  { href: '/trend', label: 'トレンド', icon: '📈' },
  { href: '/insulin', label: 'インスリン', icon: '💉' },
  { href: '/report', label: 'レポート', icon: '📋' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header className="bg-blue-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-white">Glucose Diary</h1>
        <button
          onClick={() => signOut()}
          className="text-sm text-blue-200 hover:text-white"
        >
          ログアウト
        </button>
      </header>

      {/* Bottom navigation (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 text-xs',
                pathname === item.href
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
