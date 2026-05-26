"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { authFetch } from '@/lib/authFetch';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Nav icons ────────────────────────────────────────────────────────────────
function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1.5L1.5 7V14.5H6V10H10V14.5H14.5V7L8 1.5Z"/>
    </svg>
  );
}
function IconCalendarCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="12" height="12" rx="2"/>
      <path d="M5 1v4M11 1v4M2 7h12"/>
      <path d="M5.5 11l2 2 3-3"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="12" height="12" rx="2"/>
      <path d="M5 1v4M11 1v4M2 7h12"/>
    </svg>
  );
}
function IconMusic() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="6.5" cy="13" rx="3.5" ry="2.5" transform="rotate(-20 6.5 13)" fill="currentColor" stroke="none"/>
      <line x1="10" y1="2" x2="10" y2="13"/>
      <path d="M10 2 C14 3 14 7 10 9"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h8M6 8h8M6 12h8M3 4h.5M3 8h.5M3 12h.5"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2a4.5 4.5 0 0 0-4.5 4.5V10L2 12h12l-1.5-2V6.5A4.5 4.5 0 0 0 8 2z"/>
      <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0"/>
    </svg>
  );
}
function IconNewspaper() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="9" height="12" rx="1"/>
      <path d="M11 4h3v9a1 1 0 0 1-2 0V4z"/>
      <path d="M5 6h3M5 9h3M5 12h2"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="5.5" r="3"/>
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5"/>
      <path d="M1 14c0-2.8 2.2-5 5-5"/>
      <circle cx="11" cy="5" r="2.5"/>
      <path d="M11 9c2.8 0 5 2.2 5 5H7.5"/>
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2.8"/>
      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.7 3.7l1.1 1.1M11.2 11.2l1.1 1.1M3.7 12.3l1.1-1.1M11.2 4.8l1.1-1.1"/>
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>
      <path d="M11 11l3-3-3-3M14 8H6"/>
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2 4.5h14M2 9h14M2 13.5h14"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14"/>
    </svg>
  );
}

// ─── Navigation config ────────────────────────────────────────────────────────
const navigation = [
  { href: '/home',        label: 'Início',        icon: <IconHome />,          adminOnly: false },
  { href: '/presencas',   label: 'Presenças',      icon: <IconCalendarCheck />, adminOnly: false },
  { href: '/events',      label: 'Eventos',        icon: <IconCalendar />,      adminOnly: false },
  { href: '/instrumentos',label: 'Instrumentos',   icon: <IconMusic />,         adminOnly: false },
  { href: '/repertorio',  label: 'Repertório',     icon: <IconList />,          adminOnly: false },
  { href: '/notificacoes',label: 'Notificações',   icon: <IconBell />,          adminOnly: false },
  { href: '/newsletter',  label: 'Newsletter',     icon: <IconNewspaper />,     adminOnly: true  },
  { href: '/membros',     label: 'Membros',        icon: <IconUsers />,         adminOnly: true  },
];

const MUSICAL_ROLE_LABELS: Record<string, string> = {
  MAESTRO: 'Maestro', FLUTE_PLAYER: 'Flauta', CLARINET_PLAYER: 'Clarinete',
  SAXOPHONE_PLAYER: 'Saxofone', TROMBONE_PLAYER: 'Trombone', EUPHONIUM_PLAYER: 'Eufônio',
  TUBA_PLAYER: 'Tuba', FRENCH_HORN_PLAYER: 'Trompa', TRUMPET_PLAYER: 'Trompete',
  PERCUSSION_PLAYER: 'Percussão',
};

// ─── Shell ────────────────────────────────────────────────────────────────────
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('airfa_theme');
    const isDark = saved !== 'light';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setSidebarOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) { router.push('/login'); return; }

    // Check JWT expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('airfa_token');
        localStorage.removeItem('airfa_user');
        router.push('/login');
        return;
      }
    } catch { /* malformed token — treat as expired */ 
      localStorage.removeItem('airfa_token');
      localStorage.removeItem('airfa_user');
      router.push('/login');
      return;
    }

    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { name?: string; system_role?: string; musical_role?: string };
        setName(parsed.name ?? '');
        setRole(parsed.system_role ?? '');
        setMusicalRole(parsed.musical_role ?? '');
      } catch { /* ignore */ }
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const fetchCount = () =>
      authFetch(`${apiUrl}/api/v1/notifications/unread-count`)
        .then(r => r.json())
        .then(d => setUnreadCount(d.count ?? 0))
        .catch(() => {});
    fetchCount();
    window.addEventListener('notif-read', fetchCount);
    return () => window.removeEventListener('notif-read', fetchCount);
  }, [ready, pathname]);

  const themeToggle = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={darkMode ? 'Modo claro' : 'Modo escuro'}
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        borderRadius: 7,
        background: 'var(--accent-dim)',
        border: '1px solid rgba(91,143,184,0.22)',
        color: 'var(--accent-2)',
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {darkMode ? <IconMoon /> : <IconSun />}
    </button>
  );

  function handleLogout() {
    localStorage.removeItem('airfa_token');
    localStorage.removeItem('airfa_user');
    window.location.href = '/login';
  }

  function toggleTheme() {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('airfa_theme', next ? 'dark' : 'light');
      return next;
    });
  }

  const canSeeMembers = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isAdmin = canSeeMembers;
  const initials = name ? name.trim()[0].toUpperCase() : '?';

  if (!ready) {
    return <div className="shell-loading">A carregar…</div>;
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '22px 16px 18px' }}>
        <div className="brand-text">
          <span className="brand-name">Airfa</span>
          <span className="brand-sub">Banda Filarmónica</span>
        </div>
      </div>

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigation
          .filter(item => !item.adminOnly || canSeeMembers)
          .map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? ' nav-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.href === '/notificacoes' && unreadCount > 0 && (
                  <span className="nav-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* User footer */}
      <div className="sidebar-user-info">
        <div style={{ position: 'relative' }}>
          {userMenuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="user-popup">
                <Link
                  href="/perfil"
                  className="user-popup-item"
                  onClick={() => { setUserMenuOpen(false); setSidebarOpen(false); }}
                >
                  <IconUser />
                  Sobre mim
                </Link>
                <div className="user-popup-sep" />
                <button
                  type="button"
                  className="user-popup-item"
                  onClick={toggleTheme}
                >
                  {darkMode ? <IconMoon /> : <IconSun />}
                  {darkMode ? 'Modo escuro' : 'Modo claro'}
                </button>
                <div className="user-popup-sep" />
                <button type="button" className="user-popup-item user-popup-danger" onClick={handleLogout}>
                  <IconLogout />
                  Sair
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            className={`user-avatar${userMenuOpen ? ' user-avatar-open' : ''}`}
            onClick={() => setUserMenuOpen(v => !v)}
            aria-label="Menu do utilizador"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="8" cy="5.5" r="3"/>
              <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>
          </button>
        </div>
        <div className="user-details">
          <span className="user-name">{name || 'Utilizador'}</span>
          {(musicalRole || isAdmin) && (
            <div className="user-badges-row">
              {musicalRole && (
                <span className="badge badge-musical">
                  {MUSICAL_ROLE_LABELS[musicalRole] ?? musicalRole}
                </span>
              )}
              {isAdmin && (
                <span className={`badge ${role === 'SUPER_ADMIN' ? 'badge-super' : 'badge-admin'}`}>
                  {role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="app-layout">
      {/* Sidebar — desktop */}
      <aside className="sidebar" aria-label="Menu lateral">
        {sidebarContent}
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — mobile drawer */}
      <aside className={`sidebar-mobile${sidebarOpen ? ' is-open' : ''}`} aria-label="Menu lateral móvel">
        <button
          type="button"
          className="mobile-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        >
          <IconClose />
        </button>
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setSidebarOpen(v => !v)}
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <IconMenu />
          </button>
          <span className="mobile-brand">Airfa</span>
        </div>

        <main className="main-content" id="main-content">
          <div className="content-header">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="content-subtitle">{subtitle}</p>}
            </div>
          </div>
          <div className="content-body">
            {children}
          </div>
        </main>
      </div>

      <style jsx>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
        }

        /* ── Sidebar ───────────────────────────────────── */
        .sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 10;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px 16px 18px;
        }

        /* ── Theme toggle ────────────────────────────── */
        .theme-toggle {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 7px;
          background: var(--accent-dim);
          border: 1px solid rgba(91,143,184,0.22);
          color: var(--accent-2);
          cursor: pointer;
          outline: none;
          transition: background 0.12s, border-color 0.12s;
        }
        .theme-toggle:hover {
          background: rgba(91,143,184,0.18);
          border-color: rgba(91,143,184,0.45);
        }
        .theme-toggle:focus-visible { box-shadow: 0 0 0 2px var(--accent); }

        .brand-mark {
          width: 36px;
          height: 36px;
          background: var(--accent);
          color: var(--accent-fg);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display, serif);
          font-size: 20px;
          font-style: italic;
          font-weight: 700;
          flex-shrink: 0;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
          min-width: 0;
        }

        .brand-name {
          font-family: var(--font-display, serif);
          font-size: 18px;
          font-style: italic;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.02em;
          line-height: 1.1;
        }

        .brand-sub {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-family: var(--font-mono, monospace);
        }

        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 0 16px 8px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          padding: 8px 8px;
          gap: 2px;
        }

        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 6px;
          color: var(--muted);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          border-left: 2px solid transparent;
          position: relative;
        }

        :global(.nav-item:hover) {
          background: var(--surface-2);
          color: var(--text-2);
        }

        :global(.nav-item.nav-active) {
          background: var(--accent-dim);
          color: var(--accent-2);
          border-left-color: var(--accent);
        }

        .nav-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }

        .nav-label { flex: 1; }

        :global(.nav-unread-badge) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: var(--accent);
          border: none;
          color: var(--accent-fg);
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0;
          box-shadow: 0 0 6px rgba(91,143,184,0.4);
        }

        :global(.sidebar-user-info) {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 14px;
          padding: 10px 12px 20px;
        }

        :global(.user-avatar) {
          aspect-ratio: 1;
          min-width: 44px;
          flex-shrink: 0;
          border-radius: 10px;
          background: var(--accent-dim);
          border: 1px solid rgba(91,143,184,0.22);
          color: var(--accent-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: background 0.12s, border-color 0.12s;
        }
        :global(.user-avatar:hover), :global(.user-avatar.user-avatar-open) {
          background: rgba(91,143,184,0.18);
          border-color: rgba(91,143,184,0.45);
        }

        /* User popup */
        :global(.user-popup) {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0;
          min-width: 160px;
          background: var(--surface-2);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.25);
          z-index: 200;
        }
        :global(.user-popup-item) {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 5px;
          border: none;
          background: transparent;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.1s, color 0.1s;
          text-align: left;
          font-family: inherit;
        }
        :global(.user-popup-item:hover) { background: var(--surface-3); color: var(--text); }
        :global(.user-popup-item.user-popup-danger) { color: var(--danger); }
        :global(.user-popup-item.user-popup-danger:hover) { background: var(--danger-dim); }
        :global(.user-popup-sep) {
          height: 1px;
          background: var(--border);
          margin: 3px 8px;
        }

        :global(.user-details) {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        :global(.user-name) {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :global(.user-badges-row) {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .icon-btn-danger:hover { background: var(--danger-dim); color: var(--danger); border-color: var(--danger); }

        /* ── Main area ─────────────────────────────────── */
        .main-wrapper {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          padding: 0;
        }

        .content-header {
          padding: 36px 40px 24px;
          border-bottom: 1px solid var(--border);
        }

        .content-subtitle {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 14px;
        }

        .content-body {
          padding: 32px 40px 48px;
          max-width: 1200px;
        }

        /* ── Mobile topbar ─────────────────────────────── */
        .mobile-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 52px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .hamburger-btn {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .mobile-brand {
          font-family: var(--font-display, serif);
          font-style: italic;
          font-size: 20px;
          font-weight: 600;
          color: var(--accent-2);
        }

        /* ── Mobile sidebar drawer ─────────────────────── */
        .mobile-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(3px);
          z-index: 100;
        }

        .sidebar-mobile {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 260px;
          height: 100vh;
          background: var(--surface);
          border-right: 1px solid var(--border);
          flex-direction: column;
          z-index: 110;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          overflow-y: auto;
          padding-top: 52px;
        }

        .sidebar-mobile.is-open {
          transform: translateX(0);
        }

        .mobile-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        /* ── Responsive ────────────────────────────────── */
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-topbar { display: flex; }
          .mobile-backdrop { display: block; }
          .sidebar-mobile { display: flex; }
          .content-header { padding: 24px 20px 16px; }
          .content-body { padding: 20px 20px 48px; }
        }
      `}</style>
    </div>
  );
}

