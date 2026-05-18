"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { FormEvent, useEffect, useState } from 'react';

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

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [newMember, setNewMember] = useState({
    email: '',
    name: '',
    password: '',
    system_role: 'REGULAR' as 'SUPER_ADMIN' | 'ADMIN' | 'REGULAR',
  });

  async function loadMembers() {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/members`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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
        setIsAdmin(parsed.system_role === 'ADMIN' || parsed.system_role === 'SUPER_ADMIN');
      } catch {
        setIsAdmin(false);
      }
    }

    loadMembers().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar membros.');
      setMembers([]);
    });
  }, []);

  const handleCreateMember = async (e: FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newMember),
    });

    if (!response.ok) {
      setMessage('Não foi possível criar o membro.');
      return;
    }

    const data = (await response.json()) as MemberItem;
    setMembers((prev) => [...prev, data]);
    setNewMember({ email: '', name: '', password: '', system_role: 'REGULAR' });
    setMessage('Membro criado com sucesso.');
  };

  const handleDeleteMember = async (id: number) => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    const response = await fetch(`${apiUrl}/api/v1/members/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setMessage('Não foi possível remover o membro.');
      return;
    }

    setMembers((prev) => prev.filter((member) => member.id !== id));
    setMessage('Membro removido com sucesso.');
  };

  return (
    <AuthenticatedShell title="Membros" subtitle="Gestão de utilizadores e permissões.">
      <section className="section">
        <div className="header">
          <h1>Membros</h1>
        </div>

        {message ? <p className="message">{message}</p> : null}

        <div className="list">
          {members.map((member) => (
            <article key={member.id} className="item">
              <div>
                <strong>{member.name}</strong>
                <p>{member.email}</p>
                <span className="badge">{member.system_role}</span>
              </div>
              {isAdmin ? (
                <button type="button" className="danger" onClick={() => handleDeleteMember(member.id)}>
                  Remover
                </button>
              ) : null}
            </article>
          ))}
        </div>

        {isAdmin ? (
          <form className="form" onSubmit={handleCreateMember}>
            <h2>Novo membro</h2>
            <label>
              Email
              <input
                type="email"
                required
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </label>
            <label>
              Nome
              <input
                type="text"
                required
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={newMember.password}
                onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
              />
            </label>
            <label>
              Papel
              <select
                value={newMember.system_role}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    system_role: e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'REGULAR',
                  })
                }
              >
                <option value="REGULAR">REGULAR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </label>
            <button type="submit">Criar membro</button>
          </form>
        ) : null}
      </section>

      <style jsx>{`
        .section {
          display: grid;
          gap: 18px;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        .message {
          color: var(--muted);
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .item {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--panel-soft);
          padding: 14px;
        }

        .item p {
          color: var(--muted);
          font-size: 14px;
        }

        .badge {
          display: inline-block;
          margin-top: 6px;
          font-size: 12px;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 10px;
          color: var(--accent);
          background: rgba(125, 211, 252, 0.12);
        }

        .form {
          display: grid;
          gap: 10px;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.02);
        }

        label {
          display: grid;
          gap: 6px;
          font-size: 14px;
          color: var(--muted);
        }

        input,
        select {
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(13, 17, 23, 0.7);
          color: var(--text);
          padding: 10px 12px;
        }

        button {
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          color: #08111f;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          font-weight: 700;
          cursor: pointer;
          width: fit-content;
        }

        .danger {
          background: rgba(251, 113, 133, 0.18);
          color: var(--text);
        }
      `}</style>
    </AuthenticatedShell>
  );
}
