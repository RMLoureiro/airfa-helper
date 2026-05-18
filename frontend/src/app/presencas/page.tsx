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

type MemberPresenceItem = {
  user_id: number;
  name: string;
  naipe?: string | null;
  status?: 'PRESENT' | 'TARDY' | 'ABSENT' | 'JUSTIFIED' | null;
};

type PresenceAnalyticsItem = {
  user_id: number;
  name: string;
  naipe?: string | null;
  total_events: number;
  present: number;
  tardy: number;
  absent: number;
  justified: number;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function PresencasPage() {
  const [attendance, setAttendance] = useState<PresenceItem[]>([]);
  const [analytics, setAnalytics] = useState<PresenceAnalyticsItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PresenceItem | null>(null);
  const [memberStatuses, setMemberStatuses] = useState<MemberPresenceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        const admin = parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN';
        setIsAdmin(admin);

        if (admin) {
          fetch(`${apiUrl}/api/v1/presences/analytics/members`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((response) => response.json())
            .then(setAnalytics)
            .catch(() => setAnalytics([]));
        }
      } catch {
        setIsAdmin(false);
      }
    }

    fetch(`${apiUrl}/api/v1/presences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setAttendance)
      .catch(() => setAttendance([]));
  }, []);

  async function openMarkModal(item: PresenceItem) {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/presences/${item.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const members = await response.json();
    setMemberStatuses(members);
    setSelectedEvent(item);
    setIsModalOpen(true);
  }

  async function saveMarks() {
    const token = localStorage.getItem('airfa_token');
    if (!token || !selectedEvent) {
      return;
    }

    await fetch(`${apiUrl}/api/v1/presences/${selectedEvent.id}/bulk-mark`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: memberStatuses
          .filter((item) => item.status)
          .map((item) => ({ user_id: item.user_id, status: item.status })),
      }),
    });

    setIsModalOpen(false);
  }

  return (
    <AuthenticatedShell title="Presenças" subtitle="Calendário e listagem de presenças da banda.">
      <section className="section">
        <div className="section-header">
          <h1>Presenças</h1>
          {isAdmin ? <button type="button">Modo de marcação ativo</button> : null}
        </div>

        <div className="grid">
          {attendance.map((item) => (
            <article key={`${item.id}-${item.title}`} className="card">
              <span className="badge">{new Date(item.start_time).toLocaleDateString('pt-PT')}</span>
              <h2>{item.title}</h2>
              <p>{item.type}</p>
              <div className="stats">
                <span>Presentes: {item.present_count}</span>
                <span>Faltas: {item.missing_count}</span>
                <span>O meu estado: {item.my_status ?? 'Sem registo'}</span>
              </div>
              {isAdmin ? (
                <button type="button" onClick={() => openMarkModal(item)}>
                  Marcar presenças
                </button>
              ) : null}
            </article>
          ))}
        </div>

        {isAdmin ? (
          <section className="analytics">
            <h2>Analytics de membros</h2>
            <div className="analytics-grid">
              {analytics.map((member) => (
                <article key={member.user_id} className="analytics-card">
                  <strong>{member.name}</strong>
                  <span>{member.naipe ?? 'Sem naipe'}</span>
                  <span>Eventos: {member.total_events}</span>
                  <span>Presente: {member.present}</span>
                  <span>Atrasado: {member.tardy}</span>
                  <span>Falta: {member.absent}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {isModalOpen && selectedEvent ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>Marcar presenças: {selectedEvent.title}</h2>
              <div className="member-list">
                {memberStatuses.map((member) => (
                  <label key={member.user_id} className="member-row">
                    <span>
                      {member.name} · {member.naipe ?? 'Sem naipe'}
                    </span>
                    <select
                      value={member.status ?? 'ABSENT'}
                      onChange={(event) =>
                        setMemberStatuses((current) =>
                          current.map((item) =>
                            item.user_id === member.user_id
                              ? {
                                  ...item,
                                  status: event.target.value as MemberPresenceItem['status'],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="PRESENT">Presente</option>
                      <option value="TARDY">Atrasado</option>
                      <option value="ABSENT">Falta</option>
                      <option value="JUSTIFIED">Justificado</option>
                    </select>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" onClick={saveMarks}>
                  Guardar marcações
                </button>
              </div>
            </div>
          </div>
        ) : null}
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

        .analytics {
          display: grid;
          gap: 12px;
        }

        .analytics-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .analytics-card {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--input-bg);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(3, 6, 12, 0.72);
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .modal {
          width: min(100%, 720px);
          display: grid;
          gap: 14px;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: #121821;
          box-shadow: var(--shadow);
        }

        .member-list {
          display: grid;
          gap: 10px;
          max-height: 420px;
          overflow: auto;
        }

        .member-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        select {
          background: var(--input-bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
        }
      `}</style>
    </AuthenticatedShell>
  );
}
