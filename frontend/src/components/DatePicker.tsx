'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ─── Pauta Azul date / datetime picker ──────────────────────────────────────
   A flat calendar popover with an explicit "Guardar" confirmation. The draft
   selection is only committed (onChange) when the user presses Guardar, so an
   accidental tap never changes the field. Portaled to <body> so it is never
   clipped by a scrollable modal.
   - DatePicker      value: "YYYY-MM-DD"
   - DateTimePicker  value: "YYYY-MM-DDTHH:mm"
*/

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const pad = (n: number) => String(n).padStart(2, '0');

type YMD = { y: number; mo: number; d: number };

function parseDate(v: string | undefined): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '');
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
}
function parseTime(v: string | undefined): { h: number; mi: number } | null {
  const m = /[T ](\d{2}):(\d{2})/.exec(v ?? '');
  return m ? { h: +m[1], mi: +m[2] } : null;
}

/** Month grid, Monday-first. 0 = padding cell. */
function monthCells(y: number, mo: number): number[] {
  const start = (new Date(y, mo, 1).getDay() + 6) % 7;
  const days = new Date(y, mo + 1, 0).getDate();
  const cells: number[] = [];
  for (let i = 0; i < start; i++) cells.push(0);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(0);
  return cells;
}

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Mode = 'date' | 'datetime';

interface FieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function DateField({ value, onChange, placeholder, disabled, mode }: FieldProps & { mode: Mode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, above: false });
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [draft, setDraft] = useState<YMD | null>(null);
  const [time, setTime] = useState({ h: 21, mi: 0 });

  useEffect(() => setMounted(true), []);

  const today = new Date();
  const selected = parseDate(value);
  const selTime = parseTime(value);

  // Display label for the trigger
  let label = '';
  if (selected) {
    label = `${selected.d} ${MESES_CURTO[selected.mo]} ${selected.y}`;
    if (mode === 'datetime' && selTime) label += ` · ${pad(selTime.h)}:${pad(selTime.mi)}`;
  }

  function openPicker() {
    if (disabled) return;
    const pd = parseDate(value);
    setDraft(pd);
    setView(pd ? { y: pd.y, m: pd.mo } : { y: today.getFullYear(), m: today.getMonth() });
    if (mode === 'datetime') {
      const pt = parseTime(value);
      setTime(pt ?? { h: 21, mi: 0 });
    }
    const r = triggerRef.current!.getBoundingClientRect();
    const popH = mode === 'datetime' ? 430 : 372;
    const above = r.bottom + popH > window.innerHeight && r.top > popH;
    setPos({
      top: above ? r.top - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 312)),
      above,
    });
    setOpen(true);
  }

  function commit() {
    if (!draft) { setOpen(false); return; }
    const dateStr = `${draft.y}-${pad(draft.mo + 1)}-${pad(draft.d)}`;
    onChange(mode === 'datetime' ? `${dateStr}T${pad(time.h)}:${pad(time.mi)}` : dateStr);
    setOpen(false);
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'Enter') commit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft, time]);

  function prevMonth() { setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })); }
  function nextMonth() { setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })); }

  const minuteOptions = MINUTES.includes(time.mi) ? MINUTES : [...MINUTES, time.mi].sort((a, b) => a - b);

  return (
    <>
      <button type="button" ref={triggerRef} className="df-trigger" onClick={openPicker} disabled={disabled} aria-haspopup="dialog">
        <span className={label ? 'df-val' : 'df-ph'}>{label || placeholder || 'Selecionar data'}</span>
        <svg className="df-ic" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="12" height="12" rx="1.5" />
          <path d="M5 1v3M11 1v3M2 7h12" />
          {mode === 'datetime' && <path d="M8 9.2v1.6l1.1.7" />}
        </svg>
      </button>

      {mounted && open && createPortal(
        <>
          <div className="df-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="df-pop"
            role="dialog"
            aria-label="Selecionar data"
            style={{ top: pos.top, left: pos.left, transform: pos.above ? 'translateY(-100%)' : 'none' }}
          >
            <div className="df-head">
              <button type="button" className="df-nav" onClick={prevMonth} aria-label="Mês anterior">‹</button>
              <div className="df-month">{MESES[view.m]} {view.y}</div>
              <button type="button" className="df-nav" onClick={nextMonth} aria-label="Mês seguinte">›</button>
            </div>

            <div className="df-grid df-wd">
              {DIAS.map(d => <div key={d} className="df-wdc">{d}</div>)}
            </div>
            <div className="df-grid">
              {monthCells(view.y, view.m).map((d, i) => {
                if (!d) return <div key={i} className="df-pad" />;
                const isSel = draft != null && draft.y === view.y && draft.mo === view.m && draft.d === d;
                const isToday = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;
                return (
                  <button
                    type="button"
                    key={i}
                    className={`df-day${isSel ? ' df-sel' : ''}${isToday ? ' df-today' : ''}`}
                    onClick={() => setDraft({ y: view.y, mo: view.m, d })}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {mode === 'datetime' && (
              <div className="df-time">
                <span className="df-time-lbl">Hora</span>
                <div className="df-time-controls">
                  <select value={time.h} onChange={e => setTime(t => ({ ...t, h: +e.target.value }))} aria-label="Horas">
                    {HOURS.map(h => <option key={h} value={h}>{pad(h)}</option>)}
                  </select>
                  <span className="df-colon">:</span>
                  <select value={time.mi} onChange={e => setTime(t => ({ ...t, mi: +e.target.value }))} aria-label="Minutos">
                    {minuteOptions.map(m => <option key={m} value={m}>{pad(m)}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="df-foot">
              <button type="button" className="df-clear" onClick={clear}>Limpar</button>
              <div className="df-foot-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={commit} disabled={!draft}>Guardar</button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      <style jsx>{`
        .df-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: var(--surface-2);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 9px 13px;
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .df-trigger:hover:not(:disabled) { border-color: var(--border-strong); }
        .df-trigger:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
        .df-trigger:disabled { opacity: 0.5; cursor: not-allowed; }
        .df-val { color: var(--text); }
        .df-ph { color: var(--muted); }
        .df-ic { color: var(--muted); flex-shrink: 0; }
      `}</style>

      <style jsx global>{`
        .df-backdrop { position: fixed; inset: 0; z-index: 3000; background: transparent; }
        .df-pop {
          position: fixed;
          z-index: 3001;
          width: 296px;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          border-radius: 4px;
          box-shadow: var(--shadow-lg);
          padding: 14px;
          font-family: var(--font-body, 'Inter'), sans-serif;
          animation: df-in 0.12s ease;
        }
        @keyframes df-in { from { opacity: 0; } to { opacity: 1; } }
        .df-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .df-month {
          font-family: var(--font-display, 'Archivo'), sans-serif;
          font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.01em;
        }
        .df-nav {
          width: 28px; height: 28px; flex-shrink: 0;
          border: 1px solid var(--border); background: transparent; color: var(--text-2);
          border-radius: 2px; cursor: pointer; font-size: 16px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.12s, color 0.12s;
        }
        .df-nav:hover { border-color: var(--accent); color: var(--accent); }
        .df-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .df-wd { margin-bottom: 4px; }
        .df-wdc {
          text-align: center; padding: 4px 0;
          font-family: var(--font-mono, monospace); font-size: 9.5px; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--muted);
        }
        .df-pad { aspect-ratio: 1; }
        .df-day {
          aspect-ratio: 1;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-2);
          border-radius: 2px;
          font: inherit;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.1s, color 0.1s;
        }
        .df-day:hover { background: var(--surface-3); color: var(--text); }
        .df-day.df-today { box-shadow: inset 0 0 0 1.5px var(--accent); color: var(--accent); font-weight: 700; }
        .df-day.df-sel { background: var(--accent); color: var(--accent-fg); font-weight: 700; box-shadow: none; }
        .df-time {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);
        }
        .df-time-lbl {
          font-family: var(--font-mono, monospace); font-size: 10px; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--muted);
        }
        .df-time-controls { display: flex; align-items: center; gap: 6px; }
        .df-time-controls select {
          width: auto; min-width: 58px; padding: 7px 26px 7px 12px; text-align: center;
          font-variant-numeric: tabular-nums; font-size: 15px; font-weight: 600;
        }
        .df-colon { color: var(--muted); font-weight: 700; }
        .df-foot {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border);
        }
        .df-foot-actions { display: flex; gap: 8px; }
        .df-clear {
          background: transparent; border: none; color: var(--muted);
          font: inherit; font-size: 12.5px; cursor: pointer; padding: 6px 2px;
        }
        .df-clear:hover { color: var(--danger); }
      `}</style>
    </>
  );
}

export function DatePicker(props: FieldProps) {
  return <DateField {...props} mode="date" />;
}

export function DateTimePicker(props: FieldProps) {
  return <DateField {...props} mode="datetime" />;
}
