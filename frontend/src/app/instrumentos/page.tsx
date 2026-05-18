"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type InstrumentItem = {
  id: number;
  type: string;
  make?: string | null;
  model?: string | null;
  state: string;
};

type ReportForm = {
  report_type: 'MAINTENANCE' | 'FIX';
  severity: 'SMALL' | 'AVERAGE' | 'BIG';
  description: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function InstrumentosPage() {
  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<ReportForm>({
    report_type: 'MAINTENANCE',
    severity: 'SMALL',
    description: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    fetch(`${apiUrl}/api/v1/instruments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setInstruments)
      .catch(() => setInstruments([]));
  }, []);

  function openModal(instrumentId: number) {
    setSelectedInstrumentId(instrumentId);
    setIsModalOpen(true);
    setMessage('');
  }

  async function handleSubmit() {
    if (!selectedInstrumentId) {
      return;
    }

    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/v1/instruments/${selectedInstrumentId}/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error('Não foi possível registar o problema.');
      }

      setMessage('Problema registado com sucesso.');
      setIsModalOpen(false);
      setForm({ report_type: 'MAINTENANCE', severity: 'SMALL', description: '' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao registar o problema.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthenticatedShell title="Instrumentos" subtitle="Instrumentos atribuídos e reporte de problemas.">
      <section className="section">
        <div className="section-header">
          <h1>Instrumentos</h1>
          <button type="button">Reportar problema</button>
        </div>

        <div className="grid">
          {instruments.map((instrument) => (
            <article key={`${instrument.id}`} className="card">
              <span className="badge">{instrument.state}</span>
              <h2>{instrument.type}</h2>
              <p>{instrument.make ?? 'Marca por definir'}</p>
              <p>{instrument.model ?? 'Modelo por definir'}</p>
              <button type="button" onClick={() => openModal(instrument.id)}>
                Reportar problema
              </button>
            </article>
          ))}
        </div>

        {isModalOpen ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>Reportar problema</h2>

              <label>
                Tipo
                <select
                  value={form.report_type}
                  onChange={(event) => setForm({ ...form, report_type: event.target.value as ReportForm['report_type'] })}
                >
                  <option value="MAINTENANCE">Manutenção</option>
                  <option value="FIX">Avaria</option>
                </select>
              </label>

              <label>
                Severidade
                <select
                  value={form.severity}
                  onChange={(event) => setForm({ ...form, severity: event.target.value as ReportForm['severity'] })}
                >
                  <option value="SMALL">Pequena</option>
                  <option value="AVERAGE">Média</option>
                  <option value="BIG">Grande</option>
                </select>
              </label>

              <label>
                Descrição
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>

              {message ? <p className="message">{message}</p> : null}

              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="secondary">
                  Cancelar
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'A enviar...' : 'Enviar'}
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

        button {
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
        }

        .card button {
          margin-top: 4px;
        }

        p {
          color: var(--muted);
          margin: 0;
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
          width: min(100%, 520px);
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

        textarea,
        select {
          width: 100%;
          background: var(--input-bg);
          color: var(--text);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          outline: none;
        }

        .message {
          color: var(--muted);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
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
