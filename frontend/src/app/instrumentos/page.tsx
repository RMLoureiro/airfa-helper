"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type InstrumentItem = {
  id: number;
  name: string;
  code?: string | null;
  status: string;
  notes?: string | null;
  user_id?: number | null;
  owner_name?: string | null;
};

type ReportForm = {
  description: string;
  issue_type: 'BROKEN' | 'MAINTENANCE' | 'LOST' | 'OTHER';
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const STATUS_LABEL: Record<string, string> = { OK: 'OK', NEEDS_MAINTENANCE: 'Manutenção necessária', NEEDS_FIXING: 'Avaria', OUT_OF_SERVICE: 'Fora de serviço' };
const STATUS_BADGE: Record<string, string> = { OK: 'badge-ok', NEEDS_MAINTENANCE: 'badge-needs_maintenance', NEEDS_FIXING: 'badge-needs_fixing', OUT_OF_SERVICE: 'badge-out_of_service' };

const ISSUE_OPTIONS = [
  { value: 'BROKEN', label: 'Avaria' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'OTHER', label: 'Outro' },
];

export default function InstrumentosPage() {
  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState<InstrumentItem | null>(null);
  const [form, setForm] = useState<ReportForm>({ description: '', issue_type: 'OTHER' });
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) return;
    fetch(`${apiUrl}/api/v1/instruments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setInstruments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function submitReport() {
    if (!reportTarget) return;
    const token = localStorage.getItem('airfa_token');
    if (!token) return;
    setSending(true);
    await fetch(`${apiUrl}/api/v1/instruments/${reportTarget.id}/report`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSending(false);
    setSentId(reportTarget.id);
    setReportTarget(null);
    setForm({ description: '', issue_type: 'OTHER' });
  }

  return (
    <AuthenticatedShell title="Instrumentos">
      <div className="page">
        {loading ? (
          <div className="loading">A carregar…</div>
        ) : instruments.length === 0 ? (
          <div className="empty">Sem instrumentos registados.</div>
        ) : (
          <div className="grid">
            {instruments.map(inst => (
              <div key={inst.id} className="card">
                <div className="card-top">
                  <div className="card-icon">♪</div>
                  <span className={`badge ${STATUS_BADGE[inst.status] ?? 'badge-other'}`}>{STATUS_LABEL[inst.status] ?? inst.status}</span>
                </div>
                <div className="card-body">
                  <h3 className="card-name">{inst.name}</h3>
                  {inst.code && <span className="card-code">{inst.code}</span>}
                  {inst.owner_name && <span className="card-owner">Responsável: {inst.owner_name}</span>}
                  {inst.notes && <p className="card-notes">{inst.notes}</p>}
                </div>
                {sentId === inst.id ? (
                  <div className="card-sent">✓ Ocorrência enviada</div>
                ) : (
                  <button
                    type="button"
                    className="report-btn"
                    onClick={() => { setReportTarget(inst); setForm({ description: '', issue_type: 'OTHER' }); }}
                  >
                    Reportar ocorrência
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {reportTarget && (
          <div className="modal-backdrop" onClick={() => setReportTarget(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <div>
                  <h2 className="mt">Reportar ocorrência</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{reportTarget.name}</p>
                </div>
                <button type="button" className="mc" onClick={() => setReportTarget(null)}>✕</button>
              </div>

              <div className="form">
                <label className="field">
                  Tipo de ocorrência
                  <select value={form.issue_type} onChange={e => setForm({ ...form, issue_type: e.target.value as ReportForm['issue_type'] })}>
                    {ISSUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="field">
                  Descrição
                  <textarea rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descreva o problema…" />
                </label>
              </div>

              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setReportTarget(null)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={submitReport} disabled={sending || !form.description}>
                  {sending ? 'A enviar…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; }
        .loading, .empty { color: var(--muted); font-style: italic; text-align: center; padding: 48px; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.12s;
        }
        .card:hover { border-color: var(--border-strong); }

        .card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--accent-dim);
          border: 1px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--accent);
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }

        .card-code {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--muted);
        }

        .card-owner {
          font-size: 12px;
          color: var(--text-2);
        }

        .card-notes {
          font-size: 12px;
          color: var(--muted);
          margin: 4px 0 0;
          line-height: 1.5;
        }

        .card-sent {
          font-size: 12px;
          color: var(--success);
          font-weight: 600;
          padding: 6px 0 2px;
        }

        .report-btn {
          padding: 7px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
          text-align: center;
        }
        .report-btn:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--accent-2); }

        /* Modal */
        .mh { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .mc { width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; }
        .mc:hover { border-color: var(--danger); color: var(--danger); }
        .form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }

        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: #0B0A08; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-strong); background: transparent; color: var(--text-2); font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: var(--surface-3); }
      `}</style>
    </AuthenticatedShell>
  );
}
