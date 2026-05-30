"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { useEffect, useState } from 'react';

type InstrumentItem = {
  id: number;
  type: string;
  make?: string | null;
  model?: string | null;
  state: string;
  user_id?: number | null;
};

type MemberItem = { id: number; name: string };

type CreateForm = {
  type: string;
  make: string;
  model: string;
  state: string;
};

type ReportForm = {
  report_type: 'MAINTENANCE' | 'FIX';
  severity: 'SMALL' | 'AVERAGE' | 'BIG';
  description: string;
};

const INSTRUMENT_TYPES = [
  'PICCOLO','FLUTE','CLARINET','BASS_CLARINET','ALTO_SAXOPHONE','TENOR_SAXOPHONE',
  'BARITONE_SAXOPHONE','SOPRANO_SAXOPHONE','TROMBONE','EUPHONIUM','TUBA','FRENCH_HORN','TRUMPET',
];

const INSTRUMENT_STATES = ['OK','NEEDS_MAINTENANCE','NEEDS_FIXING','OUT_OF_SERVICE'];

const EMPTY_CREATE: CreateForm = { type: 'CLARINET', make: '', model: '', state: 'OK' };

type ReportItem = {
  id: number;
  instrument_id: number;
  user_id: number;
  report_type: string;
  severity: string;
  description: string;
  addressed: boolean;
  created_at: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const TYPE_LABEL: Record<string, string> = {
  PICCOLO: 'Flautim', FLUTE: 'Flauta', CLARINET: 'Clarinete', BASS_CLARINET: 'Clarinete Baixo',
  ALTO_SAXOPHONE: 'Saxofone Alto', TENOR_SAXOPHONE: 'Saxofone Tenor',
  BARITONE_SAXOPHONE: 'Saxofone Barítono', SOPRANO_SAXOPHONE: 'Saxofone Soprano',
  TROMBONE: 'Trombone', EUPHONIUM: 'Eufônio', TUBA: 'Tuba',
  FRENCH_HORN: 'Trompa', TRUMPET: 'Trompete',
};

const STATE_LABEL: Record<string, string> = {
  OK: 'OK', NEEDS_MAINTENANCE: 'Manutenção necessária',
  NEEDS_FIXING: 'Avaria', OUT_OF_SERVICE: 'Fora de serviço',
};
const STATE_BADGE: Record<string, string> = {
  OK: 'badge-ok', NEEDS_MAINTENANCE: 'badge-needs_maintenance',
  NEEDS_FIXING: 'badge-needs_fixing', OUT_OF_SERVICE: 'badge-out_of_service',
};

const REPORT_TYPE_LABEL: Record<string, string> = { MAINTENANCE: 'Manutenção', FIX: 'Avaria' };
const SEVERITY_LABEL: Record<string, string> = { SMALL: 'Pequena', AVERAGE: 'Média', BIG: 'Grande' };

const EMPTY_REPORT: ReportForm = { report_type: 'MAINTENANCE', severity: 'SMALL', description: '' };

export default function InstrumentosPage() {
  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [memberMap, setMemberMap] = useState<Record<number, string>>({});

  // Report modal
  const [reportTarget, setReportTarget] = useState<InstrumentItem | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>(EMPTY_REPORT);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<number | null>(null);

  // Assign modal (admin)
  const [assignTarget, setAssignTarget] = useState<InstrumentItem | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Create modal (admin)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Reports panel (admin)
  const [showReports, setShowReports] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('airfa_user');
    let admin = false;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as { system_role?: string };
        admin = u.system_role === 'ADMIN' || u.system_role === 'SUPER_ADMIN';
        setIsAdmin(admin);
      } catch { /* ignore */ }
    }

    authFetch(`${apiUrl}/api/v1/instruments`)
      .then(r => r.json())
      .then(data => { setInstruments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    if (admin) {
      authFetch(`${apiUrl}/api/v1/members/`)
        .then(r => r.json())
        .then((data: MemberItem[]) => {
          if (Array.isArray(data)) {
            setMembers(data);
            const map: Record<number, string> = {};
            data.forEach(m => { map[m.id] = m.name; });
            setMemberMap(map);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function submitReport() {
    if (!reportTarget) return;
    setSending(true);
    await authFetch(`${apiUrl}/api/v1/instruments/${reportTarget.id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportForm),
    });
    setSending(false);
    setSentId(reportTarget.id);
    setReportTarget(null);
    setReportForm(EMPTY_REPORT);
  }

  async function assignInstrument() {
    if (!assignTarget || !assignUserId) return;
    setAssigning(true);
    await authFetch(`${apiUrl}/api/v1/instruments/${assignTarget.id}/assign?user_id=${assignUserId}`, {
      method: 'POST',
    });
    setAssigning(false);
    setAssignTarget(null);
    setAssignUserId('');
    authFetch(`${apiUrl}/api/v1/instruments`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setInstruments(data); })
      .catch(() => {});
  }

  async function loadInstruments() {
    const data = await authFetch(`${apiUrl}/api/v1/instruments`).then(r => r.json());
    if (Array.isArray(data)) setInstruments(data);
  }

  async function createInstrument() {
    setCreating(true);
    await authFetch(`${apiUrl}/api/v1/instruments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: createForm.type,
        make: createForm.make || null,
        model: createForm.model || null,
        state: createForm.state,
        user_id: null,
      }),
    });
    setCreating(false);
    setIsCreateOpen(false);
    setCreateForm(EMPTY_CREATE);
    await loadInstruments();
  }

  async function deleteInstrument(id: number) {
    await authFetch(`${apiUrl}/api/v1/instruments/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    await loadInstruments();
  }

  function openReports() {
    setShowReports(true);
    setReportsLoading(true);
    authFetch(`${apiUrl}/api/v1/instruments/reports`)
      .then(r => r.json())
      .then(data => { setReports(Array.isArray(data) ? data : []); setReportsLoading(false); })
      .catch(() => setReportsLoading(false));
  }

  return (
    <AuthenticatedShell title="Instrumentos">
      <div className="page">
        {isAdmin && (
          <div className="toolbar">
            <button type="button" className="btn-secondary" onClick={openReports}>Ver ocorrências</button>
            <button type="button" className="btn-primary" onClick={() => { setCreateForm(EMPTY_CREATE); setIsCreateOpen(true); }}>+ Novo instrumento</button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">A carregar…</div>
        ) : instruments.length === 0 ? (
          <div className="empty-state">
            {isAdmin ? 'Nenhum instrumento registado.' : 'Não tem instrumentos atribuídos.'}
          </div>
        ) : (
          <div className="grid">
            {instruments.map(inst => (
              <div key={inst.id} className="card">
                <div className="card-top">
                  <div className="card-icon">♪</div>
                  <span className={`badge ${STATE_BADGE[inst.state] ?? 'badge-ok'}`}>
                    {STATE_LABEL[inst.state] ?? inst.state}
                  </span>
                </div>
                <div className="card-body">
                  <h3 className="card-name">{TYPE_LABEL[inst.type] ?? inst.type}</h3>
                  {(inst.make || inst.model) && (
                    <span className="card-make">
                      {[inst.make, inst.model].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {isAdmin && inst.user_id && memberMap[inst.user_id] && (
                    <span className="card-owner">Responsável: {memberMap[inst.user_id]}</span>
                  )}
                  {isAdmin && !inst.user_id && (
                    <span className="card-unassigned">Sem responsável</span>
                  )}
                </div>
                <div className="card-actions">
                  {sentId === inst.id ? (
                    <div className="card-sent">✓ Ocorrência enviada</div>
                  ) : (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => { setReportTarget(inst); setReportForm(EMPTY_REPORT); }}
                    >
                      Reportar ocorrência
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => { setAssignTarget(inst); setAssignUserId(inst.user_id ? String(inst.user_id) : ''); }}
                    >
                      Atribuir membro
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="action-btn action-btn--danger"
                      onClick={() => setConfirmDeleteId(inst.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report modal */}
        {reportTarget && (
          <div className="modal-backdrop" onClick={() => setReportTarget(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <div>
                  <h2 className="mt">Reportar ocorrência</h2>
                  <p className="ms">{TYPE_LABEL[reportTarget.type] ?? reportTarget.type}{reportTarget.make ? ` · ${reportTarget.make}` : ''}</p>
                </div>
                <button type="button" className="mc" onClick={() => setReportTarget(null)}>✕</button>
              </div>
              <div className="form">
                <label className="field">
                  Tipo de ocorrência
                  <select value={reportForm.report_type} onChange={e => setReportForm({ ...reportForm, report_type: e.target.value as ReportForm['report_type'] })}>
                    <option value="MAINTENANCE">Manutenção</option>
                    <option value="FIX">Avaria / reparação</option>
                  </select>
                </label>
                <label className="field">
                  Gravidade
                  <select value={reportForm.severity} onChange={e => setReportForm({ ...reportForm, severity: e.target.value as ReportForm['severity'] })}>
                    <option value="SMALL">Pequena</option>
                    <option value="AVERAGE">Média</option>
                    <option value="BIG">Grande</option>
                  </select>
                </label>
                <label className="field">
                  Descrição
                  <textarea rows={4} value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Descreva o problema…" />
                </label>
              </div>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setReportTarget(null)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={submitReport} disabled={sending || !reportForm.description.trim()}>
                  {sending ? 'A enviar…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign modal (admin) */}
        {assignTarget && (
          <div className="modal-backdrop" onClick={() => setAssignTarget(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <div>
                  <h2 className="mt">Atribuir instrumento</h2>
                  <p className="ms">{TYPE_LABEL[assignTarget.type] ?? assignTarget.type}{assignTarget.make ? ` · ${assignTarget.make}` : ''}</p>
                </div>
                <button type="button" className="mc" onClick={() => setAssignTarget(null)}>✕</button>
              </div>
              <div className="form">
                <label className="field">
                  Membro responsável
                  <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                    <option value="">— Sem responsável —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={assignInstrument} disabled={assigning}>
                  {assigning ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create instrument modal (admin) */}
        {isCreateOpen && (
          <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">Novo instrumento</h2>
                <button type="button" className="mc" onClick={() => setIsCreateOpen(false)}>✕</button>
              </div>
              <div className="form">
                <label className="field">
                  Tipo
                  <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}>
                    {INSTRUMENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
                  </select>
                </label>
                <label className="field">
                  Marca
                  <input value={createForm.make} onChange={e => setCreateForm({ ...createForm, make: e.target.value })} placeholder="Ex: Yamaha" />
                </label>
                <label className="field">
                  Modelo
                  <input value={createForm.model} onChange={e => setCreateForm({ ...createForm, model: e.target.value })} placeholder="Ex: YCL-255" />
                </label>
                <label className="field">
                  Estado
                  <select value={createForm.state} onChange={e => setCreateForm({ ...createForm, state: e.target.value })}>
                    {INSTRUMENT_STATES.map(s => <option key={s} value={s}>{STATE_LABEL[s] ?? s}</option>)}
                  </select>
                </label>
              </div>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={createInstrument} disabled={creating}>
                  {creating ? 'A guardar…' : 'Criar instrumento'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {confirmDeleteId !== null && (
          <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">Eliminar instrumento</h2>
                <button type="button" className="mc" onClick={() => setConfirmDeleteId(null)}>✕</button>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 20px' }}>
                Tens a certeza que pretendes eliminar este instrumento? Esta acção é irreversível.
              </p>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                <button type="button" className="btn-danger" onClick={() => deleteInstrument(confirmDeleteId)}>Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {/* Reports panel (admin) */}
        {showReports && (
          <div className="modal-backdrop" onClick={() => setShowReports(false)}>
            <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">Ocorrências</h2>
                <button type="button" className="mc" onClick={() => setShowReports(false)}>✕</button>
              </div>
              {reportsLoading ? (
                <div className="empty-state">A carregar…</div>
              ) : reports.length === 0 ? (
                <div className="empty-state">Sem ocorrências registadas.</div>
              ) : (
                <div className="report-list">
                  {reports.map(r => {
                    const inst = instruments.find(i => i.id === r.instrument_id);
                    return (
                      <div key={r.id} className={`report-row${r.addressed ? ' addressed' : ''}`}>
                        <div className="report-row-main">
                          <span className="report-instrument">{inst ? (TYPE_LABEL[inst.type] ?? inst.type) : `#${r.instrument_id}`}</span>
                          <span className="report-type">{REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}</span>
                          <span className={`badge-severity sev-${r.severity.toLowerCase()}`}>{SEVERITY_LABEL[r.severity] ?? r.severity}</span>
                          {r.addressed && <span className="badge-resolved">✓ Resolvida</span>}
                        </div>
                        <p className="report-desc">{r.description}</p>
                        <span className="report-meta">
                          {memberMap[r.user_id] ?? `#${r.user_id}`} · {new Date(r.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; }
        .empty-state { color: var(--muted); font-style: italic; text-align: center; padding: 48px; }
        .toolbar { display: flex; justify-content: flex-end; gap: 12px; }

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

        .card-top { display: flex; align-items: center; justify-content: space-between; }

        .card-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: var(--accent-dim); border: 1px solid var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; color: var(--accent);
        }

        .card-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .card-name { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
        .card-make { font-size: 12px; color: var(--text-2); }
        .card-owner { font-size: 12px; color: var(--text-2); }
        .card-unassigned { font-size: 12px; color: var(--muted); font-style: italic; }
        .card-sent { font-size: 12px; color: var(--success); font-weight: 600; }

        .card-actions { display: flex; flex-direction: column; gap: 5px; }

        .action-btn {
          padding: 6px; border-radius: 6px; border: 1px solid var(--border);
          background: transparent; color: var(--muted); font-size: 12px;
          cursor: pointer; transition: all 0.12s; text-align: center;
        }
        .action-btn:hover { background: var(--accent-dim); border-color: var(--accent); color: var(--accent-2); }
        .action-btn--danger { border-color: rgba(220,80,80,0.3); color: var(--danger); }
        .action-btn--danger:hover { background: rgba(220,80,80,0.12); border-color: var(--danger); color: var(--danger); }

        .badge { padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; }
        .badge-ok { background: rgba(120,200,120,0.15); color: var(--success); border: 1px solid rgba(120,200,120,0.3); }
        .badge-needs_maintenance { background: rgba(200,133,43,0.15); color: var(--concert-color); border: 1px solid rgba(200,133,43,0.3); }
        .badge-needs_fixing { background: rgba(220,80,80,0.15); color: var(--danger); border: 1px solid rgba(220,80,80,0.3); }
        .badge-out_of_service { background: rgba(120,120,120,0.15); color: var(--muted); border: 1px solid var(--border); }

        .mh { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .ms { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
        .mc { width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; }
        .mc:hover { border-color: var(--danger); color: var(--danger); }
        .form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }

        .modal-wide { max-width: 640px !important; }

        .report-list { display: flex; flex-direction: column; gap: 10px; max-height: 55vh; overflow-y: auto; padding-right: 4px; }
        .report-row {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .report-row.addressed { opacity: 0.55; }
        .report-row-main { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .report-instrument { font-size: 13px; font-weight: 600; color: var(--text); }
        .report-type { font-size: 12px; color: var(--text-2); }
        .report-desc { font-size: 13px; color: var(--text-2); margin: 2px 0 0; }
        .report-meta { font-size: 11px; color: var(--muted); }
        .badge-severity { padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .sev-small { background: rgba(120,200,120,0.15); color: var(--success); }
        .sev-average { background: rgba(200,133,43,0.15); color: var(--concert-color); }
        .sev-big { background: rgba(220,80,80,0.15); color: var(--danger); }
        .badge-resolved { font-size: 11px; color: var(--success); font-weight: 600; }

        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: var(--accent-fg); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-strong); background: transparent; color: var(--text-2); font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: var(--surface-3); }
      `}</style>
    </AuthenticatedShell>
  );
}
