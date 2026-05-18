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
  facebook_link?: string | null;
  instagram_link?: string | null;
};

type EventForm = {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  type: 'REHEARSAL' | 'SPECIAL_REHEARSAL' | 'CONCERT' | 'OTHER';
  facebook_link: string;
  instagram_link: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventForm>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    type: 'REHEARSAL',
    facebook_link: '',
    instagram_link: '',
  });

  async function loadEvents() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    setEvents(data);
  }

  useEffect(() => {
    loadEvents().catch(() => setEvents([]));

    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        setIsAdmin(parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN');
        setIsSuperAdmin(parsed.system_role === 'SUPER_ADMIN');
      } catch {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    }
  }, []);

  function openCreateModal() {
    setEditingEvent(null);
    setForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      type: 'REHEARSAL',
      facebook_link: '',
      instagram_link: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(event: EventItem) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      location: event.location ?? '',
      type: event.type as EventForm['type'],
      facebook_link: event.facebook_link ?? '',
      instagram_link: event.instagram_link ?? '',
    });
    setIsModalOpen(true);
  }

  async function saveEvent() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const payload = {
      ...form,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      description: form.description || null,
      location: form.location || null,
      facebook_link: form.facebook_link || null,
      instagram_link: form.instagram_link || null,
    };

    const isEditing = Boolean(editingEvent);
    const url = isEditing
      ? `${apiUrl}/api/v1/events/${editingEvent?.id}`
      : `${apiUrl}/api/v1/events`;
    const method = isEditing ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    setIsModalOpen(false);
    await loadEvents();
  }

  async function removeEvent(eventId: number) {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    await fetch(`${apiUrl}/api/v1/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await loadEvents();
  }

  return (
    <AuthenticatedShell title="Eventos" subtitle="Calendário, anúncios e ligações de divulgação.">
      <section className="section">
        <div className="section-header">
          <h1>Eventos</h1>
          {isAdmin ? (
            <button type="button" onClick={openCreateModal}>
              Adicionar evento
            </button>
          ) : null}
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
                {event.facebook_link ? (
                  <a href={event.facebook_link} target="_blank" rel="noreferrer">
                    Facebook
                  </a>
                ) : null}
                {event.instagram_link ? (
                  <a href={event.instagram_link} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                ) : null}
              </div>

              {isAdmin ? (
                <div className="actions">
                  <button type="button" onClick={() => openEditModal(event)}>
                    Editar
                  </button>
                  {isSuperAdmin ? (
                    <button type="button" className="danger" onClick={() => removeEvent(event.id)}>
                      Remover
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {isModalOpen ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>{editingEvent ? 'Editar evento' : 'Adicionar evento'}</h2>

              <label>
                Título
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>

              <label>
                Descrição
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>

              <label>
                Início
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                />
              </label>

              <label>
                Fim
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(event) => setForm({ ...form, end_time: event.target.value })}
                />
              </label>

              <label>
                Local
                <input
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
              </label>

              <label>
                Tipo
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as EventForm['type'] })}
                >
                  <option value="REHEARSAL">Ensaio</option>
                  <option value="SPECIAL_REHEARSAL">Ensaio especial</option>
                  <option value="CONCERT">Concerto</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>

              <label>
                Link Facebook
                <input
                  value={form.facebook_link}
                  onChange={(event) => setForm({ ...form, facebook_link: event.target.value })}
                />
              </label>

              <label>
                Link Instagram
                <input
                  value={form.instagram_link}
                  onChange={(event) => setForm({ ...form, instagram_link: event.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" onClick={saveEvent}>
                  Guardar
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
          background: var(--input-bg);
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .actions button {
          padding: 10px 14px;
        }

        .actions .danger {
          background: rgba(251, 113, 133, 0.22);
          color: #ffd5dd;
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
          gap: 12px;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: #121821;
          box-shadow: var(--shadow);
        }

        label {
          display: grid;
          gap: 6px;
        }

        input,
        textarea,
        select {
          width: 100%;
          background: var(--input-bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
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
