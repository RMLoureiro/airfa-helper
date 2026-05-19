"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type PresenceItem = {
  id: number;
  title: string;
  type: string;
  start_time: string;
  location?: string | null;
  present_count: number;
  tardy_count: number;
  justified_count: number;
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

// ─── Constants ────────────────────────────────────────────────────────────────
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

const EVENT_TYPE_LABEL: Record<string, string> = {
  REHEARSAL: 'Ensaio',
  SPECIAL_REHEARSAL: 'Ensaio Especial',
  CONCERT: 'Concerto',
  OTHER: 'Outro',
};

const MUSICAL_ROLE_LABEL: Record<string, string> = {
  MAESTRO: 'Maestro',
  FLUTE_PLAYER: 'Flauta',
  CLARINET_PLAYER: 'Clarinete',
  SAXOPHONE_PLAYER: 'Saxofone',
  TROMBONE_PLAYER: 'Trombone',
  EUPHONIUM_PLAYER: 'Eufônio',
  TUBA_PLAYER: 'Tuba',
  FRENCH_HORN_PLAYER: 'Trompa',
  TRUMPET_PLAYER: 'Trompete',
  PERCUSSION_PLAYER: 'Percussão',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Maps a raw status to a canonical color-class: 'present' | 'absent' | null */
function normalizeColor(status: string | null | undefined): 'present' | 'absent' | null {
  if (!status) return null;
  if (status === 'PRESENT' || status === 'TARDY') return 'present';
  if (status === 'ABSENT' || status === 'JUSTIFIED') return 'absent';
  return null;
}

/** Human label for a status, respecting the isAdmin flag */
function statusLabel(status: string | null | undefined, isAdmin: boolean): string {
  if (!status) return 'Sem registo';
  if (isAdmin) {
    const map: Record<string, string> = {
      PRESENT: 'Presente', TARDY: 'Atrasado', ABSENT: 'Falta', JUSTIFIED: 'Justificado',
    };
    return map[status] ?? status;
  }
  if (status === 'PRESENT' || status === 'TARDY') return 'Presente';
  if (status === 'ABSENT' || status === 'JUSTIFIED') return 'Falta';
  return 'Sem registo';
}

function countPresent(items: PresenceItem[]): number {
  return items.filter(i => normalizeColor(i.my_status) === 'present').length;
}
function countAbsent(items: PresenceItem[]): number {
  return items.filter(i => normalizeColor(i.my_status) === 'absent').length;
}
function countPresentOnly(items: PresenceItem[]): number {
  return items.filter(i => i.my_status === 'PRESENT').length;
}
function countTardy(items: PresenceItem[]): number {
  return items.filter(i => i.my_status === 'TARDY').length;
}
function countJustified(items: PresenceItem[]): number {
  return items.filter(i => i.my_status === 'JUSTIFIED').length;
}
function countAbsentOnly(items: PresenceItem[]): number {
  return items.filter(i => i.my_status === 'ABSENT').length;
}

// ─── DonutChart ───────────────────────────────────────────────────────────────
type SegKey = 'present' | 'tardy' | 'justified' | 'absent';
function DonutChart({ present, tardy, justified, absent, label }: {
  present: number; tardy: number; justified: number; absent: number; label: string;
}) {
  const [hovered, setHovered] = useState<SegKey | null>(null);
  const total = present + tardy + justified + absent;
  const r = 38;
  const sw = 11;
  const circ = 2 * Math.PI * r;
  const gap = 0;

  function arcLen(n: number) { return total > 0 ? (n / total) * circ : 0; }

  const segDefs: { key: SegKey; n: number; color: string; dim: string; tip: string }[] = [
    { key: 'present',   n: present,   color: '#4ade80', dim: 'rgba(74,222,128,0.65)',   tip: `✓ ${present} presente${present !== 1 ? 's' : ''}` },
    { key: 'tardy',     n: tardy,     color: '#fbbf24', dim: 'rgba(251,191,36,0.65)',   tip: `⟳ ${tardy} atrasado${tardy !== 1 ? 's' : ''}` },
    { key: 'justified', n: justified, color: '#7dd3fc', dim: 'rgba(125,211,252,0.65)',  tip: `~ ${justified} justificado${justified !== 1 ? 's' : ''}` },
    { key: 'absent',    n: absent,    color: '#fb7185', dim: 'rgba(251,113,133,0.65)',  tip: `✗ ${absent} falta${absent !== 1 ? 's' : ''}` },
  ];

  let offset = 0;
  const arcs = segDefs.map(seg => {
    const len = arcLen(seg.n);
    const start = offset;
    if (seg.n > 0) offset += len + gap;
    return { ...seg, len, start };
  });

  const pct = total > 0 ? Math.round(((present + tardy) / total) * 100) : 0;
  const hoveredSeg = segDefs.find(s => s.key === hovered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <svg width="150" height="150" viewBox="0 0 110 110" style={{ overflow: 'visible' }}>
          {total === 0 && (
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(125,211,252,0.1)" strokeWidth={sw} />
          )}
          {arcs.map(arc => arc.n > 0 && (
            <circle
              key={arc.key}
              cx="55" cy="55" r={r} fill="none"
              stroke={hovered === arc.key ? arc.color : arc.dim}
              strokeWidth={sw}
              strokeDasharray={`${Math.max(0, arc.len - gap)} ${circ}`}
              strokeDashoffset={-arc.start}
              transform="rotate(-90 55 55)"
              style={{ cursor: 'pointer', transition: 'stroke 0.15s' }}
              onMouseEnter={() => setHovered(arc.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x="55" y="51" textAnchor="middle" dominantBaseline="middle"
            fill="var(--text, #e6edf3)" fontSize="18" fontWeight="700"
            style={{ fontFamily: 'inherit', pointerEvents: 'none' }}>
            {pct}%
          </text>
          <text x="55" y="66" textAnchor="middle"
            fill="var(--muted, #9aa7b4)" fontSize="10" fontWeight="600"
            style={{ fontFamily: 'inherit', pointerEvents: 'none' }}>
            {total > 0 ? `${present + tardy}/${total}` : '—'}
          </text>
        </svg>
        {hovered && hoveredSeg && (
          <div style={{
            position: 'absolute', bottom: '108%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--panel, #161b22)', border: '1px solid var(--border, rgba(125,211,252,0.2))',
            borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            pointerEvents: 'none', zIndex: 20, color: hoveredSeg.color,
          }}>
            {hoveredSeg.tip}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--muted, #9aa7b4)',
        letterSpacing: '0.07em', textTransform: 'uppercase' as const,
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── PresenceCalendar ─────────────────────────────────────────────────────────
function PresenceCalendar({ attendance, isAdmin }: { attendance: PresenceItem[]; isAdmin: boolean }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tooltip, setTooltip] = useState<{ day: number; x: number; y: number } | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemsByDay: Record<number, PresenceItem[]> = {};
  for (const item of attendance) {
    const d = new Date(item.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
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
    if (!itemsByDay[day]) return;
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = calRef.current?.getBoundingClientRect();
    if (!parentRect) return;
    setTooltip({ day, x: rect.left - parentRect.left, y: rect.bottom - parentRect.top + 6 });
  }

  function getDayColorClass(day: number): string {
    const items = itemsByDay[day];
    if (!items) return '';
    const colors = items.map(i => normalizeColor(i.my_status));
    const hasPresent = colors.some(c => c === 'present');
    const hasAbsent  = colors.some(c => c === 'absent');
    const hasNone    = colors.some(c => c === null);
    if (hasPresent && !hasAbsent && !hasNone) return 'day-present';
    if (hasAbsent  && !hasPresent && !hasNone) return 'day-absent';
    if (hasNone    && !hasPresent && !hasAbsent) return 'day-norecord';
    return 'day-mixed';
  }

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
              className={['cal-day', getDayColorClass(day), isToday(day) ? 'today' : ''].filter(Boolean).join(' ')}
              onMouseEnter={(e) => handleDayEnter(e, day)}
              onMouseLeave={scheduleClose}
            >
              {day}
            </button>
          )
        )}
      </div>

      {tooltip && itemsByDay[tooltip.day] && (
        <div
          className="cal-tooltip"
          style={{ top: tooltip.y, left: Math.min(tooltip.x, 200) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {itemsByDay[tooltip.day].map(item => {
            const color = normalizeColor(item.my_status);
            const total = item.present_count + item.missing_count;
            return (
              <div key={item.id} className="tooltip-item">
                <div className="tooltip-title">{item.title}</div>
                <div className="tooltip-row">
                  <span className="tooltip-type">{EVENT_TYPE_LABEL[item.type] ?? item.type}</span>
                  <span className={`tooltip-status ${color === 'present' ? 'status-present' : color === 'absent' ? 'status-absent' : 'status-none'}`}>
                    {statusLabel(item.my_status, isAdmin)}
                  </span>
                </div>
                <div className="tooltip-meta">
                  {new Date(item.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  {item.location && ` · ${item.location}`}
                </div>
                {isAdmin && total > 0 && (
                  <div className="tooltip-stats">
                    <span className="tstat-present">✓ {item.present_count}</span>
                    <span className="tstat-tardy">⟳ {item.tardy_count}</span>
                    <span className="tstat-absent">✗ {item.missing_count - item.justified_count}</span>
                    <span className="tstat-justified">~ {item.justified_count}</span>
                    <span className="tstat-total">{item.present_count + item.tardy_count}/{total}</span>
                  </div>
                )}
              </div>
            );
          })}
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
        .day-present { background: rgba(74,222,128,0.18); border-color: rgba(74,222,128,0.45); color: #4ade80; font-weight: 700; cursor: pointer; }
        .day-present:hover { background: rgba(74,222,128,0.3); }
        .day-absent { background: rgba(251,113,133,0.18); border-color: rgba(251,113,133,0.45); color: #fb7185; font-weight: 700; cursor: pointer; }
        .day-absent:hover { background: rgba(251,113,133,0.3); }
        .day-norecord { background: rgba(125,211,252,0.08); border-color: rgba(125,211,252,0.22); cursor: pointer; }
        .day-norecord:hover { background: rgba(125,211,252,0.16); }
        .day-mixed { background: rgba(251,191,36,0.14); border-color: rgba(251,191,36,0.35); color: #fbbf24; font-weight: 700; cursor: pointer; }
        .day-mixed:hover { background: rgba(251,191,36,0.25); }
        .cal-day.today { outline: 2px solid var(--accent); outline-offset: 1px; font-weight: 700; }
        .cal-tooltip { position: absolute; z-index: 50; background: var(--panel); border: 1px solid rgba(125,211,252,0.3); border-radius: 12px; padding: 12px 14px; min-width: 200px; max-width: 260px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 10px; pointer-events: auto; }
        .tooltip-item { display: flex; flex-direction: column; gap: 4px; }
        .tooltip-title { font-size: 13px; font-weight: 600; }
        .tooltip-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .tooltip-type { font-size: 11px; color: var(--muted); }
        .tooltip-status { font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; }
        .status-present { background: rgba(74,222,128,0.18); color: #4ade80; }
        .status-absent { background: rgba(251,113,133,0.18); color: #fb7185; }
        .status-none { background: rgba(156,163,175,0.14); color: #9ca3af; }
        .tooltip-meta { font-size: 11px; color: var(--muted); }
        .tooltip-stats { display: flex; gap: 8px; align-items: center; margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--border); }
        .tstat-present   { font-size: 11px; font-weight: 700; color: #4ade80; }
        .tstat-tardy     { font-size: 11px; font-weight: 700; color: #fbbf24; }
        .tstat-absent    { font-size: 11px; font-weight: 700; color: #fb7185; }
        .tstat-justified { font-size: 11px; font-weight: 700; color: #7dd3fc; }
        .tstat-total     { font-size: 11px; color: var(--muted); margin-left: auto; }
      `}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PresencasPage() {
  const [attendance, setAttendance] = useState<PresenceItem[]>([]);
  const [analytics, setAnalytics] = useState<PresenceAnalyticsItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PresenceItem | null>(null);
  const [memberStatuses, setMemberStatuses] = useState<MemberPresenceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAltEvents, setShowAltEvents] = useState(false);
  const [filterType, setFilterType] = useState<'REHEARSAL' | 'CONCERT' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) { setLoading(false); return; }

    const storedUser = localStorage.getItem('airfa_user');
    let admin = false;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        admin = parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN';
        setIsAdmin(admin);
      } catch { /* ignore */ }
    }

    const fetchAttendance = fetch(`${apiUrl}/api/v1/presences`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setAttendance).catch(() => setAttendance([]));

    const fetchAnalytics = admin
      ? fetch(`${apiUrl}/api/v1/presences/analytics/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(setAnalytics).catch(() => setAnalytics([]))
      : Promise.resolve();

    Promise.all([fetchAttendance, fetchAnalytics]).finally(() => setLoading(false));
  }, []);

  async function openMarkModal(item: PresenceItem) {
    const token = localStorage.getItem('airfa_token');
    if (!token) return;
    const res = await fetch(`${apiUrl}/api/v1/presences/${item.id}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const members: MemberPresenceItem[] = await res.json();
    setMemberStatuses(members);
    setSelectedEvent(item);
    setIsModalOpen(true);
  }

  async function saveMarks() {
    const token = localStorage.getItem('airfa_token');
    if (!token || !selectedEvent) return;
    setSaving(true);
    await fetch(`${apiUrl}/api/v1/presences/${selectedEvent.id}/bulk-mark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: memberStatuses
          .filter(i => i.status)
          .map(i => ({ user_id: i.user_id, status: i.status })),
      }),
    });
    setSaving(false);
    setIsModalOpen(false);
    const t2 = localStorage.getItem('airfa_token');
    if (t2) {
      fetch(`${apiUrl}/api/v1/presences`, { headers: { Authorization: `Bearer ${t2}` } })
        .then(r => r.json()).then(setAttendance).catch(() => {});
      fetch(`${apiUrl}/api/v1/presences/analytics/members`, { headers: { Authorization: `Bearer ${t2}` } })
        .then(r => r.json()).then(setAnalytics).catch(() => {});
    }
  }

  // ─── Derived stats ────────────────────────────────────────────────────────
  const rehearsals = attendance.filter(i => i.type === 'REHEARSAL' || i.type === 'SPECIAL_REHEARSAL');
  const concerts   = attendance.filter(i => i.type === 'CONCERT');

  const todayStr = new Date().toDateString();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEvents = attendance
    .filter(i => new Date(i.start_time).toDateString() === todayStr)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const futureEvents = attendance
    .filter(i => new Date(i.start_time) > new Date(new Date().setHours(23, 59, 59, 999)))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastEvents = attendance
    .filter(i => new Date(i.start_time) < todayStart)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Admin: default=hoje+futuros, alt=passados | User: default=hoje+passados, alt=futuros
  const defaultEvents = isAdmin ? [...todayEvents, ...futureEvents] : [...todayEvents, ...pastEvents];
  const altEvents     = isAdmin ? pastEvents : futureEvents;
  const altCount      = altEvents.length;
  const altLabel      = isAdmin ? 'Eventos passados' : 'Próximos eventos';
  const panelLabel    = showAltEvents
    ? (isAdmin ? 'Eventos passados' : 'Próximos eventos')
    : (isAdmin ? 'Marcar presenças' : 'As minhas presenças');

  const displayedEvents = (showAltEvents ? altEvents : defaultEvents)
    .filter(i => !filterType || i.type === filterType || (filterType === 'REHEARSAL' && i.type === 'SPECIAL_REHEARSAL'));

  const totalPresent     = countPresent(attendance);
  const totalAbsent      = countAbsent(attendance);
  const totalTardy       = attendance.filter(i => i.my_status === 'TARDY').length;
  const totalJustified   = attendance.filter(i => i.my_status === 'JUSTIFIED').length;
  const rehearsalPresent   = countPresentOnly(rehearsals);
  const rehearsalTardy     = countTardy(rehearsals);
  const rehearsalJustified = countJustified(rehearsals);
  const rehearsalAbsent    = countAbsentOnly(rehearsals);
  const concertPresent     = countPresentOnly(concerts);
  const concertTardy       = countTardy(concerts);
  const concertJustified   = countJustified(concerts);
  const concertAbsent      = countAbsentOnly(concerts);

  return (
    <AuthenticatedShell title="Presenças">
      {loading ? (
        <div className="loading">A carregar…</div>
      ) : (
        <>
          {/* ── CALENDAR LABEL (above grid, right-aligned) ───────────── */}
          <div className="cal-label-row">
            <div className="section-label">Calendário de presenças</div>
          </div>

          {/* ── MAIN GRID ────────────────────────────────────────────── */}
          <div className="page-grid">
            {/* LEFT COLUMN */}
            <div className="left-col">
              {/* Events panel - visible to all users */}
              {attendance.length > 0 && (
                <div className="admin-events-panel">
                  <div className="section-label-row">
                    <div className="section-label">{panelLabel}</div>
                    <div className="filter-pills">
                      <button type="button" className={`filter-pill${filterType === null ? ' filter-active' : ''}`} onClick={() => setFilterType(null)}>Todos</button>
                      <button type="button" className={`filter-pill${filterType === 'REHEARSAL' ? ' filter-active' : ''}`} onClick={() => setFilterType(f => f === 'REHEARSAL' ? null : 'REHEARSAL')}>Ensaios</button>
                      <button type="button" className={`filter-pill${filterType === 'CONCERT' ? ' filter-active' : ''}`} onClick={() => setFilterType(f => f === 'CONCERT' ? null : 'CONCERT')}>Concertos</button>
                    </div>
                    {altCount > 0 && (
                      <button type="button" className="toggle-past-btn" onClick={() => setShowAltEvents(v => !v)}>
                        {showAltEvents ? '← Voltar' : `${altLabel} (${altCount})`}
                      </button>
                    )}
                  </div>
                  {displayedEvents.length === 0 && (
                    <div className="no-today-events">Sem eventos</div>
                  )}
                  {displayedEvents.map(item => (
                    <div key={item.id} className="event-row">
                      <div>
                        <div className="event-row-title">{item.title}</div>
                        <div className="event-row-meta">
                          {EVENT_TYPE_LABEL[item.type] ?? item.type}
                          {' · '}
                          {new Date(item.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="event-row-right">
                        {item.my_status && (() => {
                          const displayStatus = !isAdmin && item.my_status === 'TARDY' ? 'PRESENT'
                            : !isAdmin && item.my_status === 'JUSTIFIED' ? 'ABSENT'
                            : item.my_status;
                          const label = displayStatus === 'PRESENT' ? '✓ Presente'
                            : displayStatus === 'TARDY' ? '⟳ Atrasado'
                            : displayStatus === 'JUSTIFIED' ? '~ Justificado'
                            : '✗ Falta';
                          return (
                            <span className={`my-status-badge my-status-${displayStatus.toLowerCase()}`}>
                              {label}
                            </span>
                          );
                        })()}
                        {isAdmin && (
                          <button type="button" className="mark-btn" onClick={() => openMarkModal(item)}>
                            Marcar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="charts-stats-col">
              <div className="charts-panel">
                <div className="section-label">Estatísticas</div>
                <div className="charts-row">
                  <DonutChart
                    present={isAdmin ? rehearsalPresent : rehearsalPresent + rehearsalTardy}
                    tardy={isAdmin ? rehearsalTardy : 0}
                    justified={isAdmin ? rehearsalJustified : 0}
                    absent={isAdmin ? rehearsalAbsent : rehearsalAbsent + rehearsalJustified}
                    label="Ensaios" />
                  <DonutChart
                    present={isAdmin ? concertPresent : concertPresent + concertTardy}
                    tardy={isAdmin ? concertTardy : 0}
                    justified={isAdmin ? concertJustified : 0}
                    absent={isAdmin ? concertAbsent : concertAbsent + concertJustified}
                    label="Concertos" />
                </div>
              </div>

              <div className="stats-box">
                <div className="stat-row">
                  <span className="stat-icon present-icon">✓</span>
                  <div>
                    <div className="stat-value">{totalPresent}</div>
                    <div className="stat-label">Presenças totais</div>
                    {isAdmin && totalTardy > 0 && (
                      <div className="stat-sub tardy-sub">⟳ {totalTardy} atrasado{totalTardy !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                </div>
                <div className="stat-divider" />
                <div className="stat-row">
                  <span className="stat-icon absent-icon">✗</span>
                  <div>
                    <div className="stat-value">{totalAbsent}</div>
                    <div className="stat-label">Faltas totais</div>
                    {isAdmin && totalJustified > 0 && (
                      <div className="stat-sub justified-sub">~ {totalJustified} justificada{totalJustified !== 1 ? 's' : ''}</div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="right-col">
              <PresenceCalendar attendance={attendance} isAdmin={isAdmin} />
              <div className="legend">
                <span className="legend-item"><span className="legend-dot present-dot" /> Presente</span>
                <span className="legend-item"><span className="legend-dot absent-dot" /> Falta</span>
                <span className="legend-item"><span className="legend-dot norecord-dot" /> Sem registo</span>
                <span className="legend-item"><span className="legend-dot mixed-dot" /> Misto</span>
              </div>
            </div>
          </div>

          {/* ── ADMIN ANALYTICS ──────────────────────────────────────── */}
          {isAdmin && analytics.length > 0 && (
            <section className="analytics-section">
              <div className="analytics-grid">
                {analytics.map(member => {
                  const mp = member.present + member.tardy;
                  const ma = member.absent + member.justified;
                  const mt = member.total_events;
                  const pct = mt > 0 ? Math.round((mp / mt) * 100) : 0;
                  return (
                    <article key={member.user_id} className="analytics-card">
                      <strong className="analytics-name">{member.name}</strong>
                      <span className="analytics-naipe">
                        {MUSICAL_ROLE_LABEL[member.naipe ?? ''] ?? member.naipe ?? 'Sem naipe'}
                      </span>
                      <div className="analytics-bar-track">
                        <div className="analytics-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="analytics-stats">
                        <span className="text-green">✓ {mp}</span>
                        <span className="text-red">✗ {ma}</span>
                        <span className="text-muted">{pct}%</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── MARKING MODAL ─────────────────────────────────────────────── */}
      {isModalOpen && selectedEvent && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedEvent.title}</h2>
              <span className="modal-subtitle">
                {EVENT_TYPE_LABEL[selectedEvent.type] ?? selectedEvent.type}
                {' · '}
                {new Date(selectedEvent.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="member-list">
              {memberStatuses.map(member => (
                <div key={member.user_id} className="member-row">
                  <div>
                    <div className="member-name">{member.name}</div>
                    <div className="member-naipe">
                      {MUSICAL_ROLE_LABEL[member.naipe ?? ''] ?? member.naipe ?? 'Sem naipe'}
                    </div>
                  </div>
                  <div className="status-pills">
                    {(['PRESENT', 'TARDY', 'ABSENT', 'JUSTIFIED'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`status-pill pill-${s.toLowerCase()}${member.status === s ? ' pill-active' : ''}`}
                        onClick={() =>
                          setMemberStatuses(cur =>
                            cur.map(i =>
                              i.user_id === member.user_id ? { ...i, status: s } : i
                            )
                          )
                        }
                      >
                        {s === 'PRESENT' ? 'Presente' : s === 'TARDY' ? 'Atrasado' : s === 'ABSENT' ? 'Falta' : 'Justificado'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={saveMarks} disabled={saving}>
                {saving ? 'A guardar…' : 'Guardar marcações'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading { color: var(--muted); padding: 40px 0; text-align: center; }

        /* Layout */
        .cal-label-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
        .page-grid { display: grid; grid-template-columns: 1fr 420px; gap: 24px; align-items: start; }
        .left-col { display: flex; flex-direction: row; gap: 16px; align-items: stretch; }
        .charts-stats-col { display: flex; flex-direction: column; gap: 16px; flex-shrink: 0; }
        .right-col { display: flex; flex-direction: column; gap: 20px; align-items: stretch; }
        .top-row { display: flex; gap: 16px; align-items: stretch; }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }

        /* Stats box */
        .stats-box { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 24px 40px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
        .stat-row { display: flex; align-items: center; gap: 14px; }
        .stat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; flex-shrink: 0; }
        .present-icon { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
        .absent-icon  { background: rgba(251,113,133,0.15); color: #fb7185; border: 1px solid rgba(251,113,133,0.3); }
        .stat-value { font-size: 24px; font-weight: 700; line-height: 1; }
        .stat-label { font-size: 14px; color: var(--muted); margin-top: 4px; }
        .stat-sub { font-size: 12px; font-weight: 600; margin-top: 3px; }
        .tardy-sub     { color: #fbbf24; }
        .justified-sub { color: #7dd3fc; }
        .stat-divider { height: 1px; background: var(--border); }

        /* Charts */
        .charts-stats-col { display: flex; flex-direction: row; gap: 16px; align-self: flex-start; align-items: stretch; }
        .charts-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: center; }
        .charts-row { display: flex; justify-content: space-around; gap: 12px; margin-top: 14px; }

        /* Admin events */
        .admin-events-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; overflow-y: auto; max-height: 420px; }
        .admin-events-panel .section-label-row { position: sticky; top: -16px; background: var(--panel); z-index: 2; padding: 16px 0 8px; margin: -16px 0 4px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
        .admin-events-panel .section-label { position: static; margin: 0; padding: 0; border: none; background: none; line-height: 1; white-space: nowrap; }
        .admin-events-panel::-webkit-scrollbar { width: 5px; }
        .admin-events-panel::-webkit-scrollbar-track { background: transparent; }
        .admin-events-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        .admin-events-panel::-webkit-scrollbar-thumb:hover { background: var(--muted); }
        .event-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .event-row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .my-status-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
        .my-status-present   { background: rgba(74,222,128,0.15);  color: #4ade80; border: 1px solid rgba(74,222,128,0.35); }
        .my-status-tardy     { background: rgba(251,191,36,0.15);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.35); }
        .my-status-absent    { background: rgba(251,113,133,0.15); color: #fb7185; border: 1px solid rgba(251,113,133,0.35); }
        .my-status-justified { background: rgba(125,211,252,0.15); color: #7dd3fc; border: 1px solid rgba(125,211,252,0.35); }
        .event-row:last-child { border-bottom: none; }
        .event-row-title { font-size: 13px; font-weight: 600; }
        .event-row-meta  { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .mark-btn { border: 1px solid rgba(125,211,252,0.3); border-radius: 8px; padding: 5px 12px; background: rgba(125,211,252,0.1); color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
        .mark-btn:hover { background: rgba(125,211,252,0.22); }
        .toggle-past-btn { padding: 5px 13px; border: 1px solid rgba(125,211,252,0.3); border-radius: 8px; background: rgba(125,211,252,0.08); color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.15s, border-color 0.15s; display: inline-flex; align-items: center; line-height: 1; }
        .toggle-past-btn:hover { background: rgba(125,211,252,0.18); border-color: rgba(125,211,252,0.5); }
        .filter-pills { display: flex; gap: 6px; flex: 1; }
        .filter-pill { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .filter-pill:hover { color: var(--text); border-color: var(--muted); }
        .filter-pill.filter-active { background: rgba(125,211,252,0.12); color: var(--accent); border-color: rgba(125,211,252,0.4); }
        .no-today-events { font-size: 13px; color: var(--muted); padding: 8px 0; text-align: center; }

        /* Legend */
        .legend { display: flex; gap: 16px; flex-wrap: wrap; padding-top: 4px; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
        .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .present-dot  { background: rgba(74,222,128,0.7); }
        .absent-dot   { background: rgba(251,113,133,0.7); }
        .norecord-dot { background: rgba(125,211,252,0.45); }
        .mixed-dot    { background: rgba(251,191,36,0.7); }

        /* Analytics */
        .analytics-section { margin-top: 24px; display: flex; flex-direction: column; gap: 14px; }
        .analytics-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
        .analytics-card { display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--panel-soft); }
        .analytics-name  { font-size: 13px; font-weight: 700; }
        .analytics-naipe { font-size: 11px; color: var(--muted); }
        .analytics-bar-track { height: 5px; border-radius: 999px; background: rgba(251,113,133,0.25); overflow: hidden; margin: 2px 0; }
        .analytics-bar-fill  { height: 100%; border-radius: 999px; background: rgba(74,222,128,0.7); transition: width 0.4s ease; }
        .analytics-stats { display: flex; gap: 8px; font-size: 11px; font-weight: 600; flex-wrap: wrap; }
        .text-green { color: #4ade80; }
        .text-red   { color: #fb7185; }
        .text-muted { color: var(--muted); }

        /* Modal */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(3,6,12,0.72); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 24px; z-index: 200; }
        .modal { width: min(100%, 680px); display: flex; flex-direction: column; gap: 16px; padding: 24px; border-radius: 20px; border: 1px solid var(--border); background: var(--panel); box-shadow: 0 32px 80px rgba(0,0,0,0.55); max-height: 90vh; overflow: hidden; }
        .modal-header { display: flex; flex-direction: column; gap: 4px; }
        .modal-title  { margin: 0; font-size: 17px; font-weight: 700; }
        .modal-subtitle { font-size: 12px; color: var(--muted); }
        .member-list { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 60vh; }
        .member-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }
        .member-name  { font-size: 13px; font-weight: 600; }
        .member-naipe { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .status-pills { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .status-pill { padding: 5px 11px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--muted); transition: all 0.15s; }
        .status-pill:hover { opacity: 0.8; }
        .pill-present.pill-active  { background: rgba(74,222,128,0.18);  color: #4ade80; border-color: rgba(74,222,128,0.5); }
        .pill-tardy.pill-active    { background: rgba(251,191,36,0.18);  color: #fbbf24; border-color: rgba(251,191,36,0.5); }
        .pill-absent.pill-active   { background: rgba(251,113,133,0.18); color: #fb7185; border-color: rgba(251,113,133,0.5); }
        .pill-justified.pill-active { background: rgba(125,211,252,0.18); color: #7dd3fc; border-color: rgba(125,211,252,0.5); }
        select { background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 13px; flex-shrink: 0; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-primary { border: 1px solid rgba(125,211,252,0.3); border-radius: 10px; padding: 8px 20px; background: rgba(125,211,252,0.15); color: var(--accent); font-weight: 600; cursor: pointer; font-size: 13px; transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: rgba(125,211,252,0.26); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { border: 1px solid var(--border); border-radius: 10px; padding: 8px 20px; background: transparent; color: var(--muted); font-weight: 600; cursor: pointer; font-size: 13px; transition: background 0.15s; }
        .btn-secondary:hover { background: var(--btn-subtle); }

        @media (max-width: 900px) { .page-grid { grid-template-columns: 1fr; } .right-col { align-items: flex-start; } .top-row { flex-direction: column; } .cal-label-row { justify-content: flex-start; } }
      `}</style>
    </AuthenticatedShell>
  );
}
