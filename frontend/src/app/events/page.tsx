"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type EventItem = {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  type: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    fetch(`${apiUrl}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <AuthenticatedShell title="Eventos" subtitle="Calendário, anúncios e ligações de divulgação.">
      <section className="section">
        <div className="section-header">
          <h1>Eventos</h1>
          <button type="button">Adicionar evento</button>
        </div>

        <div className="grid">
          {events.map((event) => (
            <article key={event.title} className="card">
              <span className="badge">{event.type}</span>
              <h2>{event.title}</h2>
              <p>{event.description}</p>
              <div className="meta">
                <span>{new Date(event.start_time).toLocaleString('pt-PT')}</span>
                <span>{event.location}</span>
              </div>
              <div className="links">
                <a href="#">Facebook</a>
                <a href="#">Instagram</a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        .section {
          display: grid;
          gap: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        h1,
        h2 {
          margin: 0;
        }

        button {
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
        }

        .grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .card {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .badge {
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(125, 211, 252, 0.12);
          color: var(--accent);
          font-size: 12px;
        }

        p,
        .meta {
          color: var(--muted);
          margin: 0;
        }

        .meta {
          display: grid;
          gap: 4px;
        }

        .links {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .links a {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
        }
      `}</style>
    </AuthenticatedShell>
  );
}
