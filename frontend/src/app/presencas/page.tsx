"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type PresenceItem = {
  id: number;
  title: string;
  type: string;
  start_time: string;
  location?: string | null;
  present_count: number;
  missing_count: number;
  my_status?: string | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function PresencasPage() {
  const [attendance, setAttendance] = useState<PresenceItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    fetch(`${apiUrl}/api/v1/presences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setAttendance)
      .catch(() => setAttendance([]));
  }, []);

  return (
    <AuthenticatedShell title="Presenças" subtitle="Calendário e listagem de presenças da banda.">
      <section className="section">
        <div className="section-header">
          <h1>Presenças</h1>
          <button type="button">Marcar presenças</button>
        </div>

        <div className="grid">
          {attendance.map((item) => (
            <article key={`${item.date}-${item.title}`} className="card">
              <span className="badge">{new Date(item.start_time).toLocaleDateString('pt-PT')}</span>
              <h2>{item.title}</h2>
              <p>{item.type}</p>
              <div className="stats">
                <span>Presentes: {item.present_count}</span>
                <span>Faltas: {item.missing_count}</span>
                <span>O meu estado: {item.my_status ?? 'Sem registo'}</span>
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
        .stats {
          color: var(--muted);
          margin: 0;
        }

        .stats {
          display: grid;
          gap: 6px;
        }
      `}</style>
    </AuthenticatedShell>
  );
}
