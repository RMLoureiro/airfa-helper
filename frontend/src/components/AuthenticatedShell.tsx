"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const navigation = [
  { href: '/home', label: 'Início' },
  { href: '/presencas', label: 'Presenças' },
  { href: '/events', label: 'Eventos' },
  { href: '/instrumentos', label: 'Instrumentos' },
  { href: '/repertorio', label: 'Repertório' },
  { href: '/notificacoes', label: 'Notificações' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/perfil', label: 'Sobre mim' },
  { href: '/membros', label: 'Membros' },
];

type AuthenticatedShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AuthenticatedShell({ title, subtitle, children }: AuthenticatedShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [musicalRole, setMusicalRole] = useState('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('airfa_theme') !== 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    const storedUser = localStorage.getItem('airfa_user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { name?: string; system_role?: string; musical_role?: string };
        setName(parsed.name ?? '');
        setRole(parsed.system_role ?? '');
        setMusicalRole(parsed.musical_role ?? '');
      } catch {
        setName('');
        setRole('');
        setMusicalRole('');
      }
    }

    setReady(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('airfa_token');
    localStorage.removeItem('airfa_user');
    router.push('/login');
  }

  function toggleTheme() {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('airfa_theme', next ? 'dark' : 'light');
      return next;
    });
  }

  const activeNav = pathname ?? '/home';
  const canSeeMembers = role === 'ADMIN' || role === 'SUPER_ADMIN';

  if (!ready) {
    return <main className="shell-loading">A carregar...</main>;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">banda airfa</span>

        <nav className="nav">
          {navigation
            .filter((item) => item.href !== '/membros' || canSeeMembers)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${activeNav === item.href ? 'active' : ''}`.trim()}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="user-area">
          <button
            type="button"
            className={`theme-toggle${darkMode ? ' is-dark' : ' is-light'}`}
            onClick={toggleTheme}
            aria-label={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            <span className="toggle-track">
              <span className="toggle-thumb">
                <svg className="icon-moon" viewBox="0 0 24 24" width="13" height="13" fill="white" aria-hidden="true">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
                </svg>
                <svg className="icon-sun" viewBox="0 0 24 24" width="13" height="13" fill="#fcd34d" aria-hidden="true">
                  <circle cx="12" cy="12" r="4"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(45 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(90 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(135 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(180 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(225 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(270 12 12)"/>
                  <rect x="11" y="1.5" width="2" height="3.5" rx="1" transform="rotate(315 12 12)"/>
                </svg>
              </span>
            </span>
          </button>
          <div className="user-info">
            <strong>{name || 'Utilizador'}</strong>
            <div className="user-badges">
              {musicalRole && (
                <span className="user-badge badge-musical">
                  {{
                    MAESTRO: 'Maestro',
                    FLUTE_PLAYER: 'Flautista',
                    CLARINET_PLAYER: 'Clarinete',
                    SAXOPHONE_PLAYER: 'Saxofone',
                    TROMBONE_PLAYER: 'Trombone',
                    EUPHONIUM_PLAYER: 'Eufônio',
                    TUBA_PLAYER: 'Tuba',
                    FRENCH_HORN_PLAYER: 'Trompa',
                    TRUMPET_PLAYER: 'Trompete',
                    PERCUSSION_PLAYER: 'Percussão',
                  }[musicalRole] ?? musicalRole}
                </span>
              )}
              {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                <span className={`user-badge badge-role-${role === 'SUPER_ADMIN' ? 'super' : 'admin'}`}>
                  {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="content">
        {(title || subtitle) && (
          <div className="page-header">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        )}
        {children}
      </main>

      <style jsx>{`
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg, #0d1117);
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 28px;
          height: 64px;
          background: var(--topbar-bg);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px);
        }

        .brand {
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 18px;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 3px 10px;
        }

        .nav::-webkit-scrollbar {
          display: none;
        }

        .nav :global(a.nav-link) {
          padding: 9px 20px;
          border-radius: 12px;
          border: 1px solid var(--nav-link-border);
          background: var(--nav-link-bg);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          color: var(--muted, #8b949e);
          letter-spacing: 0.01em;
          transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s;
        }

        .nav :global(a.nav-link:hover),
        .nav :global(a.nav-link:focus-visible) {
          color: var(--text, #e6edf3);
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.18), rgba(56, 189, 248, 0.1));
          border-color: rgba(125, 211, 252, 0.45);
          box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.2), 0 4px 10px rgba(56, 189, 248, 0.18);
          transform: translateY(-1px) scale(1.01);
          outline: none;
        }

        .nav :global(a.nav-link.active) {
          color: var(--nav-active-color);
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.3), rgba(56, 189, 248, 0.16));
          border-color: rgba(125, 211, 252, 0.55);
          box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.25), 0 8px 18px rgba(56, 189, 248, 0.18);
        }

        .nav :global(a.nav-link.active:hover),
        .nav :global(a.nav-link.active:focus-visible) {
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.34), rgba(56, 189, 248, 0.2));
          border-color: rgba(125, 211, 252, 0.65);
          box-shadow: 0 0 0 1px rgba(125, 211, 252, 0.28), 0 6px 12px rgba(56, 189, 248, 0.24);
          transform: translateY(-1px) scale(1.01);
          outline: none;
        }

        .user-area {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.3;
          gap: 4px;
        }

        .user-info strong {
          font-size: 14px;
        }

        .user-badges {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .user-badge {
          display: inline-block;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight: 600;
          line-height: 1.4;
        }

        .badge-musical {
          background: rgba(125,211,252,0.12);
          color: #7dd3fc;
          border: 1px solid rgba(125,211,252,0.28);
        }

        .badge-role-admin {
          background: rgba(251,191,36,0.14);
          color: #fbbf24;
          border: 1px solid rgba(251,191,36,0.28);
        }

        .badge-role-super {
          background: rgba(167,139,250,0.14);
          color: #a78bfa;
          border: 1px solid rgba(167,139,250,0.28);
        }

        .user-area button:not(.theme-toggle) {
          border: 1px solid rgba(251, 113, 133, 0.35);
          border-radius: 10px;
          padding: 6px 14px;
          background: rgba(251, 113, 133, 0.12);
          color: var(--text, #e6edf3);
          font-size: 13px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .user-area button:not(.theme-toggle):hover {
          background: rgba(251, 113, 133, 0.25);
        }

        .content {
          flex: 1;
          padding: 28px 24px;
          overflow: hidden;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 4px;
          font-size: 1.75rem;
          line-height: 1;
        }

        .page-header p {
          margin: 0;
          color: var(--muted, #8b949e);
        }

        .shell-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
        }

        @media (max-width: 768px) {
          .topbar {
            flex-wrap: wrap;
            height: auto;
            padding: 12px 16px;
            gap: 12px;
          }

          .nav {
            order: 3;
            width: 100%;
          }
        }

        .theme-toggle {
          border: none;
          padding: 0;
          background: transparent !important;
          cursor: pointer;
          flex-shrink: 0;
          outline: none;
        }

        .toggle-track {
          position: relative;
          display: block;
          background: rgba(125, 211, 252, 0.08);
          border: 1px solid rgba(125, 211, 252, 0.25);
          border-radius: 999px;
          width: 64px;
          height: 34px;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .theme-toggle:hover .toggle-track {
          background: rgba(125, 211, 252, 0.14);
          border-color: rgba(125, 211, 252, 0.5);
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.1);
        }

        .toggle-icon {
          display: none;
        }

        .toggle-moon {
          display: none;
        }

        .toggle-sun {
          display: none;
        }

        .theme-toggle.is-light .toggle-moon {
          display: none;
        }

        .theme-toggle.is-light .toggle-sun {
          display: none;
        }

        .toggle-thumb {
          position: absolute;
          top: 5px;
          left: 5px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          transition: left 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 2;
          display: grid;
          place-items: center;
        }

        .icon-moon,
        .icon-sun {
          grid-row: 1;
          grid-column: 1;
          display: block;
          transition: opacity 0.2s;
        }

        .icon-moon {
          opacity: 1;
        }

        .icon-sun {
          opacity: 0;
        }

        .theme-toggle.is-light .icon-moon {
          opacity: 0;
        }

        .theme-toggle.is-light .icon-sun {
          opacity: 1;
        }

        .theme-toggle.is-light .toggle-thumb {
          left: calc(100% - 29px);
        }

        :global(html.light) .toggle-track {
          background: rgba(14, 165, 233, 0.1);
          border-color: rgba(14, 165, 233, 0.3);
        }

        :global(html.light) .theme-toggle:hover .toggle-track {
          background: rgba(14, 165, 233, 0.18);
          border-color: rgba(14, 165, 233, 0.5);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
        }

        :global(html.light) .badge-musical {
          background: rgba(14, 165, 233, 0.18);
          color: #0284c7;
          border-color: rgba(14, 165, 233, 0.45);
        }

        :global(html.light) .badge-role-admin {
          background: rgba(245, 158, 11, 0.18);
          color: #b45309;
          border-color: rgba(245, 158, 11, 0.45);
        }

        :global(html.light) .badge-role-super {
          background: rgba(139, 92, 246, 0.18);
          color: #7c3aed;
          border-color: rgba(139, 92, 246, 0.45);
        }

        :global(html.light) .user-area button:not(.theme-toggle) {
          border-color: rgba(239, 68, 68, 0.45);
          background: rgba(239, 68, 68, 0.1);
        }

        :global(html.light) .user-area button:not(.theme-toggle):hover {
          background: rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  );
}
