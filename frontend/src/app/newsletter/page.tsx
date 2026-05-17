"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type NewsletterItem = {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name?: string | null;
  created_at: string;
};

type NewsletterForm = {
  title: string;
  content: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function NewsletterPage() {
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsletterItem | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<NewsletterForm>({
    title: '',
    content: '',
  });

  async function loadNewsletter() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/newsletter`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Não foi possível carregar a newsletter.');
    }

    const data = (await response.json()) as NewsletterItem[];
    setItems(data);
  }

  useEffect(() => {
    loadNewsletter().catch(() => setItems([]));

    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        setIsAdmin(parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN');
        setIsSuperAdmin(parsed.system_role === 'SUPER_ADMIN');
      } catch {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    }
  }, []);

  function openCreateModal() {
    setEditingItem(null);
    setForm({ title: '', content: '' });
    setMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(item: NewsletterItem) {
    setEditingItem(item);
    setForm({ title: item.title, content: item.content });
    setMessage('');
    setIsModalOpen(true);
  }

  async function saveNewsletter() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const isEditing = Boolean(editingItem);
    const url = isEditing ? `${apiUrl}/api/v1/newsletter/${editingItem?.id}` : `${apiUrl}/api/v1/newsletter`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? 'Não foi possível guardar a publicação.');
      }

      setIsModalOpen(false);
      setMessage(isEditing ? 'Publicação atualizada com sucesso.' : 'Publicação criada com sucesso.');
      await loadNewsletter();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao guardar newsletter.');
    }
  }

  async function removeNewsletter(itemId: number) {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/newsletter/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? 'Não foi possível remover a publicação.');
      }

      setMessage('Publicação removida com sucesso.');
      await loadNewsletter();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao remover publicação.');
    }
  }

  return (
    <AuthenticatedShell title="Newsletter" subtitle="Publicações internas e anúncios da banda.">
      <section className="section">
        <div className="section-header">
          <h1>Newsletter</h1>
          {isAdmin ? (
            <button type="button" onClick={openCreateModal}>
              Nova publicação
            </button>
          ) : null}
        </div>

        {message ? <p className="message">{message}</p> : null}

        <div className="grid">
          {items.map((item) => (
            <article key={item.id} className="card">
              <div className="card-top">
                <h2>{item.title}</h2>
                <span className="badge">{new Date(item.created_at).toLocaleDateString('pt-PT')}</span>
              </div>
              <p className="author">{item.author_name ?? 'Autor desconhecido'}</p>
              <p className="content">{item.content}</p>

              {isAdmin ? (
                <div className="actions">
                  <button type="button" onClick={() => openEditModal(item)}>
                    Editar
                  </button>
                  {isSuperAdmin ? (
                    <button type="button" className="danger" onClick={() => removeNewsletter(item.id)}>
                      Remover
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {isModalOpen ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>{editingItem ? 'Editar publicação' : 'Nova publicação'}</h2>

              <label>
                Título
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>

              <label>
                Conteúdo
                <textarea
                  rows={8}
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" onClick={saveNewsletter}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <style jsx>{`
        .section {
          display: grid;
          gap: 20px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        h1,
        h2 {
          margin: 0;
        }

        .grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .card {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: start;
        }

        .badge {
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(125, 211, 252, 0.12);
          color: var(--accent);
          font-size: 12px;
          white-space: nowrap;
        }

        .author,
        .content,
        .message {
          color: var(--muted);
          margin: 0;
        }

        .content {
          white-space: pre-wrap;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        button {
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
        }

        .danger {
          background: rgba(251, 113, 133, 0.18);
          color: var(--text);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(3, 6, 12, 0.72);
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .modal {
          width: min(100%, 720px);
          display: grid;
          gap: 14px;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: #121821;
          box-shadow: var(--shadow);
        }

        label {
          display: grid;
          gap: 8px;
          color: var(--text);
        }

        input,
        textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
        }

        textarea {
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }

        .secondary {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
        }
      `}</style>
    </AuthenticatedShell>
  );
}
