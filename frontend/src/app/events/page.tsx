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

const EVENT_LABELS: Record<string, string> = { REHEARSAL: 'Ensaio', SPECIAL_REHEARSAL: 'Ensaio especial', CONCERT: 'Concerto', OTHER: 'Outro' };
const EVENT_BADGE: Record<string, string> = { REHEARSAL: 'badge-rehearsal', SPECIAL_REHEARSAL: 'badge-special', CONCERT: 'badge-concert', OTHER: 'badge-other' };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso: string): number { return new Date(iso).getDate(); }
function formatMonth(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { month: 'short' }).toUpperCase();
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM: EventForm = { title: '', description: '', start_time: '', end_time: '', location: '', type: 'REHEARSAL', facebook_link: '', instagram_link: '' };

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<string | null>(null);

  async function loadEvents() {
    const token = localStorage.getItem('airfa_token');
    if (!token) return;
    const response = await fetch(`${apiUrl}/api/v1/events`, { headers: { Authorization: `Bearer ${token}` } });
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
      } catch { /* ignore */ }
    }
  }, []);

  function openCreateModal() {
    setEditingEvent(null);
    setForm(EMPTY_FORM);
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
    if (!token) return;
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
    const url = isEditing ? `${apiUrl}/api/v1/events/${editingEvent?.id}` : `${apiUrl}/api/v1/events`;
    await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setIsModalOpen(false);
    await loadEvents();
  }

  async function removeEvent(eventId: number) {
    if (!window.confirm('Tem a certeza que pretende remover este evento?')) return;
    const token = localStorage.getItem('airfa_token');
    if (!token) return;
    await fetch(`${apiUrl}/api/v1/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadEvents();
  }

  const displayed = filterType ? events.filter(e => e.type === filterType || (filterType === 'REHEARSAL' && e.type === 'SPECIAL_REHEARSAL')) : events;

  return (
    <AuthenticatedShell title="Eventos" subtitle="Ensaios, concertos e outros compromissos.">
      <div className="page">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="filter-pills">
            {[null, 'REHEARSAL', 'CONCERT', 'OTHER'].map(t => (
              <button
                key={t ?? 'all'}
                type="button"
                className={`filter-pill${filterType === t ? ' active' : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t === null ? 'Todos' : t === 'REHEARSAL' ? 'Ensaios' : t === 'CONCERT' ? 'Concertos' : 'Outros'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button type="button" className="btn-primary" onClick={openCreateModal}>
              + Novo evento
            </button>
          )}
        </div>

        {/* Event list */}
        {displayed.length === 0 ? (
          <div className="empty">Sem eventos para mostrar.</div>
        ) : (
          <div className="event-list">
            {displayed.map(event => (
              <article key={event.id} className="event-card">
                {/* Left: date block */}
                <div className="date-block">
                  <span className="date-day">{formatDay(event.start_time)}</span>
                  <span className="date-mon">{formatMonth(event.start_time)}</span>
                </div>

                {/* Center: info */}
                <div className="event-body">
                  <div className="event-header">
                    <h2 className="event-title">{event.title}</h2>
                    <span className={`badge ${EVENT_BADGE[event.type] ?? 'badge-other'}`}>{EVENT_LABELS[event.type] ?? event.type}</span>
                  </div>
                  <div className="event-meta">
                    <span>⏱ {formatTime(event.start_time)}</span>
                    {event.location && <span>· 📍 {event.location}</span>}
                  </div>
                  {event.description && <p className="event-desc">{event.description}</p>}
                  {event.type === 'CONCERT' && (event.facebook_link || event.instagram_link) && (
                    <div className="social-row">
                      {event.facebook_link && (
                        <a href={event.facebook_link} target="_blank" rel="noopener noreferrer" className="social-link fb">Facebook</a>
                      )}
                      {event.instagram_link && (
                        <a href={event.instagram_link} target="_blank" rel="noopener noreferrer" className="social-link ig">Instagram</a>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                {isAdmin && (
                  <div className="event-actions">
                    <button type="button" className="action-btn" onClick={() => openEditModal(event)}>
                      Editar
                    </button>
                    {isSuperAdmin && (
                      <button type="button" className="action-btn danger" onClick={() => removeEvent(event.id)}>
                        Remover
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingEvent ? 'Editar evento' : 'Novo evento'}</h2>
                <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>

              <div className="form-grid">
                <label className="form-field span-2">
                  Título
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nome do evento" />
                </label>

                <label className="form-field span-2">
                  Descrição
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" />
                </label>

                <label className="form-field">
                  Início
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                </label>

                <label className="form-field">
                  Fim
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                </label>

                <label className="form-field">
                  Local
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Local do evento" />
                </label>

                <label className="form-field">
                  Tipo
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as EventForm['type'] })}>
                    <option value="REHEARSAL">Ensaio</option>
                    <option value="SPECIAL_REHEARSAL">Ensaio especial</option>
                    <option value="CONCERT">Concerto</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </label>

                <label className="form-field">
                  Link Facebook
                  <input value={form.facebook_link} onChange={e => setForm({ ...form, facebook_link: e.target.value })} placeholder="https://facebook.com/..." />
                </label>

                <label className="form-field">
                  Link Instagram
                  <input value={form.instagram_link} onChange={e => setForm({ ...form, instagram_link: e.target.value })} placeholder="https://instagram.com/..." />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={saveEvent}>Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }

        .filter-pill {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.12s;
        }
        .filter-pill:hover { border-color: var(--border-strong); color: var(--text-2); background: var(--surface-2); }
        .filter-pill.active { background: var(--accent-dim); color: var(--accent-2); border-color: var(--accent); }

        .btn-primary {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          background: var(--accent);
          color: #0B0A08;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .btn-primary:hover { background: var(--accent-2); }

        .btn-secondary {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--border-strong);
          background: transparent;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.12s;
        }
        .btn-secondary:hover { background: var(--surface-3); }

        .empty {
          text-align: center;
          padding: 48px;
          color: var(--muted);
          font-style: italic;
          font-size: 14px;
        }

        /* Event list */
        .event-list { display: flex; flex-direction: column; gap: 1px; }

        .event-card {
          display: flex;
          align-items: flex-start;
          gap: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.12s;
        }
        .event-card:hover { border-color: var(--border-strong); }
        .event-list .event-card + .event-card { border-top-left-radius: 8px; border-top-right-radius: 8px; }

        .date-block {
          flex-shrink: 0;
          width: 64px;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--surface-2);
          border-right: 1px solid var(--border);
          padding: 16px 8px;
          gap: 2px;
        }

        .date-day {
          font-family: var(--font-display, serif);
          font-size: 26px;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }

        .date-mon {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-body {
          flex: 1;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .event-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }

        .event-meta {
          font-size: 12px;
          color: var(--muted);
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-desc {
          font-size: 13px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.5;
        }

        .social-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .social-link {
          padding: 3px 9px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .social-link:hover { opacity: 0.8; }
        .fb { background: rgba(24,119,242,0.12); border: 1px solid rgba(24,119,242,0.28); color: #4e9cf5; }
        .ig { background: rgba(225,48,108,0.1); border: 1px solid rgba(225,48,108,0.24); color: #e1306c; }

        .event-actions {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px 12px;
          align-items: flex-end;
        }

        .action-btn {
          padding: 5px 12px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }
        .action-btn:hover { background: var(--surface-3); border-color: var(--border-strong); color: var(--text); }
        .action-btn.danger { color: var(--danger); border-color: rgba(194,78,66,0.3); }
        .action-btn.danger:hover { background: var(--danger-dim); border-color: var(--danger); }

        /* Modal */
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .modal-title {
          font-family: var(--font-display, serif);
          font-size: 22px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }
        .modal-close {
          width: 30px; height: 30px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          padding: 0;
        }
        .modal-close:hover { border-color: var(--danger); color: var(--danger); }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
        }

        .span-2 { grid-column: span 2; }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
          .date-block { width: 50px; }
        }
      `}</style>
    </AuthenticatedShell>
  );
}
