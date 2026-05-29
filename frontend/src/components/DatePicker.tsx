'use client';
import { useState, useRef, useEffect } from 'react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type View = 'day' | 'month' | 'year';

function parseDate(val: string) {
  if (!val || val.length < 10) return null;
  const [y, m, d] = val.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function firstWeekday(y: number, m: number) {
  const day = new Date(y, m - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function yearPageAnchor(y: number) {
  return Math.floor(y / 12) * 12;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
}) {
  const today = new Date();
  const parsed = parseDate(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('day');
  const [viewY, setViewY] = useState(parsed?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(parsed?.m ?? today.getMonth() + 1);
  const [yearAnchor, setYearAnchor] = useState(yearPageAnchor(parsed?.y ?? today.getFullYear()));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) { setViewY(parsed.y); setViewM(parsed.m); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView('day');
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setView('day'); }
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  function prevMonth() {
    if (viewM === 1) { setViewY(y => y - 1); setViewM(12); }
    else setViewM(m => m - 1);
  }
  function nextMonth() {
    if (viewM === 12) { setViewY(y => y + 1); setViewM(1); }
    else setViewM(m => m + 1);
  }

  const minParsed = parseDate(min ?? '');
  function isDisabled(y: number, m: number, d: number) {
    if (!minParsed) return false;
    return new Date(y, m - 1, d) < new Date(minParsed.y, minParsed.m - 1, minParsed.d);
  }

  const firstDay = firstWeekday(viewY, viewM);
  const daysCount = daysInMonth(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];

  const display = parsed
    ? `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
    : '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="dp-trigger"
        onClick={() => { setOpen(o => !o); setView('day'); }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={display ? 'dp-value' : 'dp-placeholder'}>{display || placeholder}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dp-icon" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="dp-dropdown" role="dialog" aria-label="Calendário">

          {view === 'day' && (<>
            <div className="dp-header">
              <button type="button" className="dp-nav" onClick={prevMonth} aria-label="Mês anterior">‹</button>
              <button type="button" className="dp-month-label dp-month-btn" onClick={() => { setYearAnchor(yearPageAnchor(viewY)); setView('month'); }}>
                {MONTHS[viewM - 1]} {viewY}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.6 }}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <button type="button" className="dp-nav" onClick={nextMonth} aria-label="Próximo mês">›</button>
            </div>
            <div className="dp-grid">
              {WEEKDAYS.map(d => <div key={d} className="dp-weekday">{d}</div>)}
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />;
                const sel = parsed?.y === viewY && parsed?.m === viewM && parsed?.d === day;
                const isToday = today.getFullYear() === viewY && today.getMonth() + 1 === viewM && today.getDate() === day;
                const dis = isDisabled(viewY, viewM, day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={dis}
                    className={['dp-day', sel ? 'dp-day--sel' : '', isToday && !sel ? 'dp-day--today' : '', dis ? 'dp-day--dis' : ''].join(' ').trim()}
                    onClick={() => {
                      onChange(`${viewY}-${String(viewM).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                      setOpen(false);
                      setView('day');
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>)}

          {view === 'month' && (<>
            <div className="dp-header">
              <button type="button" className="dp-nav" onClick={() => setViewY(y => y - 1)} aria-label="Ano anterior">‹</button>
              <button type="button" className="dp-month-label dp-month-btn" onClick={() => setView('year')}>
                {viewY}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 4, opacity: 0.6 }}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <button type="button" className="dp-nav" onClick={() => setViewY(y => y + 1)} aria-label="Próximo ano">›</button>
            </div>
            <div className="dp-month-grid">
              {MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className={['dp-month-cell', parsed?.y === viewY && parsed?.m === i + 1 ? 'dp-day--sel' : '', today.getFullYear() === viewY && today.getMonth() === i ? 'dp-day--today' : ''].join(' ').trim()}
                  onClick={() => { setViewM(i + 1); setView('day'); }}
                >
                  {m}
                </button>
              ))}
            </div>
          </>)}

          {view === 'year' && (<>
            <div className="dp-header">
              <button type="button" className="dp-nav" onClick={() => setYearAnchor(a => a - 12)} aria-label="Anos anteriores">‹</button>
              <span className="dp-month-label">{yearAnchor}–{yearAnchor + 11}</span>
              <button type="button" className="dp-nav" onClick={() => setYearAnchor(a => a + 12)} aria-label="Próximos anos">›</button>
            </div>
            <div className="dp-month-grid">
              {Array.from({ length: 12 }, (_, i) => yearAnchor + i).map(y => (
                <button
                  key={y}
                  type="button"
                  className={['dp-month-cell', parsed?.y === y ? 'dp-day--sel' : '', today.getFullYear() === y ? 'dp-day--today' : ''].join(' ').trim()}
                  onClick={() => { setViewY(y); setYearAnchor(yearPageAnchor(y)); setView('month'); }}
                >
                  {y}
                </button>
              ))}
            </div>
          </>)}

          {value && (
            <div className="dp-footer">
              <button type="button" className="dp-clear" onClick={() => { onChange(''); setOpen(false); setView('day'); }}>
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}