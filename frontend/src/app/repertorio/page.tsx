"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type RepertoireItem = {
  id: number;
  title: string;
  youtube_link?: string | null;
  folder_path?: string | null;
  state: 'CURRENT' | 'OLD' | 'FUTURE';
  files?: Array<{
    name: string;
    download_url: string;
  }>;
};

type RepertoireForm = {
  title: string;
  youtube_link: string;
  folder_path: string;
  state: 'CURRENT' | 'OLD' | 'FUTURE';
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function RepertorioPage() {
  const [repertoire, setRepertoire] = useState<RepertoireItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingForId, setUploadingForId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<RepertoireForm>({
    title: '',
    youtube_link: '',
    folder_path: '',
    state: 'CURRENT',
  });

  async function loadRepertoire() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/repertoire`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await response.json()) as RepertoireItem[];
    setRepertoire(data);
  }

  useEffect(() => {
    loadRepertoire().catch(() => setRepertoire([]));

    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        setIsAdmin(parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN');
      } catch {
        setIsAdmin(false);
      }
    }
  }, []);

  async function createWork() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    setMessage('');

    try {
      const createResponse = await fetch(`${apiUrl}/api/v1/repertoire`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          youtube_link: form.youtube_link || null,
          folder_path: form.folder_path || null,
          state: form.state,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Não foi possível criar a obra.');
      }

      const created = (await createResponse.json()) as RepertoireItem;

      if (selectedFiles.length > 0) {
        const uploadForm = new FormData();
        selectedFiles.forEach((file) => uploadForm.append('files', file));

        const uploadResponse = await fetch(`${apiUrl}/api/v1/repertoire/${created.id}/files`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm,
        });

        if (!uploadResponse.ok) {
          throw new Error('A obra foi criada, mas o upload dos PDFs falhou.');
        }
      }

      setIsModalOpen(false);
      setSelectedFiles([]);
      setForm({ title: '', youtube_link: '', folder_path: '', state: 'CURRENT' });
      setMessage('Obra criada com sucesso.');
      await loadRepertoire();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao criar obra.');
    }
  }

  async function uploadFilesToExistingWork(repertoireId: number, files: File[]) {
    const token = localStorage.getItem('airfa_token');
    if (!token || files.length === 0) {
      return;
    }

    setUploadingForId(repertoireId);
    setMessage('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch(`${apiUrl}/api/v1/repertoire/${repertoireId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Não foi possível carregar os PDFs.');
      }

      setMessage('PDFs carregados com sucesso.');
      await loadRepertoire();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha no upload dos PDFs.');
    } finally {
      setUploadingForId(null);
    }
  }

  return (
    <AuthenticatedShell title="Repertório" subtitle="Obras atuais, antigas e futuras.">
      <section className="section">
        <div className="section-header">
          <h1>Repertório</h1>
          {isAdmin ? (
            <button type="button" onClick={() => setIsModalOpen(true)}>
              Adicionar obra
            </button>
          ) : null}
        </div>

        {message ? <p className="message">{message}</p> : null}

        <div className="grid">
          {repertoire.map((item) => (
            <article key={item.title} className="card">
              <span className="badge">{item.state}</span>
              <h2>{item.title}</h2>
              <p>{item.youtube_link ?? 'Sem link YouTube'}</p>
              <div className="files">
                {item.files?.length ? (
                  item.files.map((file) => (
                    <a key={file.name} href={`${apiUrl}${file.download_url}`} target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                  ))
                ) : (
                  <span className="empty">Sem PDFs disponíveis</span>
                )}
              </div>

              {isAdmin ? (
                <label className="upload-inline">
                  <span>{uploadingForId === item.id ? 'A carregar...' : 'Carregar PDFs'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length > 0) {
                        uploadFilesToExistingWork(item.id, files).catch(() => {
                          setMessage('Falha no upload dos PDFs.');
                        });
                      }
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              ) : null}
            </article>
          ))}
        </div>

        {isModalOpen ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>Adicionar obra</h2>

              <label>
                Título
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>

              <label>
                Link YouTube
                <input
                  value={form.youtube_link}
                  onChange={(event) => setForm({ ...form, youtube_link: event.target.value })}
                />
              </label>

              <label>
                Pasta (opcional)
                <input
                  value={form.folder_path}
                  onChange={(event) => setForm({ ...form, folder_path: event.target.value })}
                />
              </label>

              <label>
                Estado
                <select
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value as RepertoireForm['state'] })}
                >
                  <option value="CURRENT">Atual</option>
                  <option value="OLD">Antigo</option>
                  <option value="FUTURE">Futuro</option>
                </select>
              </label>

              <label>
                PDFs
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" onClick={createWork}>
                  Guardar obra
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

        button {
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
        }

        .grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .card {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .badge {
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(125, 211, 252, 0.12);
          color: var(--accent);
          font-size: 12px;
        }

        p,
        a,
        .empty {
          color: var(--muted);
          margin: 0;
        }

        .message {
          margin: 0;
          color: var(--muted);
        }

        .files {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .files a {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.03);
        }

        .upload-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 8px 12px;
          cursor: pointer;
          color: var(--text);
          width: fit-content;
          background: rgba(255, 255, 255, 0.02);
        }

        .upload-inline input {
          display: none;
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
          width: min(100%, 560px);
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
        select {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
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
