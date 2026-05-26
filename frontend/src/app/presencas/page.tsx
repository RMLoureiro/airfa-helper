"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

const EVENT_TYPE_LABEL: Record<string, string> = { REHEARSAL: 'Ensaio', SPECIAL_REHEARSAL: 'Ensaio Especial', CONCERT: 'Concerto', OTHER: 'Outro' };

const MUSICAL_ROLE_LABEL: Record<string, string> = {
  MAESTRO: 'Maestro', FLUTE_PLAYER: 'Flauta', CLARINET_PLAYER: 'Clarinete',
  SAXOPHONE_PLAYER: 'Saxofone', TROMBONE_PLAYER: 'Trombone', EUPHONIUM_PLAYER: 'Eufônio',
  TUBA_PLAYER: 'Tuba', FRENCH_HORN_PLAYER: 'Trompa', TRUMPET_PLAYER: 'Trompete',
  PERCUSSION_PLAYER: 'Percussão',
};

function normalizeColor(status: string | null | undefined): 'present' | 'absent' | null {
  if (!status) return null;
  if (status === 'PRESENT' || status === 'TARDY') return 'present';
  if (status === 'ABSENT' || status === 'JUSTIFIED') return 'absent';
  return null;
}

function statusLabel(status: string | null | undefined, isAdmin: boolean): string {
  if (!status) return 'Sem registo';
  if (isAdmin) {
    const map: Record<string, string> = { PRESENT: 'Presente', TARDY: 'Atrasado', ABSENT: 'Falta', JUSTIFIED: 'Justificado' };
    return map[status] ?? status;
  }
  if (status === 'PRESENT' || status === 'TARDY') return 'Presente';
  if (status === 'ABSENT' || status === 'JUSTIFIED') return 'Falta';
  return 'Sem registo';
}

// ─── DonutChart ───────────────────────────────────────────────────────────────
type SegKey = 'present' | 'tardy' | 'justified' | 'absent';
function DonutChart({ present, tardy, justified, absent, label }: {
  present: number; tardy: number; justified: number; absent: number; label: string;
}) {
  const [hovered, setHovered] = useState<SegKey | null>(null);
  const total = present + tardy + justified + absent;
  const r = 38; const sw = 11; const circ = 2 * Math.PI * r;

  function arcLen(n: number) { return total > 0 ? (n / total) * circ : 0; }

  const segDefs: { key: SegKey; n: number; color: string; dim: string; tip: string }[] = [
    { key: 'present',   n: present,   color: 'var(--success)',   dim: 'rgba(78,152,104,0.5)',  tip: `✓ ${present} presente${present !== 1 ? 's' : ''}` },
    { key: 'tardy',     n: tardy,     color: 'var(--accent)',    dim: 'rgba(91,143,184,0.5)',  tip: `⟳ ${tardy} atrasado${tardy !== 1 ? 's' : ''}` },
    { key: 'justified', n: justified, color: 'var(--rehearsal-color)', dim: 'rgba(74,126,196,0.5)', tip: `~ ${justified} justificado${justified !== 1 ? 's' : ''}` },
    { key: 'absent',    n: absent,    color: 'var(--danger)',    dim: 'rgba(194,78,66,0.5)',   tip: `✗ ${absent} falta${absent !== 1 ? 's' : ''}` },
  ];

  let offset = 0;
  const arcs = segDefs.map(seg => {
    const len = arcLen(seg.n);
    const start = offset;
    if (seg.n > 0) offset += len;
    return { ...seg, len, start };
  });

  const pct = total > 0 ? Math.round(((present + tardy) / total) * 100) : 0;
  const hoveredSeg = segDefs.find(s => s.key === hovered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{ overflow: 'visible' }}>
        {total === 0 && (
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        )}
        {arcs.map(arc => arc.n > 0 && (
          <circle
            key={arc.key}
            cx="55" cy="55" r={r} fill="none"
            stroke={hovered === arc.key ? arc.color : arc.dim}
            strokeWidth={sw}
            strokeDasharray={`${Math.max(0, arc.len - 1)} ${circ}`}
            strokeDashoffset={-arc.start}
            transform="rotate(-90 55 55)"
            style={{ cursor: 'pointer', transition: 'stroke 0.15s' }}
            onMouseEnter={() => setHovered(arc.key)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text x="55" y="48" textAnchor="middle" dominantBaseline="middle"
          fill="var(--text)" fontSize="17" fontWeight="700"
          style={{ fontFamily: 'var(--font-display, serif)', pointerEvents: 'none' }}>
          {pct}%
        </text>
        <text x="55" y="67" textAnchor="middle" dominantBaseline="middle"
          fill="var(--muted)" fontSize="10"
          style={{ fontFamily: 'var(--font-mono, monospace)', pointerEvents: 'none' }}>
          {total > 0 ? `${present + tardy}/${total}` : '—'}
        </text>
      </svg>
      {hovered && hoveredSeg && (
        <div style={{
          position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface-3)', border: '1px solid var(--border-strong)',
          borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)',
          pointerEvents: 'none', zIndex: 20, color: hoveredSeg.color,
        }}>
          {hoveredSeg.tip}
        </div>
      )}
      <span style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        letterSpacing: '0.07em', textTransform: 'uppercase',
        fontFamily: 'var(--font-mono, monospace)',
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

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setTooltip(null); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setTooltip(null); }
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
    const hasAbsent = colors.some(c => c === 'absent');
    const hasNone = colors.some(c => c === null);
    if (hasPresent && !hasAbsent && !hasNone) return 'day-present';
    if (hasAbsent && !hasPresent && !hasNone) return 'day-absent';
    if (hasNone && !hasPresent && !hasAbsent) return 'day-norecord';
    return 'day-mixed';
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
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{EVENT_TYPE_LABEL[item.type] ?? item.type}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: color === 'present' ? 'var(--success-dim)' : color === 'absent' ? 'var(--danger-dim)' : 'var(--surface-3)',
                    color: color === 'present' ? 'var(--success)' : color === 'absent' ? 'var(--danger)' : 'var(--muted)',
                  }}>
                    {statusLabel(item.my_status, isAdmin)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(item.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  {item.location && ` · ${item.location}`}
                </div>
                {isAdmin && total > 0 && (
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 3, marginTop: 2 }}>
                    <span style={{ color: 'var(--success)' }}>✓ {item.present_count}</span>
                    <span style={{ color: 'var(--accent)' }}>⟳ {item.tardy_count}</span>
                    <span style={{ color: 'var(--danger)' }}>✗ {item.missing_count}</span>
                    <span style={{ color: 'var(--rehearsal-color)', marginLeft: 'auto' }}>~ {item.justified_count}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const [analyticsNaipe, setAnalyticsNaipe] = useState<string | null>(null);
  const [analyticsSort, setAnalyticsSort] = useState<'az' | 'za' | 'presences' | 'absences'>('az');

  useEffect(() => {
    const storedUser = localStorage.getItem('airfa_user');
    let admin = false;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        admin = parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN';
        setIsAdmin(admin);
      } catch { /* ignore */ }
    }

    const fetchAttendance = authFetch(`${apiUrl}/api/v1/presences`)
      .then(r => r.json()).then(setAttendance).catch(() => setAttendance([]));

    const fetchAnalytics = admin
      ? authFetch(`${apiUrl}/api/v1/presences/analytics/members`)
          .then(r => r.json()).then(setAnalytics).catch(() => setAnalytics([]))
      : Promise.resolve();

    Promise.all([fetchAttendance, fetchAnalytics]).finally(() => setLoading(false));
  }, []);

  async function openMarkModal(item: PresenceItem) {
    const res = await authFetch(`${apiUrl}/api/v1/presences/${item.id}/members`);
    const members: MemberPresenceItem[] = await res.json();
    setMemberStatuses(members);
    setSelectedEvent(item);
    setIsModalOpen(true);
  }

  async function saveMarks() {
    if (!selectedEvent) return;
    setSaving(true);
    await authFetch(`${apiUrl}/api/v1/presences/${selectedEvent.id}/bulk-mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: memberStatuses.filter(i => i.status).map(i => ({ user_id: i.user_id, status: i.status })),
      }),
    });
    setSaving(false);
    setIsModalOpen(false);
    authFetch(`${apiUrl}/api/v1/presences`).then(r => r.json()).then(setAttendance).catch(() => {});
    if (isAdmin) authFetch(`${apiUrl}/api/v1/presences/analytics/members`).then(r => r.json()).then(setAnalytics).catch(() => {});
  }

  // Derived
  const rehearsals = attendance.filter(i => i.type === 'REHEARSAL' || i.type === 'SPECIAL_REHEARSAL');
  const concerts = attendance.filter(i => i.type === 'CONCERT');
  const todayStr = new Date().toDateString();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEvents = attendance.filter(i => new Date(i.start_time).toDateString() === todayStr).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const futureEvents = attendance.filter(i => new Date(i.start_time) > new Date(new Date().setHours(23, 59, 59, 999))).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastEvents = attendance.filter(i => new Date(i.start_time) < todayStart).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const defaultEvents = isAdmin ? [...todayEvents, ...futureEvents] : [...todayEvents, ...pastEvents];
  const altEvents = isAdmin ? pastEvents : futureEvents;
  const altCount = altEvents.length;
  const altLabel = isAdmin ? 'Eventos passados' : 'Próximos eventos';
  const panelLabel = showAltEvents ? (isAdmin ? 'Eventos passados' : 'Próximos eventos') : (isAdmin ? 'Marcar presenças' : 'As minhas presenças');

  const displayedEvents = (showAltEvents ? altEvents : defaultEvents)
    .filter(i => !filterType || i.type === filterType || (filterType === 'REHEARSAL' && i.type === 'SPECIAL_REHEARSAL'));

  const totalPresent = attendance.filter(i => normalizeColor(i.my_status) === 'present').length;
  const totalAbsent = attendance.filter(i => normalizeColor(i.my_status) === 'absent').length;
  const totalTardy = attendance.filter(i => i.my_status === 'TARDY').length;
  const totalJustified = attendance.filter(i => i.my_status === 'JUSTIFIED').length;

  const rP = rehearsals.filter(i => i.my_status === 'PRESENT').length;
  const rT = rehearsals.filter(i => i.my_status === 'TARDY').length;
  const rJ = rehearsals.filter(i => i.my_status === 'JUSTIFIED').length;
  const rA = rehearsals.filter(i => i.my_status === 'ABSENT').length;
  const cP = concerts.filter(i => i.my_status === 'PRESENT').length;
  const cT = concerts.filter(i => i.my_status === 'TARDY').length;
  const cJ = concerts.filter(i => i.my_status === 'JUSTIFIED').length;
  const cA = concerts.filter(i => i.my_status === 'ABSENT').length;

  const availableNaipes = Array.from(new Set(analytics.map(m => m.naipe ?? ''))).filter(Boolean).sort();
  const filteredAnalytics = analytics
    .filter(m => !analyticsNaipe || m.naipe === analyticsNaipe)
    .sort((a, b) => {
      if (analyticsSort === 'az') return a.name.localeCompare(b.name, 'pt');
      if (analyticsSort === 'za') return b.name.localeCompare(a.name, 'pt');
      if (analyticsSort === 'presences') return (b.present + b.tardy) - (a.present + a.tardy);
      return (b.absent + b.justified) - (a.absent + a.justified);
    });

  return (
    <AuthenticatedShell title="Presenças">
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--muted)' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, letterSpacing: '0.08em' }}>A carregar…</span>
        </div>
      ) : (
        <div className="page">
          {/* ── Stats strip ── */}
          <div className="stats-strip">
            <div className="stats-numbers">
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--success)' }}>{totalPresent}</span>
                <span className="stat-label">Presenças</span>
                {isAdmin && totalTardy > 0 && <span className="stat-sub">⟳ {totalTardy} atrasados</span>}
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--danger)' }}>{totalAbsent}</span>
                <span className="stat-label">Faltas</span>
                {isAdmin && totalJustified > 0 && <span className="stat-sub">~ {totalJustified} justificadas</span>}
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--accent)' }}>{attendance.length}</span>
                <span className="stat-label">Total de eventos</span>
              </div>
            </div>
            <div className="stat-card chart-card">
              <DonutChart present={isAdmin ? rP : rP + rT} tardy={isAdmin ? rT : 0} justified={isAdmin ? rJ : 0} absent={isAdmin ? rA : rA + rJ} label="Ensaios" />
              <DonutChart present={isAdmin ? cP : cP + cT} tardy={isAdmin ? cT : 0} justified={isAdmin ? cJ : 0} absent={isAdmin ? cA : cA + cJ} label="Concertos" />
            </div>
          </div>

          {/* ── Main grid ── */}
          <div className="col-header">
            <span className="col-title">{panelLabel}</span>
            <div className="col-controls">
              <div className="filter-pills">
                <button type="button" className={`fpill${filterType === null ? ' active' : ''}`} onClick={() => setFilterType(null)}>Todos</button>
                <button type="button" className={`fpill${filterType === 'REHEARSAL' ? ' active' : ''}`} onClick={() => setFilterType(f => f === 'REHEARSAL' ? null : 'REHEARSAL')}>Ensaios</button>
                <button type="button" className={`fpill${filterType === 'CONCERT' ? ' active' : ''}`} onClick={() => setFilterType(f => f === 'CONCERT' ? null : 'CONCERT')}>Concertos</button>
              </div>
              {altCount > 0 && (
                <button type="button" className="toggle-btn" onClick={() => setShowAltEvents(v => !v)}>
                  {showAltEvents ? '← Voltar' : `${altLabel} (${altCount})`}
                </button>
              )}
            </div>
          </div>
          <div className="main-grid">
            {/* Left: events list */}
            <div className="events-col">
              {displayedEvents.length === 0 ? (
                <div className="empty">Sem eventos.</div>
              ) : (
                <div className="event-list">
                  {displayedEvents.map(item => {
                    const displayStatus = !isAdmin && item.my_status === 'TARDY' ? 'PRESENT'
                      : !isAdmin && item.my_status === 'JUSTIFIED' ? 'ABSENT'
                      : item.my_status;
                    return (
                      <div key={item.id} className="event-row">
                        <div className="event-row-left">
                          <span className="event-row-title">{item.title}</span>
                          <span className="event-row-meta">
                            {EVENT_TYPE_LABEL[item.type] ?? item.type} · {new Date(item.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="event-row-right">
                          {displayStatus && (
                            <span className={`status-badge status-${displayStatus.toLowerCase()}`}>
                              {displayStatus === 'PRESENT' ? '✓ Presente'
                                : displayStatus === 'TARDY' ? '⟳ Atrasado'
                                : displayStatus === 'JUSTIFIED' ? '~ Justificado'
                                : '✗ Falta'}
                            </span>
                          )}
                          {isAdmin && (
                            <button type="button" className="mark-btn" onClick={() => openMarkModal(item)}>
                              Marcar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: calendar */}
            <div className="cal-col">
              <PresenceCalendar attendance={attendance} isAdmin={isAdmin} />
              <div className="legend">
                <span className="leg"><span className="ldot" style={{ background: 'var(--success)' }} /> Presente</span>
                <span className="leg"><span className="ldot" style={{ background: 'var(--danger)' }} /> Falta</span>
                <span className="leg"><span className="ldot" style={{ background: 'var(--accent)' }} /> Sem registo</span>
                <span className="leg"><span className="ldot" style={{ background: 'var(--muted)' }} /> Misto</span>
              </div>
            </div>
          </div>

          {/* ── Analytics (admin) ── */}
          {isAdmin && analytics.length > 0 && (
            <section className="analytics">
              <div className="analytics-header">
                <span className="col-title">Análise de membros</span>
                <div className="analytics-controls">
                  <div className="filter-pills">
                    <button type="button" className={`fpill${analyticsNaipe === null ? ' active' : ''}`} onClick={() => setAnalyticsNaipe(null)}>Todos</button>
                    {availableNaipes.map(n => (
                      <button key={n} type="button" className={`fpill${analyticsNaipe === n ? ' active' : ''}`} onClick={() => setAnalyticsNaipe(v => v === n ? null : n)}>
                        {MUSICAL_ROLE_LABEL[n] ?? n}
                      </button>
                    ))}
                  </div>
                  <div className="sort-group">
                    <button type="button" className={`sort-btn${analyticsSort === 'az' || analyticsSort === 'za' ? ' active' : ''}`} onClick={() => setAnalyticsSort(s => s === 'az' ? 'za' : 'az')}>
                      {analyticsSort === 'za' ? 'Z→A' : 'A→Z'}
                    </button>
                    <button type="button" className={`sort-btn${analyticsSort === 'presences' || analyticsSort === 'absences' ? ' active' : ''}`} onClick={() => setAnalyticsSort(s => s === 'presences' ? 'absences' : 'presences')}>
                      {analyticsSort === 'absences' ? '↑ Faltas' : '↑ Presenças'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="analytics-list">
                {filteredAnalytics.map(member => {
                  const mp = member.present + member.tardy;
                  const ma = member.absent + member.justified;
                  const mt = member.total_events;
                  const pct = mt > 0 ? Math.round((mp / mt) * 100) : 0;
                  return (
                    <div key={member.user_id} className="analytics-row">
                      <div className="analytics-identity">
                        <strong>{member.name}</strong>
                        <span className="analytics-naipe">{MUSICAL_ROLE_LABEL[member.naipe ?? ''] ?? member.naipe ?? '—'}</span>
                      </div>
                      <div className="bar-track">
                        {mt > 0 && (
                          <>
                            <div className="bar-seg" style={{ width: `${(member.present / mt) * 100}%`, background: 'var(--success)' }} />
                            <div className="bar-seg" style={{ width: `${(member.tardy / mt) * 100}%`, background: 'var(--accent)' }} />
                            <div className="bar-seg" style={{ width: `${(member.justified / mt) * 100}%`, background: 'var(--rehearsal-color)' }} />
                            <div className="bar-seg" style={{ width: `${(member.absent / mt) * 100}%`, background: 'var(--danger)' }} />
                          </>
                        )}
                      </div>
                      <div className="analytics-nums">
                        <span style={{ color: 'var(--success)' }}>✓ {mp}</span>
                        <span style={{ color: 'var(--danger)' }}>✗ {ma}</span>
                        {member.tardy > 0 && <span style={{ color: 'var(--accent)', fontSize: 11 }}>⟳ {member.tardy}</span>}
                        {member.justified > 0 && <span style={{ color: 'var(--rehearsal-color)', fontSize: 11 }}>~ {member.justified}</span>}
                        <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Marking modal ── */}
      {isModalOpen && selectedEvent && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 580, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 22, fontWeight: 600, margin: 0 }}>{selectedEvent.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
                  {EVENT_TYPE_LABEL[selectedEvent.type] ?? selectedEvent.type} · {new Date(selectedEvent.start_time).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 5, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
              }}>✕</button>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memberStatuses.map(member => (
                <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{MUSICAL_ROLE_LABEL[member.naipe ?? ''] ?? member.naipe ?? '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {(['PRESENT', 'TARDY', 'ABSENT', 'JUSTIFIED'] as const).map(s => {
                      const labels: Record<string, string> = { PRESENT: 'P', TARDY: 'A', ABSENT: 'F', JUSTIFIED: 'J' };
                      const colors: Record<string, string> = { PRESENT: 'var(--success)', TARDY: 'var(--accent)', ABSENT: 'var(--danger)', JUSTIFIED: 'var(--rehearsal-color)' };
                      const isActive = member.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          title={s === 'PRESENT' ? 'Presente' : s === 'TARDY' ? 'Atrasado' : s === 'ABSENT' ? 'Falta' : 'Justificado'}
                          onClick={() => setMemberStatuses(cur => cur.map(i => i.user_id === member.user_id ? { ...i, status: s } : i))}
                          style={{
                            width: 32, height: 32, borderRadius: 6,
                            border: isActive ? `2px solid ${colors[s]}` : '1px solid var(--border)',
                            background: isActive ? `${colors[s]}22` : 'transparent',
                            color: isActive ? colors[s] : 'var(--muted)',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                        >
                          {labels[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={saveMarks} disabled={saving}>
                {saving ? 'A guardar…' : 'Guardar marcações'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 24px; }

        /* Stats strip */
        .stats-strip {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stats-numbers {
          display: flex;
          flex-direction: row;
          gap: 12px;
          align-items: stretch;
        }

        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .chart-card {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 16px 24px;
        }

        .stat-value {
          font-family: var(--font-display, serif);
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .stat-label {
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
        }

        .stat-sub {
          font-size: 11px;
          color: var(--muted);
          font-family: var(--font-mono, monospace);
        }

        /* Main grid */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          align-items: start;
        }

        /* Events col */
        .events-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .col-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .col-title {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .col-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-pills { display: flex; gap: 4px; flex-wrap: wrap; }

        .fpill {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .fpill:hover { background: var(--surface-2); color: var(--text-2); }
        .fpill.active { background: var(--accent-dim); color: var(--accent-2); border-color: var(--accent); }

        .toggle-btn {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .toggle-btn:hover { background: var(--surface-2); }

        .empty { color: var(--muted); font-style: italic; font-size: 13px; padding: 16px 0; }

        .event-list { display: flex; flex-direction: column; gap: 1px; }

        .event-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 7px;
          transition: border-color 0.12s;
        }
        .event-row:hover { border-color: var(--border-strong); }

        .event-row-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .event-row-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-row-meta {
          font-size: 11px;
          color: var(--muted);
          font-family: var(--font-mono, monospace);
        }

        .event-row-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .status-present   { background: var(--success-dim); color: var(--success); }
        .status-tardy     { background: var(--accent-dim); color: var(--accent-2); }
        .status-absent    { background: var(--danger-dim); color: var(--danger); }
        .status-justified { background: rgba(74,126,196,0.12); color: var(--rehearsal-color); }

        .mark-btn {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--accent);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s;
        }
        .mark-btn:hover { background: var(--accent-dim); border-color: var(--accent); }

        /* Calendar col */
        .cal-col { display: flex; flex-direction: column; gap: 12px; }

        .legend {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding: 8px 2px;
        }

        .leg {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--muted);
          font-family: var(--font-mono, monospace);
        }

        .ldot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Analytics */
        .analytics {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .analytics-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .analytics-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sort-group { display: flex; gap: 4px; }

        .sort-btn {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .sort-btn:hover { background: var(--surface-2); color: var(--text-2); }
        .sort-btn.active { background: var(--accent-dim); color: var(--accent-2); border-color: var(--accent); }

        .analytics-list { display: flex; flex-direction: column; gap: 4px; }

        .analytics-row {
          display: grid;
          grid-template-columns: 200px 1fr 180px;
          align-items: center;
          gap: 16px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--border);
        }
        .analytics-row:last-child { border-bottom: none; }

        .analytics-identity {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .analytics-identity strong { font-size: 14px; color: var(--text); }
        .analytics-naipe { font-size: 11px; color: var(--muted); }

        .bar-track {
          height: 8px;
          background: var(--surface-2);
          border-radius: 4px;
          overflow: hidden;
          display: flex;
        }

        .bar-seg {
          height: 100%;
          transition: width 0.3s;
        }

        .analytics-nums {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          flex-wrap: wrap;
        }

        /* Buttons */
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
        }
        .btn-primary:hover:not(:disabled) { background: var(--accent-2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

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

        @media (max-width: 900px) {
          .stats-numbers { flex-direction: column; }
          .main-grid { grid-template-columns: 1fr; }
          .analytics-row { grid-template-columns: 1fr 1fr; }
          .bar-track { grid-column: span 2; }
        }
      `}</style>
    </AuthenticatedShell>
  );
}
