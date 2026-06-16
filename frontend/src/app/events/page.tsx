"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import {
  EVENT_BADGE,
  EVENT_LABELS,
  MONTHS,
  WEEKDAYS,
  formatDay,
  formatMonth,
  formatTime,
} from '@/lib/format';
import type { EventItem } from '@/lib/types';
import { getStoredUser, isAdmin as checkIsAdmin, isSuperAdmin as checkIsSuperAdmin } from '@/lib/user';
import { useEffect, useRef, useState } from 'react';

type EventForm = {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  type: 'REHEARSAL' | 'SPECIAL_REHEARSAL' | 'CONCERT' | 'OTHER';
  facebook_link: string;
  instagram_link: string;
  recurrence: '' | 'WEEKLY';
  recurrence_end_date: string;
};

type EditScope = 'single' | 'this_and_future';

const EMPTY_FORM: EventForm = {
  title: '', description: '', start_time: '', end_time: '',
  location: '', type: 'REHEARSAL', facebook_link: '', instagram_link: '',
  recurrence: '', recurrence_end_date: '',
};

const REHEARSAL_TYPES = new Set(['REHEARSAL', 'SPECIAL_REHEARSAL']);

function splitDateTime(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T');
  return { date, time };
}

function combineDateTime(date: string, time: string): string {
  if (!date && !time) return '';
  return `${date}T${time || '00:00'}`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hour = '', minute = ''] = value.split(':');
  const minuteOptions = minute && !MINUTE_OPTIONS.includes(minute)
    ? [...MINUTE_OPTIONS, minute].sort()
    : MINUTE_OPTIONS;
  return (
    <div className="time-select">
      <select value={hour} onChange={e => onChange(`${e.target.value}:${minute || '00'}`)} aria-label="Horas">
        <option value="" disabled>HH</option>
        {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="time-sep">:</span>
      <select value={minute} onChange={e => onChange(`${hour || '00'}:${e.target.value}`)} aria-label="Minutos">
        <option value="" disabled>MM</option>
        {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}

function EventsCalendar({ events }: { events: EventItem[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemsByDay: Record<number, EventItem[]> = {};
  for (const ev of events) {
    const d = new Date(ev.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(ev);
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setActiveDay(null); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setActiveDay(null); }
  function scheduleClose() { closeTimer.current = setTimeout(() => setActiveDay(null), 180); }
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }

  function handleDayEnter(e: React.MouseEvent<HTMLButtonElement>, day: number) {
    if (!itemsByDay[day]) return;
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = calRef.current?.getBoundingClientRect();
    if (!parentRect) return;
    setActiveDay(day);
    setTooltipPos({ x: rect.left - parentRect.left, y: rect.bottom - parentRect.top + 6 });
  }

  function getDayClass(day: number): string {
    const items = itemsByDay[day];
    if (!items) return '';
    const types = new Set(items.map(i => i.type));
    const hasRehearsal = types.has('REHEARSAL') || types.has('SPECIAL_REHEARSAL');
    const hasConcert = types.has('CONCERT');
    if (hasConcert && hasRehearsal) return 'day-mixed-ev';
    if (hasConcert) return 'day-concert';
    if (hasRehearsal) return 'day-rehearsal';
    return 'day-other-ev';
  }

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="calendar" ref={calRef}>
      <div className="cal-header">
        <button type="button" onClick={prev} className="cal-nav">‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button type="button" onClick={next} className="cal-nav">›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
        {cells.map((day, i) =>
          day === null ? <div key={`e-${i}`} /> : (
            <button
              key={day}
              type="button"
              className={['cal-day', getDayClass(day), isToday(day) ? 'today' : '', itemsByDay[day] ? 'has-events' : ''].filter(Boolean).join(' ')}
              onMouseEnter={(e) => handleDayEnter(e, day)}
              onMouseLeave={scheduleClose}
            >
              {day}
            </button>
          )
        )}
      </div>
      <div className="cal-legend">
        <span className="cal-legend-dot" style={{ background: 'var(--rehearsal-color)' }} />
        <span className="cal-legend-label">Ensaio</span>
        <span className="cal-legend-dot" style={{ background: 'var(--concert-color)' }} />
        <span className="cal-legend-label">Concerto</span>
        <span className="cal-legend-dot" style={{ background: 'var(--muted)' }} />
        <span className="cal-legend-label">Outro</span>
      </div>
      {activeDay !== null && tooltipPos && itemsByDay[activeDay] && (
        <div
          className="cal-tooltip"
          style={{ top: tooltipPos.y, left: Math.min(tooltipPos.x, 200) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {itemsByDay[activeDay].map((ev, idx) => (
            <div key={ev.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0', borderBottom: idx < itemsByDay[activeDay].length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ev.is_cancelled ? 'var(--muted)' : 'var(--text)', textDecoration: ev.is_cancelled ? 'line-through' : 'none' }}>{ev.title}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className={`badge ${EVENT_BADGE[ev.type] ?? 'badge-other'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                  {EVENT_LABELS[ev.type] ?? ev.type}
                </span>
                {ev.is_cancelled && <span className="badge badge-cancelled" style={{ fontSize: 10, padding: '1px 5px' }}>Cancelado</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {new Date(ev.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                {ev.location && ` · ${ev.location}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editScope, setEditScope] = useState<EditScope>('single');
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Delete flow (non-recurring)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Hard delete flow (cancelled events)
  const [confirmHardDeleteId, setConfirmHardDeleteId] = useState<number | null>(null);

  // Scope dialog for recurring events
  const [scopeDialogFor, setScopeDialogFor] = useState<'edit' | 'delete' | null>(null);
  const [pendingScopeEvent, setPendingScopeEvent] = useState<EventItem | null>(null);

  async function loadEvents() {
    const response = await authFetch(`${API_URL}/api/v1/events`);
    const data = await response.json();
    setEvents(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadEvents().catch(() => setEvents([]));
    const user = getStoredUser();
    setIsAdmin(checkIsAdmin(user));
    setIsSuperAdmin(checkIsSuperAdmin(user));
  }, []);

  function openCreateModal() {
    setEditingEvent(null);
    setEditScope('single');
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function startEdit(event: EventItem, scope: EditScope) {
    setEditingEvent(event);
    setEditScope(scope);
    setForm({
      title: event.title,
      description: event.description ?? '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      location: event.location ?? '',
      type: event.type as EventForm['type'],
      facebook_link: event.facebook_link ?? '',
      instagram_link: event.instagram_link ?? '',
      recurrence: (event.recurrence as '' | 'WEEKLY') ?? '',
      recurrence_end_date: event.recurrence_end_date ?? '',
    });
    setIsModalOpen(true);
  }

  function handleEditClick(event: EventItem) {
    if (event.recurrence_series_id) {
      setPendingScopeEvent(event);
      setScopeDialogFor('edit');
    } else {
      startEdit(event, 'single');
    }
  }

  function handleDeleteClick(event: EventItem) {
    if (event.recurrence_series_id) {
      setPendingScopeEvent(event);
      setScopeDialogFor('delete');
    } else {
      setConfirmDeleteId(event.id);
    }
  }

  function onScopeChosen(scope: EditScope) {
    const ev = pendingScopeEvent!;
    setScopeDialogFor(null);
    setPendingScopeEvent(null);
    if (scopeDialogFor === 'edit') {
      startEdit(ev, scope);
    } else {
      removeEvent(ev.id, scope);
    }
  }

  async function saveEvent() {
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      start_time: `${form.start_time}:00`,
      end_time: `${form.end_time}:00`,
      location: form.location || null,
      type: form.type,
      facebook_link: form.facebook_link || null,
      instagram_link: form.instagram_link || null,
    };

    const isEditing = Boolean(editingEvent);

    if (!isEditing && form.recurrence === 'WEEKLY' && form.recurrence_end_date) {
      payload.recurrence = 'WEEKLY';
      payload.recurrence_end_date = form.recurrence_end_date;
    }

    const scopeParam = isEditing && editingEvent?.recurrence_series_id ? `?scope=${editScope}` : '';
    const url = isEditing
      ? `${API_URL}/api/v1/events/${editingEvent!.id}${scopeParam}`
      : `${API_URL}/api/v1/events`;

    await authFetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setIsModalOpen(false);
    await loadEvents();
  }

  async function removeEvent(eventId: number, scope: EditScope = 'single') {
    await authFetch(`${API_URL}/api/v1/events/${eventId}?scope=${scope}`, { method: 'DELETE' });
    await loadEvents();
  }

  async function hardDeleteEvent(eventId: number) {
    await authFetch(`${API_URL}/api/v1/events/${eventId}/hard`, { method: 'DELETE' });
    setConfirmHardDeleteId(null);
    await loadEvents();
  }

  const isRehearsal = REHEARSAL_TYPES.has(form.type);
  const displayed = filterType
    ? events.filter(e => e.type === filterType || (filterType === 'REHEARSAL' && e.type === 'SPECIAL_REHEARSAL'))
    : events;

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

        {/* Main content: list left, calendar right */}
        <div className="content-layout">
          {/* Event list */}
          <div className="events-col">
          {displayed.length === 0 ? (
          <div className="empty">Sem eventos para mostrar.</div>
        ) : (
          <div className="event-list">
            {displayed.map(event => (
              <article key={event.id} className={`event-card${event.is_cancelled ? ' cancelled' : ''}`}>
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
                    {event.recurrence === 'WEEKLY' && !event.is_cancelled && (
                      <span className="badge badge-recurring">↻ Semanal</span>
                    )}
                    {event.is_cancelled && (
                      <span className="badge badge-cancelled">Cancelado</span>
                    )}
                  </div>
                  <div className="event-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{formatTime(event.start_time)}</span>
                    {event.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>·<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>{event.location}</span>}
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
                {isAdmin && !event.is_cancelled && (
                  <div className="event-actions">
                    <button type="button" className="action-btn" onClick={() => handleEditClick(event)}>
                      Editar
                    </button>
                    {isSuperAdmin && (
                      <button type="button" className="action-btn danger" onClick={() => handleDeleteClick(event)}>
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
                {isSuperAdmin && event.is_cancelled && (
                  <div className="event-actions">
                    <button type="button" className="action-btn danger" onClick={() => setConfirmHardDeleteId(event.id)}>
                      Apagar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
          </div>{/* end events-col */}

          <div className="calendar-col">
            <EventsCalendar events={events} />
          </div>
        </div>{/* end content-layout */}

        {/* Scope dialog for recurring events */}
        {scopeDialogFor !== null && pendingScopeEvent && (
          <div className="modal-backdrop" onClick={() => { setScopeDialogFor(null); setPendingScopeEvent(null); }}>
            <div className="modal scope-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {scopeDialogFor === 'edit' ? 'Editar ensaio recorrente' : 'Cancelar ensaio recorrente'}
                </h2>
                <button type="button" className="modal-close" onClick={() => { setScopeDialogFor(null); setPendingScopeEvent(null); }}>✕</button>
              </div>
              <p className="scope-text">
                Este ensaio faz parte de uma série semanal. O que pretendes {scopeDialogFor === 'edit' ? 'editar' : 'cancelar'}?
              </p>
              <div className="scope-options">
                <button type="button" className="scope-btn" onClick={() => onScopeChosen('single')}>
                  <span className="scope-btn-label">Apenas este ensaio</span>
                  <span className="scope-btn-sub">
                    Só afeta {new Date(pendingScopeEvent.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })}
                  </span>
                </button>
                <button type="button" className="scope-btn" onClick={() => onScopeChosen('this_and_future')}>
                  <span className="scope-btn-label">Este e todos os futuros</span>
                  <span className="scope-btn-sub">Afeta este e todos os ensaios seguintes da série</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit modal */}
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

                <label className="form-field span-2">
                  Início
                  <div className="datetime-split">
                    <input type="date" value={splitDateTime(form.start_time).date} onChange={e => setForm({ ...form, start_time: combineDateTime(e.target.value, splitDateTime(form.start_time).time) })} />
                    <TimeSelect value={splitDateTime(form.start_time).time} onChange={t => setForm({ ...form, start_time: combineDateTime(splitDateTime(form.start_time).date, t) })} />
                  </div>
                </label>

                <label className="form-field span-2">
                  Fim
                  <div className="datetime-split">
                    <input type="date" value={splitDateTime(form.end_time).date} onChange={e => setForm({ ...form, end_time: combineDateTime(e.target.value, splitDateTime(form.end_time).time) })} />
                    <TimeSelect value={splitDateTime(form.end_time).time} onChange={t => setForm({ ...form, end_time: combineDateTime(splitDateTime(form.end_time).date, t) })} />
                  </div>
                </label>

                <label className="form-field">
                  Local
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Local do evento" />
                </label>

                <label className="form-field">
                  Tipo
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as EventForm['type'], recurrence: '', recurrence_end_date: '' })}>
                    <option value="REHEARSAL">Ensaio</option>
                    <option value="SPECIAL_REHEARSAL">Ensaio especial</option>
                    <option value="CONCERT">Concerto</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </label>

                {/* Recurrence — only when creating a rehearsal */}
                {!editingEvent && isRehearsal && (
                  <label className="form-field span-2 toggle-field">
                    <span className="toggle-row">
                      <input
                        type="checkbox"
                        checked={form.recurrence === 'WEEKLY'}
                        onChange={e => setForm({ ...form, recurrence: e.target.checked ? 'WEEKLY' : '', recurrence_end_date: '' })}
                        style={{ width: 'auto', marginRight: 8 }}
                      />
                      Repetir semanalmente
                    </span>
                  </label>
                )}

                {!editingEvent && form.recurrence === 'WEEKLY' && (
                  <label className="form-field span-2">
                    Repetir até (inclusive)
                    <input type="date" value={form.recurrence_end_date} onChange={e => setForm({ ...form, recurrence_end_date: e.target.value })} />
                  </label>
                )}

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

        {confirmDeleteId !== null && (
          <ConfirmDialog
            message="Tens a certeza que pretendes cancelar este evento?"
            confirmLabel="Cancelar evento"
            onConfirm={() => { removeEvent(confirmDeleteId, 'single'); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}

        {confirmHardDeleteId !== null && (
          <ConfirmDialog
            message="Tens a certeza que pretendes apagar permanentemente este evento? Esta acção é irreversível."
            confirmLabel="Apagar permanentemente"
            onConfirm={() => hardDeleteEvent(confirmHardDeleteId)}
            onCancel={() => setConfirmHardDeleteId(null)}
          />
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; }

        .content-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 24px;
          align-items: start;
        }

        .events-col { min-width: 0; }

        .calendar-col { flex-shrink: 0; width: 100%; }

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
          color: var(--accent-fg);
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
        .event-list { display: flex; flex-direction: column; gap: 8px; }

        .event-card {
          display: flex;
          align-items: stretch;
          gap: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.12s;
        }
        .event-card:hover { border-color: var(--border-strong); }
        .event-list .event-card + .event-card { border-top-left-radius: 8px; border-top-right-radius: 8px; }

        .event-card.cancelled { opacity: 0.55; }
        .event-card.cancelled .event-title { text-decoration: line-through; }

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

        /* Extra badges */
        .badge-recurring {
          background: rgba(91,143,184,0.12);
          border: 1px solid rgba(91,143,184,0.35);
          color: var(--accent);
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .badge-cancelled {
          background: rgba(194,78,66,0.12);
          border: 1px solid rgba(194,78,66,0.3);
          color: var(--danger);
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }

        /* Scope dialog */
        .scope-modal { max-width: 420px; }
        .scope-text {
          font-size: 14px;
          color: var(--text-2);
          margin: 0 0 20px;
          line-height: 1.5;
        }
        .scope-options { display: flex; flex-direction: column; gap: 10px; }
        .scope-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 14px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          cursor: pointer;
          transition: all 0.12s;
          text-align: left;
        }
        .scope-btn:hover { border-color: var(--accent); background: var(--accent-dim); }
        .scope-btn-label { font-size: 14px; font-weight: 600; color: var(--text); }
        .scope-btn-sub { font-size: 12px; color: var(--muted); }

        /* Recurrence toggle */
        .toggle-field { cursor: default; }
        .toggle-row {
          display: flex;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          cursor: pointer;
        }

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

        @media (max-width: 900px) {
          .content-layout { grid-template-columns: 1fr; }
          .calendar-col { order: -1; }
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
