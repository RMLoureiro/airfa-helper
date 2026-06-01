"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import { EVENT_BADGE, EVENT_LABELS, MONTHS, WEEKDAYS } from '@/lib/format';
import type { EventItem, EventReinforcementItem, ReinforcementItem } from '@/lib/types';
import { getStoredUser, isSuperAdmin as checkIsSuperAdmin } from '@/lib/user';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReinforcementForm = {
  name: string;
  instrument: string;
  contact: string;
  usual_fee: string;
};

const EMPTY_FORM: ReinforcementForm = { name: '', instrument: '', contact: '', usual_fee: '' };

// ─── Calendar with hover & click ─────────────────────────────────────────────

type CalendarProps = {
  events: EventItem[];
  eventAssignments: Record<number, EventReinforcementItem[]>;
  onDayClick: (event: EventItem) => void;
};

function ReinforcementsCalendar({ events, eventAssignments, onDayClick }: CalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group non-cancelled events by day for current month/year
  const eventsByDay: Record<number, EventItem[]> = {};
  for (const ev of events) {
    if (ev.is_cancelled) continue;
    const d = new Date(ev.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setHoverDay(null); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setHoverDay(null); }
  function scheduleClose() { closeTimer.current = setTimeout(() => setHoverDay(null), 180); }
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }

  function handleDayEnter(e: React.MouseEvent<HTMLButtonElement>, day: number) {
    if (!eventsByDay[day]) return;
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = calRef.current?.getBoundingClientRect();
    if (!parentRect) return;
    setHoverDay(day);
    setTooltipPos({ x: rect.left - parentRect.left, y: rect.bottom - parentRect.top + 6 });
  }

  function getDayClass(day: number): string {
    const items = eventsByDay[day];
    if (!items) return '';
    const types = new Set(items.map(i => i.type));
    const hasRehearsal = types.has('REHEARSAL') || types.has('SPECIAL_REHEARSAL');
    const hasConcert = types.has('CONCERT');
    if (hasConcert && hasRehearsal) return 'day-mixed-ev';
    if (hasConcert) return 'day-concert';
    if (hasRehearsal) return 'day-rehearsal';
    return 'day-other-ev';
  }

  function dayHasReinforcements(day: number): boolean {
    const dayEvents = eventsByDay[day] ?? [];
    return dayEvents.some(ev => (eventAssignments[ev.id]?.length ?? 0) > 0);
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
              className={[
                'cal-day',
                getDayClass(day),
                isToday(day) ? 'today' : '',
                eventsByDay[day] ? 'has-events' : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={(e) => handleDayEnter(e, day)}
              onMouseLeave={scheduleClose}
              onClick={() => {
                const dayEvs = eventsByDay[day];
                if (dayEvs?.length === 1) onDayClick(dayEvs[0]);
              }}
              style={{ position: 'relative' }}
            >
              {day}
              {dayHasReinforcements(day) && (
                <span style={{
                  position: 'absolute',
                  bottom: 3,
                  right: 4,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--warning)',
                  display: 'block',
                }} />
              )}
            </button>
          )
        )}
      </div>
      <div className="cal-legend">
        <span className="cal-legend-dot" style={{ background: 'var(--rehearsal-color)' }} />
        <span className="cal-legend-label">Ensaio</span>
        <span className="cal-legend-dot" style={{ background: 'var(--concert-color)' }} />
        <span className="cal-legend-label">Concerto</span>
        <span className="cal-legend-dot" style={{ background: 'var(--warning)' }} />
        <span className="cal-legend-label">Tem reforços</span>
      </div>

      {/* Hover tooltip */}
      {hoverDay !== null && tooltipPos && eventsByDay[hoverDay] && (
        <div
          className="cal-tooltip"
          style={{ top: tooltipPos.y, left: Math.min(tooltipPos.x, 200) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {eventsByDay[hoverDay].map((ev, idx) => {
            const entries = eventAssignments[ev.id] ?? [];
            const total = entries.reduce((s, e) => s + (Number(e.fee) || 0), 0);
            return (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '6px 0',
                  borderBottom: idx < eventsByDay[hoverDay].length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onDayClick(ev)}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ev.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${EVENT_BADGE[ev.type] ?? 'badge-other'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                    {EVENT_LABELS[ev.type] ?? ev.type}
                  </span>
                </div>
                {entries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                    {entries.map(er => (
                      <div key={er.id} style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span>{er.reinforcement.name}</span>
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          {er.fee != null ? `${Number(er.fee).toFixed(2)} €` : '—'}
                        </span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', borderTop: '1px solid var(--border)', paddingTop: 3, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Total</span>
                      <span>{total.toFixed(2)} €</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Sem reforços</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(ev.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  {ev.location && ` · ${ev.location}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReforcosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'calendar'>('list');

  // Data
  const [reinforcements, setReinforcements] = useState<ReinforcementItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventAssignments, setEventAssignments] = useState<Record<number, EventReinforcementItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Create/edit reinforcement modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReinforcementItem | null>(null);
  const [form, setForm] = useState<ReinforcementForm>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete reinforcement
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Event reinforcement modal (calendar click)
  const [managingEvent, setManagingEvent] = useState<EventItem | null>(null);
  const [eventEntries, setEventEntries] = useState<EventReinforcementItem[]>([]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [newEntryReinfId, setNewEntryReinfId] = useState('');
  const [newEntryFee, setNewEntryFee] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingEntryFee, setEditingEntryFee] = useState('');
  const [entryError, setEntryError] = useState('');
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<number | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = getStoredUser();
    if (!checkIsSuperAdmin(user)) {
      router.replace('/home');
    }
  }, [router]);

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadReinforcements() {
    const r = await authFetch(`${API_URL}/api/v1/reinforcements`);
    const data = await r.json();
    setReinforcements(Array.isArray(data) ? data : []);
  }

  async function loadEvents() {
    const r = await authFetch(`${API_URL}/api/v1/events`);
    const data = await r.json();
    return Array.isArray(data) ? (data as EventItem[]) : [];
  }

  async function loadAllEventAssignments(evs: EventItem[]) {
    const nonCancelled = evs.filter(e => !e.is_cancelled);
    const results = await Promise.all(
      nonCancelled.map(ev =>
        authFetch(`${API_URL}/api/v1/reinforcements/events/${ev.id}`)
          .then(r => r.json())
          .then(d => ({ id: ev.id, entries: Array.isArray(d) ? d as EventReinforcementItem[] : [] }))
          .catch(() => ({ id: ev.id, entries: [] as EventReinforcementItem[] }))
      )
    );
    const map: Record<number, EventReinforcementItem[]> = {};
    for (const r of results) map[r.id] = r.entries;
    setEventAssignments(map);
  }

  useEffect(() => {
    Promise.all([
      loadReinforcements(),
      loadEvents().then(evs => { setEvents(evs); return loadAllEventAssignments(evs); }),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reinforcement CRUD ─────────────────────────────────────────────────────
  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setIsFormOpen(true);
  }

  function openEdit(item: ReinforcementItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      instrument: item.instrument ?? '',
      contact: item.contact ?? '',
      usual_fee: item.usual_fee != null ? String(item.usual_fee) : '',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  async function saveReinforcement() {
    if (!form.name.trim()) { setFormError('O nome é obrigatório.'); return; }
    setFormSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        instrument: form.instrument.trim() || null,
        contact: form.contact.trim() || null,
        usual_fee: form.usual_fee ? parseFloat(form.usual_fee) : null,
      };
      if (editingItem) {
        await authFetch(`${API_URL}/api/v1/reinforcements/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await authFetch(`${API_URL}/api/v1/reinforcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setIsFormOpen(false);
      await loadReinforcements();
    } catch {
      setFormError('Erro ao guardar. Tente novamente.');
    } finally {
      setFormSaving(false);
    }
  }

  async function deleteReinforcement(id: number) {
    await authFetch(`${API_URL}/api/v1/reinforcements/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    await loadReinforcements();
    // Refresh assignments since cascade may have removed some
    await loadAllEventAssignments(events);
  }

  // ── Event reinforcement management ────────────────────────────────────────
  function openEventModal(ev: EventItem) {
    setManagingEvent(ev);
    setEventEntries(eventAssignments[ev.id] ?? []);
    setAddingEntry(false);
    setNewEntryReinfId('');
    setNewEntryFee('');
    setEditingEntryId(null);
    setEditingEntryFee('');
    setEntryError('');
  }

  async function addEntry() {
    if (!managingEvent || !newEntryReinfId) { setEntryError('Selecione um reforço.'); return; }
    setEntryError('');
    try {
      const payload = {
        reinforcement_id: parseInt(newEntryReinfId),
        fee: newEntryFee ? parseFloat(newEntryFee) : null,
      };
      const r = await authFetch(`${API_URL}/api/v1/reinforcements/events/${managingEvent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setEntryError((err as { detail?: string }).detail ?? 'Erro ao adicionar.');
        return;
      }
      const updated = await refreshEventEntries(managingEvent.id);
      setEventEntries(updated);
      setAddingEntry(false);
      setNewEntryReinfId('');
      setNewEntryFee('');
    } catch {
      setEntryError('Erro ao adicionar. Tente novamente.');
    }
  }

  async function saveEntryFee(entryId: number) {
    if (!managingEvent) return;
    setEntryError('');
    try {
      await authFetch(`${API_URL}/api/v1/reinforcements/events/${managingEvent.id}/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee: editingEntryFee ? parseFloat(editingEntryFee) : null }),
      });
      const updated = await refreshEventEntries(managingEvent.id);
      setEventEntries(updated);
      setEditingEntryId(null);
    } catch {
      setEntryError('Erro ao guardar. Tente novamente.');
    }
  }

  async function removeEntry(entryId: number) {
    if (!managingEvent) return;
    await authFetch(`${API_URL}/api/v1/reinforcements/events/${managingEvent.id}/entries/${entryId}`, {
      method: 'DELETE',
    });
    setConfirmDeleteEntryId(null);
    const updated = await refreshEventEntries(managingEvent.id);
    setEventEntries(updated);
    setEventAssignments(prev => ({ ...prev, [managingEvent.id]: updated }));
  }

  async function refreshEventEntries(eventId: number): Promise<EventReinforcementItem[]> {
    const r = await authFetch(`${API_URL}/api/v1/reinforcements/events/${eventId}`);
    const data = await r.json();
    const entries = Array.isArray(data) ? (data as EventReinforcementItem[]) : [];
    setEventAssignments(prev => ({ ...prev, [eventId]: entries }));
    return entries;
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const availableReinforcements = reinforcements.filter(
    r => !eventEntries.some(e => e.reinforcement_id === r.id)
  );

  const eventTotal = eventEntries.reduce((s, e) => s + (e.fee != null ? Number(e.fee) : 0), 0);

  if (loading) {
    return (
      <AuthenticatedShell title="Reforços">
        <div style={{ padding: 40, color: 'var(--muted)', textAlign: 'center' }}>A carregar…</div>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell title="Reforços">
      <style>{`
        .tab-bar { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
        .tab-btn { padding: 10px 20px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 14px; font-weight: 500; color: var(--muted); cursor: pointer; transition: color 0.15s, border-color 0.15s; margin-bottom: -1px; }
        .tab-btn.active { color: var(--accent-2); border-bottom-color: var(--accent-2); }
        .tab-btn:hover:not(.active) { color: var(--text-2); }

        .reinf-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .reinf-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--border); }
        .reinf-table td { padding: 11px 12px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
        .reinf-table tr:hover td { background: var(--surface-2); }
        .reinf-table .actions-cell { display: flex; gap: 6px; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 28px; width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); }
        .modal-box.wide { max-width: 560px; }
        .modal-title { font-family: var(--font-display, 'Cormorant Garamond'), Georgia, serif; font-size: 22px; font-weight: 600; margin: 0 0 20px; }
        .form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-row label { font-size: 13px; font-weight: 500; color: var(--text-2); }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

        .entry-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
        .entry-name { flex: 1; font-size: 14px; color: var(--text); }
        .entry-instr { font-size: 12px; color: var(--muted); }
        .entry-fee { font-size: 14px; font-weight: 600; color: var(--warning); min-width: 70px; text-align: right; }
        .entry-fee-input { width: 90px; font-size: 13px; padding: 4px 8px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0 0; font-weight: 700; font-size: 14px; }
        .total-val { color: var(--warning); }

        .empty-state { text-align: center; padding: 48px 0; color: var(--muted); font-size: 14px; }
      `}</style>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
          Reforços
        </button>
        <button className={`tab-btn${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>
          Calendário
        </button>
      </div>

      {/* ── Reinforcements list tab ── */}
      {tab === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className="section-heading">Reforços cadastrados</h2>
            <button className="btn btn-primary" onClick={openCreate} style={{ fontSize: 13 }}>
              + Novo reforço
            </button>
          </div>

          {reinforcements.length === 0 ? (
            <div className="empty-state">Nenhum reforço registado ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="reinf-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Instrumento</th>
                    <th>Contacto</th>
                    <th>Valor habitual</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {reinforcements.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td style={{ color: 'var(--text-2)' }}>{r.instrument ?? '—'}</td>
                      <td style={{ color: 'var(--text-2)' }}>{r.contact ?? '—'}</td>
                      <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                        {r.usual_fee != null ? `${Number(r.usual_fee).toFixed(2)} €` : '—'}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => openEdit(r)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => setConfirmDeleteId(r.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 className="section-heading">Eventos com reforços</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
              Passe o rato por cima de um evento para ver os reforços. Clique para gerir.
            </p>
          </div>
          <ReinforcementsCalendar
            events={events}
            eventAssignments={eventAssignments}
            onDayClick={openEventModal}
          />
        </div>
      )}

      {/* ── Create/Edit reinforcement modal ── */}
      {isFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-title">{editingItem ? 'Editar reforço' : 'Novo reforço'}</p>
            <div className="form-row">
              <label htmlFor="rf-name">Nome *</label>
              <input
                id="rf-name"
                type="text"
                placeholder="Nome completo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="rf-instrument">Instrumento</label>
              <input
                id="rf-instrument"
                type="text"
                placeholder="Ex: Clarinete, Trompete…"
                value={form.instrument}
                onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="rf-contact">Contacto</label>
              <input
                id="rf-contact"
                type="text"
                placeholder="Telefone ou e-mail"
                value={form.contact}
                onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="rf-fee">Valor habitual (€)</label>
              <input
                id="rf-fee"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 50.00"
                value={form.usual_fee}
                onChange={e => setForm(f => ({ ...f, usual_fee: e.target.value }))}
              />
            </div>
            {formError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '0 0 12px' }}>{formError}</p>
            )}
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveReinforcement} disabled={formSaving}>
                {formSaving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Event reinforcement management modal ── */}
      {managingEvent && (
        <div className="modal-backdrop" onClick={() => setManagingEvent(null)}>
          <div className="modal-box wide" onClick={e => e.stopPropagation()}>
            <p className="modal-title">{managingEvent.title}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${EVENT_BADGE[managingEvent.type] ?? 'badge-other'}`} style={{ fontSize: 11 }}>
                {EVENT_LABELS[managingEvent.type] ?? managingEvent.type}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {new Date(managingEvent.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                {managingEvent.location && ` · ${managingEvent.location}`}
              </span>
            </div>

            {/* Existing entries */}
            {eventEntries.length === 0 && !addingEntry ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, fontStyle: 'italic', margin: '0 0 16px' }}>
                Nenhum reforço associado ainda.
              </p>
            ) : (
              <div style={{ marginBottom: 8 }}>
                {eventEntries.map(entry => (
                  <div key={entry.id} className="entry-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="entry-name">{entry.reinforcement.name}</div>
                      {entry.reinforcement.instrument && (
                        <div className="entry-instr">{entry.reinforcement.instrument}</div>
                      )}
                    </div>
                    {editingEntryId === entry.id ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="entry-fee-input"
                          value={editingEntryFee}
                          onChange={e => setEditingEntryFee(e.target.value)}
                          placeholder="0.00"
                          autoFocus
                        />
                        <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => saveEntryFee(entry.id)}>✓</button>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setEditingEntryId(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <div className="entry-fee">
                          {entry.fee != null ? `${Number(entry.fee).toFixed(2)} €` : '—'}
                        </div>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          title="Editar valor"
                          onClick={() => { setEditingEntryId(entry.id); setEditingEntryFee(entry.fee != null ? String(entry.fee) : ''); }}
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          title="Remover"
                          onClick={() => setConfirmDeleteEntryId(entry.id)}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {eventEntries.length > 0 && (
                  <div className="total-row">
                    <span>Total</span>
                    <span className="total-val">{eventTotal.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            )}

            {/* Add new entry row */}
            {addingEntry ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                <select
                  value={newEntryReinfId}
                  onChange={e => {
                    setNewEntryReinfId(e.target.value);
                    const reinf = reinforcements.find(r => r.id === parseInt(e.target.value));
                    if (reinf?.usual_fee != null) setNewEntryFee(String(reinf.usual_fee));
                    else setNewEntryFee('');
                  }}
                  style={{ flex: '1 1 180px', minWidth: 160 }}
                >
                  <option value="">Selecionar reforço…</option>
                  {availableReinforcements.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}{r.instrument ? ` (${r.instrument})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor (€)"
                  value={newEntryFee}
                  onChange={e => setNewEntryFee(e.target.value)}
                  style={{ width: 110 }}
                />
                <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={addEntry}>Adicionar</button>
                <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => { setAddingEntry(false); setEntryError(''); }}>Cancelar</button>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ marginTop: 12, fontSize: 13 }}
                onClick={() => {
                  setAddingEntry(true);
                  setNewEntryReinfId('');
                  setNewEntryFee('');
                  setEntryError('');
                }}
                disabled={availableReinforcements.length === 0}
              >
                + Adicionar reforço
              </button>
            )}

            {entryError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: '10px 0 0' }}>{entryError}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setManagingEvent(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete reinforcement ── */}
      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Tem a certeza que pretende remover este reforço? Todas as associações a eventos serão também removidas."
          confirmLabel="Remover"
          onConfirm={() => deleteReinforcement(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* ── Confirm delete event entry ── */}
      {confirmDeleteEntryId !== null && (
        <ConfirmDialog
          message="Tem a certeza que pretende remover este reforço do evento?"
          confirmLabel="Remover"
          onConfirm={() => removeEntry(confirmDeleteEntryId)}
          onCancel={() => setConfirmDeleteEntryId(null)}
        />
      )}
    </AuthenticatedShell>
  );
}
