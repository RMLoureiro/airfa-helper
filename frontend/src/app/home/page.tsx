"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type HomeResponse = {
  name: string;
  system_role: string;
  musical_role?: string | null;
  upcoming_events?: Array<{
    id: number;
    title: string;
    description?: string | null;
    start_time: string;
    location?: string | null;
    type: string;
  }>;
  upcoming_birthdays: Array<{
    id: number;
    name: string;
    birth_date?: string | null;
    days_until?: number | null;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeResponse | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${apiUrl}/api/v1/home`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao carregar a home.');
        }
        return response.json();
      })
      .then(setData)
      .catch(() => router.push('/login'));
  }, [router]);

  return (
    <AuthenticatedShell title="Início" subtitle="Calendário, newsletter e próximos aniversários.">
      <section className="home-shell">
        <header className="home-header">
          <div>
            <span className="eyebrow">Página inicial</span>
            <h1>Bem-vindo, {data?.name ?? '...'}.</h1>
            <p>
              {data ? `${data.system_role}${data.musical_role ? ` · ${data.musical_role}` : ''}` : 'A carregar...'}
            </p>
          </div>
        </header>

        <section className="panel">
          <h2>Próximos eventos</h2>
          <div className="birthday-list">
            {data?.upcoming_events?.length ? (
              data.upcoming_events.map((event) => (
                <article key={event.id} className="birthday-item">
                  <strong>{event.title}</strong>
                  <span>{event.location ?? 'Local a definir'}</span>
                </article>
              ))
            ) : (
              <p className="muted">Sem eventos futuros para mostrar.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Próximos aniversários</h2>
          <div className="birthday-list">
            {data?.upcoming_birthdays?.length ? (
              data.upcoming_birthdays.map((birthday) => (
                <article key={birthday.id} className="birthday-item">
                  <strong>{birthday.name}</strong>
                  <span>
                    {birthday.days_until === 0
                      ? 'Hoje'
                      : birthday.days_until === 1
                        ? 'Amanhã'
                        : `${birthday.days_until} dias`}
                  </span>
                </article>
              ))
            ) : (
              <p className="muted">Sem aniversários para mostrar.</p>
            )}
          </div>
        </section>
      </section>

      <style jsx>{`
        .home-shell {
          display: grid;
          gap: 24px;
        }

        .home-header,
        .panel {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
        }

        .eyebrow {
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 12px;
        }

        h1,
        h2 {
          margin: 8px 0;
        }

        p {
          color: var(--muted);
          margin: 0;
        }

        .birthday-list {
          display: grid;
          gap: 12px;
        }

        .birthday-item {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .muted {
          color: var(--muted);
        }
      `}</style>
    </AuthenticatedShell>
  );
}
