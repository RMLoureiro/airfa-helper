"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type EventItem = {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  location?: string | null;
  type: string;
  facebook_link?: string | null;
  instagram_link?: string | null;
};

type BirthdayItem = {
  id: number;
  name: string;
  birth_date?: string | null;
  days_until?: number | null;
};

type FeedItem = {
  id: number;
  item_type: 'EVENT' | 'NEWSLETTER';
  title: string;
  description?: string | null;
  published_at: string;
  event_type?: string | null;
  facebook_link?: string | null;
  instagram_link?: string | null;
};

type HomeResponse = {
  name: string;
  system_role: string;
  musical_role?: string | null;
  upcoming_events: EventItem[];
  upcoming_birthdays: BirthdayItem[];
  recent_feed: FeedItem[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}
function formatDays(days: number | null | undefined): string {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}
function eventTypeLabel(type: string): string {
  const map: Record<string, string> = { CONCERT: 'Concerto', REHEARSAL: 'Ensaio', SPECIAL_REHEARSAL: 'Ensaio especial', OTHER: 'Outro' };
  return map[type] ?? type;
}
function eventBadgeClass(type: string): string {
  const map: Record<string, string> = { CONCERT: 'badge-concert', REHEARSAL: 'badge-rehearsal', SPECIAL_REHEARSAL: 'badge-special', OTHER: 'badge-other' };
  return map[type] ?? 'badge-other';
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
          <span>⏱ {formatTime(event.start_time)}</span>
          {event.location && <span>📍 {event.location}</span>}
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
function MiniCalendar({ events, onEventClick }: { events: EventItem[]; onEventClick: (ev: EventItem) => void }) {
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
    if (!eventsByDay[day]) return;
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
              className={['cal-day', isToday(day) ? 'today' : '', eventsByDay[day] ? 'has-events' : ''].filter(Boolean).join(' ')}
              onMouseEnter={(e) => handleDayEnter(e, day)}
              onMouseLeave={scheduleClose}
              onClick={() => handleDayClick(day)}
            >
              {day}
              {eventsByDay[day] && <span className="cal-dot" />}
            </button>
          )
        )}
      </div>
      {tooltip && eventsByDay[tooltip.day] && (
        <div
          className="cal-tooltip"
          style={{ top: tooltip.y, left: Math.min(tooltip.x, 180) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {eventsByDay[tooltip.day].map(ev => (
            <div
              key={ev.id}
              style={{ cursor: 'pointer', padding: '6px 4px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}
              onClick={() => onEventClick(ev)}
            >
              <strong style={{ fontSize: 13 }}>{ev.title}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${eventBadgeClass(ev.type)}`}>{eventTypeLabel(ev.type)}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏱ {formatTime(ev.start_time)}</span>
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
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${apiUrl}/api/v1/home`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => router.push('/login'));
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
                  {birthdays.map(b => (
                    <div key={b.id} className="birthday-row">
                      <div className="bday-icon">🎂</div>
                      <div className="bday-info">
                        <span className="bday-name">{b.name}</span>
                        <span className="bday-when">{formatDays(b.days_until)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="col">
            <div className="section-head">
              <span className="section-label-mono">Calendário</span>
            </div>
            <MiniCalendar events={data?.upcoming_events ?? []} onEventClick={setSelectedEvent} />

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
                        <span>⏱ {formatTime(ev.start_time)}</span>
                        {ev.location && <span>· {ev.location}</span>}
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

        .bday-icon { font-size: 18px; flex-shrink: 0; }

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
