"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { useEffect, useRef, useState } from 'react';

type RepertoireItem = {
  id: number;
  title: string;
  composer?: string | null;
  arranger?: string | null;
  state: string;
  notes?: string | null;
  youtube_link?: string | null;
  pdf_filename?: string | null;
};

type RepertoireForm = {
  title: string;
  composer: string;
  arranger: string;
  state: 'CURRENT' | 'OLD' | 'FUTURE';
  notes: string;
  youtube_link: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const STATE_LABEL: Record<string, string> = { CURRENT: 'Atual', OLD: 'Arquivo', FUTURE: 'Em estudo' };
const STATE_BADGE: Record<string, string> = { CURRENT: 'badge-current', OLD: 'badge-old', FUTURE: 'badge-future' };

const EMPTY_FORM: RepertoireForm = { title: '', composer: '', arranger: '', state: 'CURRENT', notes: '', youtube_link: '' };

export default function RepertorioPage() {
  const [items, setItems] = useState<RepertoireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [filterState, setFilterState] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RepertoireItem | null>(null);
  const [form, setForm] = useState<RepertoireForm>(EMPTY_FORM);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  async function loadItems() {
    const res = await authFetch(`${apiUrl}/api/v1/repertoire`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems().catch(() => setLoading(false));
    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser) as { system_role?: string };
        setIsAdmin(u.system_role === 'ADMIN' || u.system_role === 'SUPER_ADMIN');
        setIsSuperAdmin(u.system_role === 'SUPER_ADMIN');
      } catch { /* ignore */ }
    }
  }, []);

  function openCreate() { setEditingItem(null); setForm(EMPTY_FORM); setPdfFile(null); setIsModalOpen(true); }
  function openEdit(item: RepertoireItem) {
    setEditingItem(item);
    setForm({ title: item.title, composer: item.composer ?? '', arranger: item.arranger ?? '', state: item.state as RepertoireForm['state'], notes: item.notes ?? '', youtube_link: item.youtube_link ?? '' });
    setPdfFile(null);
    setIsModalOpen(true);
  }

  async function saveItem() {
    const payload = { ...form, composer: form.composer || null, arranger: form.arranger || null, notes: form.notes || null, youtube_link: form.youtube_link || null };
    const isEditing = Boolean(editingItem);
    const savedRes = await authFetch(isEditing ? `${apiUrl}/api/v1/repertoire/${editingItem?.id}` : `${apiUrl}/api/v1/repertoire`, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const saved = await savedRes.json();
    if (pdfFile && saved.id) {
      const fd = new FormData();
      fd.append('file', pdfFile);
      await authFetch(`${apiUrl}/api/v1/repertoire/${saved.id}/pdf`, { method: 'POST', body: fd });
    }
    setIsModalOpen(false);
    await loadItems();
  }

  async function removeItem(id: number) {
    if (!window.confirm('Remover esta obra?')) return;
    await authFetch(`${apiUrl}/api/v1/repertoire/${id}`, { method: 'DELETE' });
    await loadItems();
  }

  async function downloadPdf(item: RepertoireItem) {
    const res = await authFetch(`${apiUrl}/api/v1/repertoire/${item.id}/pdf`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = item.pdf_filename ?? `${item.title}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  const displayed = items.filter(i => !filterState || i.state === filterState);

  return (
    <AuthenticatedShell title="Repertório">
      <div className="page">
        <div className="toolbar">
          <div className="filter-pills">
            {[null, 'CURRENT', 'FUTURE', 'OLD'].map(s => (
              <button key={s ?? 'all'} type="button" className={`fpill${filterState === s ? ' active' : ''}`} onClick={() => setFilterState(s)}>
                {s === null ? 'Todos' : STATE_LABEL[s]}
              </button>
            ))}
          </div>
          {isAdmin && <button type="button" className="btn-primary" onClick={openCreate}>+ Nova obra</button>}
        </div>

        {loading ? (
          <div className="loading">A carregar…</div>
        ) : displayed.length === 0 ? (
          <div className="empty">Sem obras nesta categoria.</div>
        ) : (
          <div className="list">
            {displayed.map(item => (
              <div key={item.id} className="row">
                <div className="row-left">
                  <div className="row-title-row">
                    <h3 className="row-title">{item.title}</h3>
                    <span className={`badge ${STATE_BADGE[item.state] ?? 'badge-other'}`}>{STATE_LABEL[item.state] ?? item.state}</span>
                  </div>
                  {(item.composer || item.arranger) && (
                    <div className="row-meta">
                      {item.composer && <span>🎼 {item.composer}</span>}
                      {item.arranger && <span>· arr. {item.arranger}</span>}
                    </div>
                  )}
                  {item.notes && <p className="row-notes">{item.notes}</p>}
                </div>
                <div className="row-actions">
                  {item.youtube_link && (
                    <a href={item.youtube_link} target="_blank" rel="noopener noreferrer" className="action-link yt" title="YouTube">▶</a>
                  )}
                  {item.pdf_filename && (
                    <button type="button" className="action-link pdf" title="Descarregar PDF" onClick={() => downloadPdf(item)}>↓ PDF</button>
                  )}
                  {isAdmin && (
                    <>
                      <button type="button" className="action-btn" onClick={() => openEdit(item)}>Editar</button>
                      {isSuperAdmin && <button type="button" className="action-btn danger" onClick={() => removeItem(item.id)}>Remover</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">{editingItem ? 'Editar obra' : 'Nova obra'}</h2>
                <button type="button" className="mc" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <div className="form-grid">
                <label className="field span-2">
                  Título
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título da obra" />
                </label>
                <label className="field">
                  Compositor
                  <input value={form.composer} onChange={e => setForm({ ...form, composer: e.target.value })} placeholder="Compositor" />
                </label>
                <label className="field">
                  Arranjador
                  <input value={form.arranger} onChange={e => setForm({ ...form, arranger: e.target.value })} placeholder="Arranjador" />
                </label>
                <label className="field">
                  Estado
                  <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value as RepertoireForm['state'] })}>
                    <option value="CURRENT">Atual</option>
                    <option value="FUTURE">Em estudo</option>
                    <option value="OLD">Arquivo</option>
                  </select>
                </label>
                <label className="field">
                  Link YouTube
                  <input value={form.youtube_link} onChange={e => setForm({ ...form, youtube_link: e.target.value })} placeholder="https://youtube.com/..." />
                </label>
                <label className="field span-2">
                  Notas
                  <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas opcionais…" />
                </label>
                <label className="field span-2">
                  Partitura PDF
                  <input type="file" accept="application/pdf" ref={pdfInputRef} onChange={e => setPdfFile(e.target.files?.[0] ?? null)} />
                  {pdfFile && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pdfFile.name}</span>}
                </label>
              </div>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={saveItem}>Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .fpill { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 13px; cursor: pointer; transition: all 0.12s; }
        .fpill:hover { background: var(--surface-2); color: var(--text-2); }
        .fpill.active { background: var(--accent-dim); color: var(--accent-2); border-color: var(--accent); }

        .loading, .empty { color: var(--muted); font-style: italic; text-align: center; padding: 48px; }

        .list { display: flex; flex-direction: column; gap: 2px; }

        .row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          transition: border-color 0.12s;
        }
        .row:hover { border-color: var(--border-strong); }

        .row-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }

        .row-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .row-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }

        .row-meta { font-size: 12px; color: var(--muted); display: flex; gap: 6px; flex-wrap: wrap; }

        .row-notes { font-size: 12px; color: var(--text-2); margin: 0; line-height: 1.5; }

        .row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .action-link {
          padding: 5px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          transition: all 0.12s;
        }
        .yt { color: #ff4e45; border-color: rgba(255,78,69,0.3); }
        .yt:hover { background: rgba(255,78,69,0.1); }
        .pdf { color: var(--accent); border-color: var(--accent); }
        .pdf:hover { background: var(--accent-dim); }

        .action-btn { padding: 5px 10px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 12px; cursor: pointer; transition: all 0.12s; }
        .action-btn:hover { background: var(--surface-2); }
        .action-btn.danger { color: var(--danger); border-color: rgba(194,78,66,0.3); }
        .action-btn.danger:hover { background: var(--danger-dim); }

        /* Modal */
        .mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .mc { width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; }
        .mc:hover { border-color: var(--danger); color: var(--danger); }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        .span-2 { grid-column: span 2; }

        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }
        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: #0B0A08; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: var(--accent-2); }
        .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-strong); background: transparent; color: var(--text-2); font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: var(--surface-3); }

        @media (max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
        }
      `}</style>
    </AuthenticatedShell>
  );
}
