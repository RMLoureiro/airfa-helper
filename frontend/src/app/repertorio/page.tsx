"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import { getStoredUser, isAdmin as checkIsAdmin, isSuperAdmin as checkIsSuperAdmin } from '@/lib/user';
import { useEffect, useRef, useState } from 'react';

type RepertoireFile = {
  name: string;
  download_url: string;
};

type RepertoireItem = {
  id: number;
  title: string;
  composer?: string | null;
  arranger?: string | null;
  state: string;
  notes?: string | null;
  youtube_link?: string | null;
  files?: RepertoireFile[];
};

type RepertoireForm = {
  title: string;
  composer: string;
  arranger: string;
  state: 'CURRENT' | 'OLD' | 'FUTURE';
  notes: string;
  youtube_link: string;
};

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
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<RepertoireFile[]>([]);
  const [openFileMenuId, setOpenFileMenuId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function loadItems() {
    const res = await authFetch(`${API_URL}/api/v1/repertoire`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadItems().catch(() => setLoading(false));
    const user = getStoredUser();
    setIsAdmin(checkIsAdmin(user));
    setIsSuperAdmin(checkIsSuperAdmin(user));
  }, []);

  function openCreate() { setEditingItem(null); setForm(EMPTY_FORM); setPdfFiles([]); setExistingFiles([]); setIsModalOpen(true); }
  function openEdit(item: RepertoireItem) {
    setEditingItem(item);
    setForm({ title: item.title, composer: item.composer ?? '', arranger: item.arranger ?? '', state: item.state as RepertoireForm['state'], notes: item.notes ?? '', youtube_link: item.youtube_link ?? '' });
    setPdfFiles([]);
    setExistingFiles(item.files ?? []);
    setIsModalOpen(true);
  }

  async function removeExistingFile(file: RepertoireFile) {
    if (!editingItem) return;
    await authFetch(`${API_URL}/api/v1/repertoire/${editingItem.id}/files/${encodeURIComponent(file.name)}`, { method: 'DELETE' });
    setExistingFiles(prev => prev.filter(f => f.name !== file.name));
  }

  async function removeAllExistingFiles() {
    if (!editingItem) return;
    await authFetch(`${API_URL}/api/v1/repertoire/${editingItem.id}/files`, { method: 'DELETE' });
    setExistingFiles([]);
  }

  async function saveItem() {
    const payload = { ...form, composer: form.composer || null, arranger: form.arranger || null, notes: form.notes || null, youtube_link: form.youtube_link || null };
    const isEditing = Boolean(editingItem);
    const savedRes = await authFetch(isEditing ? `${API_URL}/api/v1/repertoire/${editingItem?.id}` : `${API_URL}/api/v1/repertoire`, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const saved = await savedRes.json();
    if (pdfFiles.length > 0 && saved.id) {
      const BATCH = 3;
      for (let i = 0; i < pdfFiles.length; i += BATCH) {
        const fd = new FormData();
        pdfFiles.slice(i, i + BATCH).forEach(f => fd.append('files', f));
        await authFetch(`${API_URL}/api/v1/repertoire/${saved.id}/files`, { method: 'POST', body: fd });
      }
    }
    setIsModalOpen(false);
    await loadItems();
  }

  async function removeItem(id: number) {
    await authFetch(`${API_URL}/api/v1/repertoire/${id}`, { method: 'DELETE' });
    await loadItems();
  }

  async function downloadFile(file: RepertoireFile) {
    const res = await authFetch(`${API_URL}${file.download_url}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
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
                      {item.composer && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>{item.composer}</span>}
                      {item.arranger && <span>· arr. {item.arranger}</span>}
                    </div>
                  )}
                  {item.notes && <p className="row-notes">{item.notes}</p>}
                </div>
                <div className="row-actions">
                  {item.youtube_link && (
                    <a href={item.youtube_link} target="_blank" rel="noopener noreferrer" className="action-link yt" title="YouTube">▶</a>
                  )}
                  {(item.files ?? []).length > 0 && (
                    <div className="file-menu-wrap">
                      <button
                        type="button"
                        className={`action-link pdf${openFileMenuId === item.id ? ' active' : ''}`}
                        onClick={() => setOpenFileMenuId(openFileMenuId === item.id ? null : item.id)}
                      >
                        ↓ PDF{(item.files!.length > 1) ? ` (${item.files!.length})` : ''}
                      </button>
                      {openFileMenuId === item.id && (
                        <div className="file-menu">
                          {item.files!.map(file => (
                            <button key={file.name} type="button" className="file-menu-item" onClick={() => { downloadFile(file); setOpenFileMenuId(null); }}>
                              📄 {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <button type="button" className="action-btn" onClick={() => openEdit(item)}>Editar</button>
                      {isSuperAdmin && <button type="button" className="action-btn danger" onClick={() => setConfirmDeleteId(item.id)}>Remover</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {openFileMenuId !== null && (
          <div className="file-menu-backdrop" onClick={() => setOpenFileMenuId(null)} />
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
                <div className="field span-2">
                  <span className="field-label">Partituras PDF</span>
                  {editingItem && existingFiles.length > 0 && (
                    <div className="existing-files">
                      {existingFiles.map(file => (
                        <div key={file.name} className="existing-file">
                          <span className="existing-file-name" title={file.name}>📄 {file.name}</span>
                          <button type="button" className="file-remove-btn" title="Remover ficheiro" onClick={() => removeExistingFile(file)}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="btn-danger-sm" onClick={removeAllExistingFiles}>Remover todos</button>
                    </div>
                  )}
                  {editingItem && existingFiles.length === 0 && (
                    <p className="no-files">Sem partituras carregadas.</p>
                  )}
                  <label className="file-input-label">
                    <input type="file" accept="application/pdf" multiple ref={pdfInputRef} onChange={e => setPdfFiles(Array.from(e.target.files ?? []))} />
                    {pdfFiles.length > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {pdfFiles.map(f => f.name).join(', ')}
                      </span>
                    )}
                  </label>
                </div>
              </div>
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={saveItem}>Guardar</button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteId !== null && (
          <ConfirmDialog
            message="Tens a certeza que pretendes remover esta obra?"
            confirmLabel="Remover"
            onConfirm={() => { removeItem(confirmDeleteId); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
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

        .file-menu-wrap { position: relative; }
        .file-menu-backdrop { position: fixed; inset: 0; z-index: 99; }
        .file-menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 100; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.18); min-width: 220px; max-width: 320px; overflow: hidden; }
        .file-menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 12px; background: transparent; border: none; text-align: left; font-size: 13px; color: var(--text-2); cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; transition: background 0.1s; }
        .file-menu-item:hover { background: var(--surface-2); color: var(--text); }
        .action-link.pdf.active { background: var(--accent-dim); border-color: var(--accent); }

        /* Modal */
        .mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .mc { width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; }
        .mc:hover { border-color: var(--danger); color: var(--danger); }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        .field-label { font-size: 13px; font-weight: 500; color: var(--text-2); }
        .span-2 { grid-column: span 2; }

        .existing-files { display: flex; flex-direction: column; gap: 4px; margin: 6px 0 8px; }
        .existing-file { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 5px; }
        .existing-file-name { flex: 1; font-size: 12px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .file-remove-btn { flex-shrink: 0; width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(194,78,66,0.35); background: transparent; color: var(--danger); font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: all 0.12s; }
        .file-remove-btn:hover { background: var(--danger-dim); border-color: var(--danger); }
        .btn-danger-sm { align-self: flex-start; padding: 4px 10px; border-radius: 5px; border: 1px solid rgba(194,78,66,0.35); background: transparent; color: var(--danger); font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s; margin-top: 2px; }
        .btn-danger-sm:hover { background: var(--danger-dim); border-color: var(--danger); }
        .no-files { font-size: 12px; color: var(--muted); font-style: italic; margin: 4px 0 8px; }
        .file-input-label { display: flex; flex-direction: column; gap: 4px; cursor: pointer; }

        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }
        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: var(--accent-fg); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
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
