"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MemberItem = {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  birth_date?: string | null;
  address?: string | null;
  join_year?: number | null;
  system_role: 'SUPER_ADMIN' | 'ADMIN' | 'REGULAR';
  musical_role?: string | null;
};

type MemberForm = {
  email: string;
  name: string;
  password: string;
  phone: string;
  birth_date: string;
  address: string;
  join_year: string;
  system_role: 'SUPER_ADMIN' | 'ADMIN' | 'REGULAR';
  musical_role: string;
};

const musicalRoles = [
  '',
  'FLUTE_PLAYER',
  'CLARINET_PLAYER',
  'SAXOPHONE_PLAYER',
  'TROMBONE_PLAYER',
  'EUPHONIUM_PLAYER',
  'TUBA_PLAYER',
  'FRENCH_HORN_PLAYER',
  'TRUMPET_PLAYER',
  'PERCUSSION_PLAYER',
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [role, setRole] = useState('REGULAR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<MemberForm>({
    email: '',
    name: '',
    password: '',
    phone: '',
    birth_date: '',
    address: '',
    join_year: '',
    system_role: 'REGULAR',
    musical_role: '',
  });

  const isSuperAdmin = role === 'SUPER_ADMIN';

  const subtitle = useMemo(() => {
    if (isSuperAdmin) {
      return 'Gestão completa de membros e papéis.';
    }
    return 'Consulta de membros disponível para administradores.';
  }, [isSuperAdmin]);

  async function loadMembers() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      router.push('/login');
      return;
    }

    if (response.status === 403) {
      router.push('/home');
      return;
    }

    if (!response.ok) {
      throw new Error('Não foi possível carregar os membros.');
    }

    const data = (await response.json()) as MemberItem[];
    setMembers(data);
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('airfa_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as { system_role?: string };
        setRole(parsed.system_role ?? 'REGULAR');
      } catch {
        setRole('REGULAR');
      }
    }

    loadMembers().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar membros.');
    });
  }, []);

  function openCreateModal() {
    setEditingMember(null);
    setForm({
      email: '',
      name: '',
      password: '',
      phone: '',
      birth_date: '',
      address: '',
      join_year: '',
      system_role: 'REGULAR',
      musical_role: '',
    });
    setMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(member: MemberItem) {
    setEditingMember(member);
    setForm({
      email: member.email,
      name: member.name,
      password: '',
      phone: member.phone ?? '',
      birth_date: member.birth_date ?? '',
      address: member.address ?? '',
      join_year: member.join_year ? String(member.join_year) : '',
      system_role: member.system_role,
      musical_role: member.musical_role ?? '',
    });
    setMessage('');
    setIsModalOpen(true);
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSuperAdmin) {
      return;
    }

    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const isEditing = Boolean(editingMember);
    const url = isEditing ? `${apiUrl}/api/v1/members/${editingMember?.id}` : `${apiUrl}/api/v1/members`;

    const payload: Record<string, unknown> = {
      email: form.email,
      name: form.name,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      address: form.address || null,
      join_year: form.join_year ? Number(form.join_year) : null,
      system_role: form.system_role,
      musical_role: form.musical_role || null,
    };

    if (!isEditing || form.password) {
      payload.password = form.password;
    }

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(errorBody?.detail ?? 'Não foi possível guardar o membro.');
      }

      setIsModalOpen(false);
      setMessage(isEditing ? 'Membro atualizado com sucesso.' : 'Membro criado com sucesso.');
      await loadMembers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao guardar membro.');
    }
  }

  return (
    <AuthenticatedShell title="Membros" subtitle={subtitle}>
      <section className="section">
        <header className="section-header">
          <h1>Membros</h1>
          {isSuperAdmin ? (
            <button type="button" onClick={openCreateModal}>
              Novo membro
            </button>
          ) : null}
        </header>

        {message ? <p className="message">{message}</p> : null}

        <div className="grid">
          {members.map((member) => (
            <article key={member.id} className="card">
              <div className="card-top">
                <h2>{member.name}</h2>
                <span className="badge">{member.system_role}</span>
              </div>
              <p>{member.email}</p>
              <p>{member.musical_role ?? 'Sem naipe definido'}</p>
              <p>{member.phone ?? 'Sem contacto'}</p>
              {isSuperAdmin ? (
                <button type="button" onClick={() => openEditModal(member)}>
                  Editar
                </button>
              ) : null}
            </article>
          ))}
        </div>

        {isModalOpen ? (
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <h2>{editingMember ? 'Editar membro' : 'Novo membro'}</h2>
              <form className="form" onSubmit={saveMember}>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </label>

                <label>
                  Nome
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </label>

                <label>
                  Password {editingMember ? '(opcional)' : ''}
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required={!editingMember}
                  />
                </label>

                <label>
                  Papel do sistema
                  <select
                    value={form.system_role}
                    onChange={(event) =>
                      setForm({ ...form, system_role: event.target.value as MemberForm['system_role'] })
                    }
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </label>

                <label>
                  Naipe
                  <select
                    value={form.musical_role}
                    onChange={(event) => setForm({ ...form, musical_role: event.target.value })}
                  >
                    {musicalRoles.map((roleOption) => (
                      <option key={roleOption || 'none'} value={roleOption}>
                        {roleOption || 'Sem naipe'}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Telemóvel
                  <input
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </label>

                <label>
                  Data de nascimento
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
                  />
                </label>

                <label>
                  Morada
                  <input
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                  />
                </label>

                <label>
                  Ano de entrada
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={form.join_year}
                    onChange={(event) => setForm({ ...form, join_year: event.target.value })}
                  />
                </label>

                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit">{editingMember ? 'Guardar alterações' : 'Criar membro'}</button>
                </div>
              </form>
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
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .card {
          display: grid;
          gap: 8px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .badge {
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(125, 211, 252, 0.12);
          color: var(--accent);
          font-size: 12px;
        }

        p {
          color: var(--muted);
          margin: 0;
        }

        .message {
          margin: 0;
          color: var(--muted);
        }

        button {
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
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
          width: min(100%, 680px);
          display: grid;
          gap: 14px;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: #121821;
          box-shadow: var(--shadow);
          max-height: 92vh;
          overflow: auto;
        }

        .form {
          display: grid;
          gap: 10px;
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
          border-radius: 12px;
          padding: 10px 12px;
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
