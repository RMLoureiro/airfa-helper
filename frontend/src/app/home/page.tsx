"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

function formatDays(days: number | null | undefined): string {
  if (days === 0) return 'Hoje 🎂';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CONCERT: 'Concerto', REHEARSAL: 'Ensaio',
    SPECIAL_REHEARSAL: 'Ensaio especial', OTHER: 'Outro',
  };
  return map[type] ?? type;
}

function eventTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    CONCERT: 'badge-concert', REHEARSAL: 'badge-rehearsal',
    SPECIAL_REHEARSAL: 'badge-special', OTHER: 'badge-other',
  };
  return map[type] ?? 'badge-other';
}

// ──── Event Modal ──────────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const badgeColors: Record<string, { bg: string; color: string; border: string }> = {
    CONCERT:          { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    REHEARSAL:        { bg: 'rgba(125,211,252,0.15)', color: '#7dd3fc', border: 'rgba(125,211,252,0.3)' },
    SPECIAL_REHEARSAL:{ bg: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: 'rgba(167,139,250,0.3)' },
    OTHER:            { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', border: 'rgba(156,163,175,0.3)' },
  };
  const bc = badgeColors[event.type] ?? badgeColors.OTHER;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel)',
          border: '1px solid rgba(125,211,252,0.3)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          position: 'relative',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          color: 'var(--text)',
          fontFamily: 'inherit',
        }}
      >
        {/* Fechar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'var(--btn-subtle)',
            border: '1px solid var(--btn-subtle-border)',
            borderRadius: '8px',
            color: 'var(--muted)',
            width: '34px', height: '34px',
            fontSize: '16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,113,133,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#fb7185'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--btn-subtle)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', marginBottom: '18px', paddingRight: '40px' }}>
          <div style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(125,211,252,0.1)', border: '1px solid rgba(125,211,252,0.25)',
            borderRadius: '12px', width: '64px', height: '70px',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#7dd3fc', lineHeight: 1 }}>
              {new Date(event.start_time).getDate()}
            </span>
            <span style={{ fontSize: '11px', color: '#9aa7b4', fontWeight: 600, letterSpacing: '0.06em' }}>
              {MONTHS[new Date(event.start_time).getMonth()].slice(0, 3).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.2 }}>{event.title}</h2>
            <span style={{
              display: 'inline-block', fontSize: '11px', padding: '3px 10px',
              borderRadius: '999px', fontWeight: 600,
              background: bc.bg, color: bc.color, border: `1px solid ${bc.border}`,
            }}>
              {eventTypeLabel(event.type)}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '18px', fontSize: '14px', color: '#9aa7b4', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span>🕐 {formatTime(event.start_time)}</span>
          {event.location && <span>📍 {event.location}</span>}
        </div>

        {/* Descrição */}
        {event.description && (
          <p style={{ fontSize: '15px', color: '#9aa7b4', lineHeight: 1.6, margin: '0 0 20px' }}>
            {event.description}
          </p>
        )}

        {/* Redes sociais */}
        {event.type === 'CONCERT' && (event.facebook_link || event.instagram_link) && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {event.facebook_link && (
              <a href={event.facebook_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', background: 'rgba(24,119,242,0.15)',
                border: '1px solid rgba(24,119,242,0.35)', color: '#4e9cf5',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                Facebook
              </a>
            )}
            {event.instagram_link && (
              <a href={event.instagram_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', background: 'rgba(225,48,108,0.12)',
                border: '1px solid rgba(225,48,108,0.3)', color: '#e1306c',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                Instagram
              </a>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ──── Mini Calendar ────────────────────────────────────────────────────────
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
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setTooltip(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setTooltip(null);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setTooltip(null), 180);
  }
  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }

  function handleDayEnter(e: React.MouseEvent<HTMLButtonElement>, day: number) {
    if (!eventsByDay[day]) return;
    cancelClose();
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const parentRect = calRef.current?.getBoundingClientRect();
    if (!parentRect) return;
    setTooltip({ day, x: rect.left - parentRect.left, y: rect.bottom - parentRect.top + 6 });
  }

  function handleDayClick(day: number) {
    if (!eventsByDay[day]) return;
    if (eventsByDay[day].length === 1) {
      onEventClick(eventsByDay[day][0]);
    } else {
      onEventClick(eventsByDay[day][0]); // abre o primeiro; pode ser expandido
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
              {eventsByDay[day] && <span className="dot" />}
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
            <div key={ev.id} className="tooltip-event" onClick={() => onEventClick(ev)} style={{ cursor: 'pointer' }}>
              <strong>{ev.title}</strong>
              <span className={`badge ${eventTypeBadgeClass(ev.type)}`}>{eventTypeLabel(ev.type)}</span>
              <div className="tooltip-meta">🕐 {formatTime(ev.start_time)}{ev.location && <> · 📍 {ev.location}</>}</div>
              <div className="tooltip-hint">Clica para ver detalhes</div>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        .calendar { background: var(--panel-alpha); border: 1px solid var(--border); border-radius: 12px; padding: 16px; position: relative; user-select: none; }
        .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .cal-nav { background: var(--btn-subtle); border: 1px solid var(--border); border-radius: 5px; color: var(--text); width: 40px; height: 40px; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
        .cal-nav:hover { background: var(--nav-link-border); }
        .cal-title { font-weight: 600; font-size: 20px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .cal-weekday { text-align: center; font-size: 14px; color: var(--muted); padding-bottom: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .cal-day { position: relative; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid transparent; background: transparent; color: var(--text); font-size: 18px; cursor: default; transition: background 0.15s, border-color 0.15s; }
        .cal-day.has-events { cursor: pointer; background: rgba(125,211,252,0.08); border-color: rgba(125,211,252,0.2); }
        .cal-day.has-events:hover { background: rgba(125,211,252,0.18); border-color: rgba(125,211,252,0.4); }
        .cal-day.today { background: rgba(56,189,248,0.2); border-color: rgba(56,189,248,0.5); font-weight: 700; color: var(--accent); }
        .dot { position: absolute; bottom: 0px; width: 4px; height: 4px; border-radius: 50%; background: var(--accent); }
        .cal-tooltip { position: absolute; z-index: 50; background: var(--panel); border: 1px solid rgba(125,211,252,0.3); border-radius: 14px; padding: 12px 14px; min-width: 200px; max-width: 280px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 10px; pointer-events: auto; }
        .tooltip-event { display: flex; flex-direction: column; gap: 4px; border-radius: 8px; padding: 4px; transition: background 0.12s; }
        .tooltip-event:hover { background: rgba(125,211,252,0.08); }
        .tooltip-event strong { font-size: 13px; }
        .tooltip-meta { font-size: 11px; color: var(--muted); }
        .tooltip-hint { font-size: 10px; color: rgba(125,211,252,0.5); margin-top: 2px; }
        .badge { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 999px; font-weight: 600; width: fit-content; }
        .badge-concert { background: rgba(251,191,36,0.18); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
        .badge-rehearsal { background: rgba(125,211,252,0.15); color: #7dd3fc; border: 1px solid rgba(125,211,252,0.3); }
        .badge-special { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
        .badge-other { background: rgba(156,163,175,0.15); color: #9ca3af; border: 1px solid rgba(156,163,175,0.3); }
      `}</style>
    </div>
  );
}

// ──── Home Page ────────────────────────────────────────────────────────────
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

  // Combinar newsletters com aniversários
  const combinedFeed = [
    ...newsletters.map(n => ({ type: 'newsletter' as const, data: n, date: new Date(n.published_at) })),
    ...(data?.upcoming_birthdays ?? []).map(b => ({
      type: 'birthday' as const,
      data: b,
      date: new Date(), // usando hoje como referência para ordenação
      customDate: b.days_until === 0 ? new Date() : new Date(new Date().getTime() + (b.days_until || 0) * 24 * 60 * 60 * 1000),
    })),
  ].sort((a, b) => {
    const dateA = 'customDate' in a ? a.customDate : a.date;
    const dateB = 'customDate' in b ? b.customDate : b.date;
    return dateB.getTime() - dateA.getTime(); // mais recente primeiro
  });

  return (
    <AuthenticatedShell title="Início">
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {loading ? (
        <div className="loading">A carregar...</div>
      ) : (
        <div className="home-grid">
          {/* ── LEFT: Newsletter (com aniversários integrados) ── */}
          <div className="col">
            <div className="section-label">Newsletter</div>

            {combinedFeed.length ? (
              <div className="feed-list">
                {combinedFeed.map(item => (
                  <article key={`${item.type}-${item.data.id}`} className="feed-card">
                    {item.type === 'newsletter' ? (
                      <>
                        <div className="feed-card-header">
                          <span className="newsletter-badge">Newsletter</span>
                          <time className="feed-date">{formatDate(item.data.published_at)}</time>
                        </div>
                        <strong className="feed-title">{item.data.title}</strong>
                        {item.data.description && <p className="feed-body">{item.data.description}</p>}
                        {item.data.event_type === 'CONCERT' && (item.data.facebook_link || item.data.instagram_link) && (
                          <div className="social-links">
                            {item.data.facebook_link && (
                              <a href={item.data.facebook_link} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                                Facebook
                              </a>
                            )}
                            {item.data.instagram_link && (
                              <a href={item.data.instagram_link} target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                                Instagram
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="feed-card-header">
                          <span className="birthday-badge">🎂 Aniversário</span>
                          <time className="feed-date">{formatDays(item.data.days_until)}</time>
                        </div>
                        <strong className="feed-title">{item.data.name}</strong>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">Sem publicações na newsletter.</p>
            )}
          </div>

          {/* ── RIGHT: Calendar + Upcoming Events ── */}
          <div className="col">
            <div className="section-label">Calendário</div>
            <MiniCalendar events={data?.upcoming_events ?? []} onEventClick={setSelectedEvent} />

            <div className="section-label" style={{ marginTop: 24 }}>Próximos eventos</div>
            {data?.upcoming_events?.length ? (
              <div className="event-list">
                {data.upcoming_events.map(ev => (
                  <article key={ev.id} className="event-card" onClick={() => setSelectedEvent(ev)} style={{ cursor: 'pointer' }}>
                    <div className="event-card-top">
                      <div className="event-date-block">
                        <span className="event-day">{new Date(ev.start_time).getDate()}</span>
                        <span className="event-month">{MONTHS[new Date(ev.start_time).getMonth()].slice(0, 3).toUpperCase()}</span>
                      </div>
                      <div className="event-info">
                        <div className="event-title-row">
                          <strong>{ev.title}</strong>
                          <span className={`badge ${eventTypeBadgeClass(ev.type)}`}>{eventTypeLabel(ev.type)}</span>
                        </div>
                        <div className="event-meta">🕐 {formatTime(ev.start_time)}{ev.location && <> · 📍 {ev.location}</>}</div>
                        {ev.description && <p className="event-desc">{ev.description}</p>}
                      </div>
                    </div>
                    {ev.type === 'CONCERT' && (ev.facebook_link || ev.instagram_link) && (
                      <div className="social-links">
                        {ev.facebook_link && (
                          <a href={ev.facebook_link} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            Facebook
                          </a>
                        )}
                        {ev.instagram_link && (
                          <a href={ev.instagram_link} target="_blank" rel="noopener noreferrer" className="social-btn instagram">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : <p className="empty">Sem eventos futuros.</p>}
          </div>
        </div>
      )}

      <style jsx>{`
        .loading { display: flex; align-items: center; justify-content: center; min-height: 300px; color: var(--muted); }

        .home-grid { display: grid; grid-template-columns: 1fr 420px; gap: 20px; align-items: start; }
        @media (max-width: 900px) { .home-grid { grid-template-columns: 1fr; } }

        .col { display: flex; flex-direction: column; gap: 10px; }

        .section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: var(--accent); margin-bottom: 2px; }

        /* events */
        .event-list { display: flex; flex-direction: column; gap: 8px; }
        .event-card { background: var(--panel-alpha); border: 1px solid var(--border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s; }
        .event-card:hover { border-color: rgba(125,211,252,0.25); }
        .event-card-top { display: flex; gap: 7px; align-items: flex-start; }
        .event-date-block { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(125,211,252,0.1); border: 1px solid rgba(125,211,252,0.25); border-radius: 7px; width: 38px; height: 42px; }
        .event-day { font-size: 13px; font-weight: 700; color: var(--accent); line-height: 1; }
        .event-month { font-size: 8px; color: var(--muted); font-weight: 600; letter-spacing: 0.05em; }
        .event-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .event-title-row { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .event-title-row strong { font-size: 16px; }
        .event-meta { font-size: 13px; color: var(--muted); }
        .event-desc { font-size: 14px; color: var(--muted); margin: 2px 0 0; line-height: 1.35; }

        .badge { display: inline-block; font-size: 12px; padding: 3px 10px; border-radius: 999px; font-weight: 600; }
        .badge-concert { background: rgba(251,191,36,0.18); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
        .badge-rehearsal { background: rgba(125,211,252,0.15); color: #7dd3fc; border: 1px solid rgba(125,211,252,0.3); }
        .badge-special { background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
        .badge-other { background: rgba(156,163,175,0.15); color: #9ca3af; border: 1px solid rgba(156,163,175,0.3); }

        /* social */
        .social-links { display: flex; gap: 6px; flex-wrap: wrap; }
        .social-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 7px; font-size: 9px; font-weight: 600; text-decoration: none; transition: filter 0.15s, transform 0.1s; }
        .social-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
        .facebook { background: rgba(24,119,242,0.15); border: 1px solid rgba(24,119,242,0.35); color: #4e9cf5; }
        .instagram { background: rgba(225,48,108,0.12); border: 1px solid rgba(225,48,108,0.3); color: #e1306c; }

        /* birthdays - REMOVED, now integrated in feed */

        /* feed */
        .feed-list { display: flex; flex-direction: column; gap: 10px; }
        .feed-card { background: var(--panel-alpha); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; transition: border-color 0.15s; }
        .feed-card:hover { border-color: rgba(125,211,252,0.2); }
        .feed-card-header { display: flex; justify-content: space-between; align-items: center; gap: 7px; }
        .newsletter-badge { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em; }
        .birthday-badge { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em; }
        .feed-date { font-size: 13px; color: var(--muted); }
        .feed-title { font-size: 17px; }
        .feed-body { font-size: 14px; color: var(--muted); line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        .empty { color: var(--muted); font-size: 10px; margin: 0; }
      `}</style>
    </AuthenticatedShell>
  );
}
