'use client';
import { DatePicker } from './DatePicker';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function build(d: string, h: string, m: string) {
  if (!d) return '';
  return `${d}T${h || '00'}:${m || '00'}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Data e hora',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const datePart = value ? value.slice(0, 10) : '';
  const timePart = value && value.length >= 16 ? value.slice(11, 16) : '';
  const hour = timePart ? timePart.slice(0, 2) : '';
  const minute = timePart ? timePart.slice(3, 5) : '';

  return (
    <div className="dtp-wrapper">
      <div style={{ flex: 1, minWidth: 0 }}>
        <DatePicker
          value={datePart}
          onChange={d => onChange(build(d, hour, minute))}
          placeholder={placeholder}
        />
      </div>
      <div className="dtp-time">
        <select
          value={hour}
          onChange={e => onChange(build(datePart, e.target.value, minute || '00'))}
          disabled={!datePart}
          className="dtp-select"
          aria-label="Hora"
        >
          <option value="">--</option>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="dtp-sep">:</span>
        <select
          value={minute}
          onChange={e => onChange(build(datePart, hour || '00', e.target.value))}
          disabled={!datePart}
          className="dtp-select"
          aria-label="Minuto"
        >
          <option value="">--</option>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}
