"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type RepertoireItem = {
  id: number;
  title: string;
  youtube_link?: string | null;
  folder_path?: string | null;
  state: string;
  files?: Array<{
    name: string;
    download_url: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function RepertorioPage() {
  const [repertoire, setRepertoire] = useState<RepertoireItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    fetch(`${apiUrl}/api/v1/repertoire`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setRepertoire)
      .catch(() => setRepertoire([]));
  }, []);

  return (
    <AuthenticatedShell title="Repertório" subtitle="Obras atuais, antigas e futuras.">
      <section className="section">
        <div className="section-header">
          <h1>Repertório</h1>
          <button type="button">Adicionar obra</button>
        </div>

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
            </article>
          ))}
        </div>
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
      `}</style>
    </AuthenticatedShell>
  );
}
