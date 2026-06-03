"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import {
  EVENT_BADGE,
  EVENT_LABELS,
  MONTHS,
  WEEKDAYS,
  formatDate,
  formatDays,
  formatTime,
} from '@/lib/format';
import type { BirthdayItem, EventItem, FeedItem } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type HomeResponse = {
  name: string;
  system_role: string;
  musical_role?: string | null;
  upcoming_events: EventItem[];
  upcoming_birthdays: BirthdayItem[];
  recent_feed: FeedItem[];
};

function eventTypeLabel(type: string): string {
  return EVENT_LABELS[type] ?? type;
}
function eventBadgeClass(type: string): string {
  return EVENT_BADGE[type] ?? 'badge-other';
}

// ─── EventModal ───────────────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const typeColors: Record<string, string> = {
    CONCERT: 'var(--concert-color)', REHEARSAL: 'var(--rehearsal-color)',
    SPECIAL_REHEARSAL: 'var(--special-color)', OTHER: 'var(--muted)',
  };
  const color = typeColors[event.type] ?? typeColors.OTHER;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ borderTop: `3px solid ${color}` }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--muted)', width: 32, height: 32,
            cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
        >✕</button>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20, paddingRight: 40 }}>
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
            width: 56, height: 62,
          }}>
            <span style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1, fontFamily: 'var(--font-display, serif)' }}>
              {new Date(event.start_time).getDate()}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)' }}>
              {MONTHS[new Date(event.start_time).getMonth()].slice(0, 3).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', lineHeight: 1.2, color: 'var(--text)' }}>
              {event.title}
            </h2>
            <span className={`badge ${eventBadgeClass(event.type)}`}>{eventTypeLabel(event.type)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--muted)', marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{formatTime(event.start_time)}</span>
          {event.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>{event.location}</span>}
        </div>

        {event.description && (
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
            {event.description}
          </p>
        )}

        {event.type === 'CONCERT' && (event.facebook_link || event.instagram_link) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {event.facebook_link && (
              <a href={event.facebook_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                textDecoration: 'none', background: 'rgba(24,119,242,0.12)',
                border: '1px solid rgba(24,119,242,0.3)', color: '#4e9cf5',
              }}>Facebook</a>
            )}
            {event.instagram_link && (
              <a href={event.instagram_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                textDecoration: 'none', background: 'rgba(225,48,108,0.1)',
                border: '1px solid rgba(225,48,108,0.25)', color: '#e1306c',
              }}>Instagram</a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── MiniCalendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ events, birthdays = [], onEventClick }: { events: EventItem[]; birthdays?: BirthdayItem[]; onEventClick: (ev: EventItem) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tooltip, setTooltip] = useState<{ day: number; x: number; y: number } | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eventsByDay: Record<number, EventItem[]> = {};
  for (const ev of events) {
    const d = new Date(ev.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  const birthdayNamesByDay: Record<number, string[]> = {};
  for (const b of birthdays) {
    if (!b.birth_date) continue;
    const parts = b.birth_date.split('-');
    const bMonth = parseInt(parts[1], 10) - 1;
    const bDay = parseInt(parts[2], 10);
    if (bMonth === month) {
      if (!birthdayNamesByDay[bDay]) birthdayNamesByDay[bDay] = [];
      birthdayNamesByDay[bDay].push(b.name);
    }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setTooltip(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setTooltip(null);
  }
  function scheduleClose() { closeTimer.current = setTimeout(() => setTooltip(null), 180); }
  function cancelClose() { if (closeTimer.current) clearTimeout(closeTimer.current); }

  function handleDayEnter(e: React.MouseEvent<HTMLButtonElement>, day: number) {
    if (!eventsByDay[day] && !birthdayNamesByDay[day]) return;
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = calRef.current?.getBoundingClientRect();
    if (!parentRect) return;
    setTooltip({ day, x: rect.left - parentRect.left, y: rect.bottom - parentRect.top + 6 });
  }

  function handleDayClick(day: number) {
    if (!eventsByDay[day]) return;
    onEventClick(eventsByDay[day][0]);
  }

  function getDayClass(day: number): string {
    const items = eventsByDay[day];
    if (items) {
      const types = new Set(items.map(i => i.type));
      const hasRehearsal = types.has('REHEARSAL') || types.has('SPECIAL_REHEARSAL');
      const hasConcert = types.has('CONCERT');
      if (hasConcert && hasRehearsal) return 'day-mixed-ev';
      if (hasConcert) return 'day-concert';
      if (hasRehearsal) return 'day-rehearsal';
      return 'day-other-ev';
    }
    if (birthdayNamesByDay[day]) return 'day-birthday';
    return '';
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
              className={['cal-day', getDayClass(day), isToday(day) ? 'today' : '', (eventsByDay[day] || birthdayNamesByDay[day]) ? 'has-events' : ''].filter(Boolean).join(' ')}
              onMouseEnter={(e) => handleDayEnter(e, day)}
              onMouseLeave={scheduleClose}
              onClick={() => handleDayClick(day)}
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
        <span className="cal-legend-dot" style={{ background: 'var(--birthday-color)' }} />
        <span className="cal-legend-label">Aniversário</span>
      </div>
      {tooltip && (eventsByDay[tooltip.day] || birthdayNamesByDay[tooltip.day]) && (
        <div
          className="cal-tooltip"
          style={{ top: tooltip.y, left: Math.min(tooltip.x, 180) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {eventsByDay[tooltip.day]?.map(ev => (
            <div
              key={ev.id}
              style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}
              onClick={() => onEventClick(ev)}
            >
              <strong style={{ fontSize: 13 }}>{ev.title}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${eventBadgeClass(ev.type)}`}>{eventTypeLabel(ev.type)}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{formatTime(ev.start_time)}</span>
            </div>
          ))}
          {birthdayNamesByDay[tooltip.day]?.map(name => (
            <div key={name} style={{ padding: '6px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>🎂</span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [birthdayLimit, setBirthdayLimit] = useState(5);
  const [birthdayStep, setBirthdayStep] = useState(10);

  useEffect(() => {
    Promise.all([
      authFetch(`${API_URL}/api/v1/home`).then(async r => { if (!r.ok) throw new Error(); return r.json(); }),
      authFetch(`${API_URL}/api/v1/events`).then(r => r.json()).catch(() => []),
    ]).then(([homeData, events]) => {
      setData(homeData);
      setAllEvents(Array.isArray(events) ? events : []);
      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  const newsletters = data?.recent_feed.filter(f => f.item_type === 'NEWSLETTER') ?? [];
  const birthdays = data?.upcoming_birthdays ?? [];

  return (
    <AuthenticatedShell title="Início">
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, letterSpacing: '0.08em' }}>A carregar…</span>
        </div>
      ) : (
        <div className="home-grid">
          {/* LEFT COLUMN */}
          <div className="col">
            <div className="section-head">
              <span className="section-label-mono">Newsletter</span>
              <span className="section-count">{newsletters.length}</span>
            </div>

            {newsletters.length > 0 ? (
              <div className="feed">
                {newsletters.map(item => (
                  <article key={item.id} className="feed-item">
                    <div className="feed-item-header">
                      <time className="feed-date">{formatDate(item.published_at)}</time>
                      {item.event_type && <span className={`badge ${eventBadgeClass(item.event_type)}`}>{eventTypeLabel(item.event_type)}</span>}
                    </div>
                    <h3 className="feed-title">{item.title}</h3>
                    {item.description && <p className="feed-body">{item.description}</p>}
                    {item.event_type === 'CONCERT' && (item.facebook_link || item.instagram_link) && (
                      <div className="social-row">
                        {item.facebook_link && (
                          <a href={item.facebook_link} target="_blank" rel="noopener noreferrer" className="social-link fb">Facebook</a>
                        )}
                        {item.instagram_link && (
                          <a href={item.instagram_link} target="_blank" rel="noopener noreferrer" className="social-link ig">Instagram</a>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Sem publicações recentes.</p>
            )}

            {birthdays.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 24 }}>
                  <span className="section-label-mono">Aniversários</span>
                  <span className="section-count">{birthdays.length}</span>
                </div>
                <div className="birthdays">
                  {birthdays.slice(0, birthdayLimit).map(b => (
                    <div key={b.id} className="birthday-row">
                      <div className="bday-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
                          <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
                          <path d="M2 21h20" />
                          <path d="M7 8v3" />
                          <path d="M12 8v3" />
                          <path d="M17 8v3" />
                          <path d="M7 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1v1H7V4z" />
                          <path d="M12 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1v1h-2V4z" />
                          <path d="M17 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1v1h-2V4z" />
                        </svg>
                      </div>
                      <div className="bday-info">
                        <span className="bday-name">{b.name}</span>
                        <span className="bday-when">{formatDays(b.days_until)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {(birthdayLimit < birthdays.length || birthdayLimit > 5) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {birthdayLimit < birthdays.length && (
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => {
                          setBirthdayLimit(prev => prev + birthdayStep);
                          setBirthdayStep(prev => prev + 10);
                        }}
                      >
                        Ver mais ({Math.min(birthdayStep, birthdays.length - birthdayLimit)})
                      </button>
                    )}
                    {birthdayLimit > 5 && (
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => { setBirthdayLimit(5); setBirthdayStep(10); }}
                      >
                        Ver menos
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="col">
            <div className="section-head">
              <span className="section-label-mono">Calendário</span>
            </div>
            <MiniCalendar events={allEvents} birthdays={birthdays} onEventClick={setSelectedEvent} />

            <div className="section-head" style={{ marginTop: 24 }}>
              <span className="section-label-mono">Próximos eventos</span>
              <span className="section-count">{(data?.upcoming_events ?? []).length}</span>
            </div>

            {(data?.upcoming_events ?? []).length > 0 ? (
              <div className="events">
                {(data?.upcoming_events ?? []).map(ev => (
                  <article key={ev.id} className="event-row" onClick={() => setSelectedEvent(ev)}>
                    <div className="event-date-block">
                      <span className="event-day">{new Date(ev.start_time).getDate()}</span>
                      <span className="event-mon">{MONTHS[new Date(ev.start_time).getMonth()].slice(0,3).toUpperCase()}</span>
                    </div>
                    <div className="event-info">
                      <div className="event-title-row">
                        <span className="event-title">{ev.title}</span>
                        <span className={`badge ${eventBadgeClass(ev.type)}`}>{eventTypeLabel(ev.type)}</span>
                      </div>
                      <div className="event-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{formatTime(ev.start_time)}</span>
                        {ev.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>·<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>{ev.location}</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Sem eventos futuros.</p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .home-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }

        .col { display: flex; flex-direction: column; gap: 0; }

        .section-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .section-label-mono {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .section-count {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          background: var(--surface-2);
          color: var(--muted);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1px 6px;
          min-width: 22px;
          text-align: center;
        }

        .feed { display: flex; flex-direction: column; gap: 8px; margin-bottom: 0; }

        .feed-item {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.15s;
        }
        .feed-item:hover { border-color: var(--border-strong); }

        .feed-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .feed-date {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        .feed-title {
          font-family: var(--font-display, serif);
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.3;
        }

        .feed-body {
          font-size: 13px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .social-row { display: flex; gap: 6px; flex-wrap: wrap; }

        .social-link {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .social-link:hover { opacity: 0.8; }
        .fb { background: rgba(24,119,242,0.12); border: 1px solid rgba(24,119,242,0.28); color: #4e9cf5; }
        .ig { background: rgba(225,48,108,0.1); border: 1px solid rgba(225,48,108,0.24); color: #e1306c; }

        .birthdays { display: flex; flex-direction: column; gap: 4px; }

        .birthday-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .bday-icon { width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--accent-dim); border-radius: 6px; color: var(--accent); }

        .bday-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex: 1;
          gap: 8px;
        }

        .bday-name { font-size: 14px; font-weight: 500; color: var(--text); }

        .bday-when {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--accent);
          white-space: nowrap;
        }

        .btn-ghost-sm {
          padding: 5px 12px;
          font-size: 12px;
          font-family: var(--font-mono, monospace);
          font-weight: 500;
          color: var(--muted);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          transition: color 0.12s, border-color 0.12s;
        }
        .btn-ghost-sm:hover { color: var(--accent); border-color: var(--accent); }

        .events { display: flex; flex-direction: column; gap: 6px; }

        .event-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.12s, background 0.12s;
        }
        .event-row:hover { border-color: var(--accent); background: var(--surface-2); }

        .event-date-block {
          flex-shrink: 0;
          width: 42px;
          height: 46px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 7px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .event-day {
          font-family: var(--font-display, serif);
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }

        .event-mon {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          color: var(--muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .event-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .event-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .event-meta {
          font-size: 12px;
          color: var(--muted);
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .empty-state {
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 16px;
          font-style: italic;
        }

        @media (max-width: 900px) {
          .home-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AuthenticatedShell>
  );
}
