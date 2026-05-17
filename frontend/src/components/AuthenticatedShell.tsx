"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const navigation = [
  { href: '/home', label: 'Início' },
  { href: '/events', label: 'Eventos' },
  { href: '/presencas', label: 'Presenças' },
  { href: '/instrumentos', label: 'Instrumentos' },
  { href: '/repertorio', label: 'Repertório' },
  { href: '/notificacoes', label: 'Notificações' },
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

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    const storedUser = localStorage.getItem('airfa_user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { name?: string; system_role?: string };
        setName(parsed.name ?? '');
        setRole(parsed.system_role ?? '');
      } catch {
        setName('');
        setRole('');
      }
    }

    setReady(true);
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('airfa_token');
    localStorage.removeItem('airfa_user');
    router.push('/login');
  }

  const activeNav = pathname ?? '/home';

  if (!ready) {
    return <main className="shell-loading">A carregar...</main>;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <span className="eyebrow">Airfa Helper</span>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <nav className="nav">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={activeNav === item.href ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="user-card">
          <strong>{name || 'Utilizador'}</strong>
          <span>{role || 'REGULAR'}</span>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>

      <section className="content">{children}</section>

      <style jsx>{`
        .app-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          padding: 24px;
        }

        .sidebar,
        .content {
          background: rgba(22, 27, 34, 0.84);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
        }

        .sidebar {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }

        .content {
          padding: 24px;
          overflow: hidden;
        }

        .eyebrow {
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 12px;
        }

        h2 {
          margin: 10px 0 8px;
          font-size: 2rem;
          line-height: 1;
        }

        p {
          margin: 0;
          color: var(--muted);
        }

        .nav {
          display: grid;
          gap: 10px;
        }

        .nav a {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
        }

        .nav a.active {
          background: linear-gradient(135deg, rgba(125, 211, 252, 0.22), rgba(56, 189, 248, 0.12));
          border-color: rgba(125, 211, 252, 0.35);
        }

        .user-card {
          display: grid;
          gap: 8px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--panel-soft);
        }

        .user-card button {
          border: 0;
          border-radius: 12px;
          padding: 12px;
          background: rgba(251, 113, 133, 0.18);
          color: var(--text);
          cursor: pointer;
        }

        .shell-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
        }

        @media (max-width: 980px) {
          .app-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
