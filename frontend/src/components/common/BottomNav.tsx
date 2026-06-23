import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    ),
  },
  {
    to: '/practice',
    label: 'Practice',
    icon: (
      <path d="M12 4v16m0-16a3 3 0 0 0-3 3v1m3-4a3 3 0 0 1 3 3v1M6 8h12M6 8v8a3 3 0 0 0 3 3m9-11v8a3 3 0 0 1-3 3" />
    ),
  },
  {
    to: '/exam',
    label: 'Exam',
    icon: (
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-4H4v4ZM14 4v4h6V4h-6Z" />
    ),
  },
];

/**
 * Mobile-only bottom tab bar. Hidden on >= md (desktop keeps the top NavBar).
 * Mirrors the destinations of the desktop NavBar.
 */
export default function BottomNav() {
  const { pathname } = useLocation();

  // Hidden during an active exam to avoid distraction (mirrors the top NavBar).
  if (pathname === '/exam') return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] safe-bottom"
      style={{ height: 'calc(var(--bottom-nav-h) + var(--safe-bottom))' }}
      aria-label="Primary"
    >
      <ul className="flex h-[var(--bottom-nav-h)] items-stretch">
        {ITEMS.map((item) => {
          const active = pathname === item.to;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-[#0072CE]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-full px-4 py-1 transition-colors ${
                    active ? 'bg-blue-50' : ''
                  }`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.icon}
                  </svg>
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
