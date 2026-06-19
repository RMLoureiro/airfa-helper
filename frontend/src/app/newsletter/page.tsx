"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import { getStoredUser, isAdmin as checkIsAdmin, isSuperAdmin as checkIsSuperAdmin } from '@/lib/user';
import { useEffect, useState } from 'react';

type NewsletterItem = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  facebook_link?: string | null;
  instagram_link?: string | null;
  youtube_link?: string | null;
};

type NewsletterForm = {
  title: string;
  content: string;
  facebook_link: string;
  instagram_link: string;
  youtube_link: string;
};

const EMPTY_FORM: NewsletterForm = { title: '', content: '', facebook_link: '', instagram_link: '', youtube_link: '' };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function NewsletterPage() {
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsletterItem | null>(null);
  const [form, setForm] = useState<NewsletterForm>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function loadItems() {
    const res = await authFetch(`${API_URL}/api/v1/newsletter`);
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

  function openCreate() { setEditingItem(null); setForm(EMPTY_FORM); setIsModalOpen(true); }
  function openEdit(item: NewsletterItem) {
    setEditingItem(item);
    setForm({ title: item.title, content: item.content, facebook_link: item.facebook_link ?? '', instagram_link: item.instagram_link ?? '', youtube_link: item.youtube_link ?? '' });
    setIsModalOpen(true);
  }

  async function saveItem() {
    const payload = { ...form, facebook_link: form.facebook_link || null, instagram_link: form.instagram_link || null, youtube_link: form.youtube_link || null };
    const isEditing = Boolean(editingItem);
    await authFetch(isEditing ? `${API_URL}/api/v1/newsletter/${editingItem?.id}` : `${API_URL}/api/v1/newsletter`, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setIsModalOpen(false);
    await loadItems();
  }

  async function removeItem(id: number) {
    await authFetch(`${API_URL}/api/v1/newsletter/${id}`, { method: 'DELETE' });
    await loadItems();
  }

  return (
    <AuthenticatedShell title="Newsletter">
      <div className="page">
        {isAdmin && (
          <div className="toolbar">
            <button type="button" className="btn-primary" onClick={openCreate}>+ Nova publicação</button>
          </div>
        )}

        {loading ? (
          <div className="loading">A carregar…</div>
        ) : items.length === 0 ? (
          <div className="empty">Sem publicações.</div>
        ) : (
          <div className="feed">
            {items.map(item => (
              <article key={item.id} className="article">
                <header className="article-header">
                  <time className="article-date">{formatDate(item.created_at)}</time>
                  {isAdmin && (
                    <div className="article-actions">
                      <button type="button" className="action-btn" onClick={() => openEdit(item)}>Editar</button>
                      {isSuperAdmin && <button type="button" className="action-btn danger" onClick={() => setConfirmDeleteId(item.id)}>Remover</button>}
                    </div>
                  )}
                </header>
                <h2 className="article-title">{item.title}</h2>
                <p className="article-body">{item.content}</p>
                {(item.facebook_link || item.instagram_link || item.youtube_link) && (
                  <div className="social-row">
                    {item.facebook_link && <a href={item.facebook_link} target="_blank" rel="noopener noreferrer" className="social-link fb">Facebook</a>}
                    {item.instagram_link && <a href={item.instagram_link} target="_blank" rel="noopener noreferrer" className="social-link ig">Instagram</a>}
                    {item.youtube_link && <a href={item.youtube_link} target="_blank" rel="noopener noreferrer" className="social-link yt">YouTube</a>}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">{editingItem ? 'Editar publicação' : 'Nova publicação'}</h2>
                <button type="button" className="mc" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <div className="form">
                <label className="field">
                  Título
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título da publicação" />
                </label>
                <label className="field">
                  Texto
                  <textarea rows={5} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Conteúdo da publicação" />
                </label>
                <label className="field">
                  Link Facebook
                  <input value={form.facebook_link} onChange={e => setForm({ ...form, facebook_link: e.target.value })} placeholder="https://facebook.com/..." />
                </label>
                <label className="field">
                  Link Instagram
                  <input value={form.instagram_link} onChange={e => setForm({ ...form, instagram_link: e.target.value })} placeholder="https://instagram.com/..." />
                </label>
                <label className="field">
                  Link YouTube
                  <input value={form.youtube_link} onChange={e => setForm({ ...form, youtube_link: e.target.value })} placeholder="https://youtube.com/..." />
                </label>
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
            message="Tens a certeza que pretendes remover esta publicação?"
            confirmLabel="Remover"
            onConfirm={() => { removeItem(confirmDeleteId); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; max-width: 760px; }

        .toolbar { display: flex; justify-content: flex-end; }

        .loading, .empty {
          color: var(--muted);
          font-style: italic;
          text-align: center;
          padding: 48px;
          font-size: 14px;
        }

        .feed { display: flex; flex-direction: column; gap: 16px; }

        .article {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.15s;
        }
        .article:hover { border-color: var(--border-strong); }

        .article-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .article-date {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.04em;
        }

        .article-actions { display: flex; gap: 6px; }

        .action-btn {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .action-btn:hover { background: var(--surface-2); color: var(--text); }
        .action-btn.danger { color: var(--danger); border-color: rgba(194,78,66,0.3); }
        .action-btn.danger:hover { background: var(--danger-dim); }

        .article-title {
          font-family: var(--font-display, serif);
          font-size: 22px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.25;
        }

        .article-body {
          font-size: 14px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .social-row { display: flex; gap: 6px; }
        .social-link {
          padding: 4px 10px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .social-link:hover { opacity: 0.8; }
        .fb { background: rgba(24,119,242,0.12); border: 1px solid rgba(24,119,242,0.28); color: #4e9cf5; }
        .ig { background: rgba(225,48,108,0.1); border: 1px solid rgba(225,48,108,0.24); color: #e1306c; }
        .yt { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.26); color: #ff4d4d; }

        /* Modal */
        .mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .mc {
          width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border);
          background: transparent; color: var(--muted); cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center; padding: 0;
        }
        .mc:hover { border-color: var(--danger); color: var(--danger); }

        .form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
        }

        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; }

        .btn-primary {
          padding: 8px 16px; border-radius: 6px; border: none;
          background: var(--accent); color: var(--accent-fg); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
        }
        .btn-primary:hover { background: var(--accent-2); }

        .btn-secondary {
          padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-strong);
          background: transparent; color: var(--text-2); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: background 0.12s;
        }
        .btn-secondary:hover { background: var(--surface-3); }
      `}</style>
    </AuthenticatedShell>
  );
}
