"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type MeResponse = {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  birth_date?: string | null;
  address?: string | null;
  join_year?: number | null;
  system_role: string;
  musical_role?: string | null;
};

type ProfileForm = {
  name: string;
  phone: string;
  birth_date: string;
  address: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    birth_date: '',
    address: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${apiUrl}/api/v1/members/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Falha ao carregar perfil.');
        }
        return response.json();
      })
      .then((data: MeResponse) => {
        setMe(data);
        setForm({
          name: data.name ?? '',
          phone: data.phone ?? '',
          birth_date: data.birth_date ?? '',
          address: data.address ?? '',
        });
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage('');

    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/members/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          birth_date: form.birth_date || null,
          address: form.address || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível guardar o perfil.');
      }

      const updated = (await response.json()) as MeResponse;
      setMe(updated);
      localStorage.setItem(
        'airfa_user',
        JSON.stringify({
          ...JSON.parse(localStorage.getItem('airfa_user') ?? '{}'),
          name: updated.name,
        })
      );
      setProfileMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Falha ao atualizar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordMessage('A password deve ter pelo menos 8 caracteres.');
      setIsSavingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('A confirmação não coincide com a nova password.');
      setIsSavingPassword(false);
      return;
    }

    const token = localStorage.getItem('airfa_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/members/me/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível alterar a password.');
      }

      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password atualizada com sucesso.');
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Falha ao alterar password.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <AuthenticatedShell title="Sobre mim" subtitle="Dados pessoais e segurança da conta.">
      <section className="profile-shell">
        <article className="panel">
          <h1>Sobre mim</h1>
          <p className="muted">Atualize os seus dados pessoais. O email e o papel do sistema não são editáveis aqui.</p>

          <div className="identity">
            <span>{me?.email ?? '...'}</span>
            <strong>{me?.system_role ?? '...'}</strong>
          </div>

          <form className="form" onSubmit={handleSaveProfile}>
            <label>
              Nome
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
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

            {profileMessage ? <p className="hint">{profileMessage}</p> : null}

            <button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'A guardar...' : 'Guardar perfil'}
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Alterar password</h2>
          <p className="muted">Por segurança, use pelo menos 8 caracteres.</p>

          <form className="form" onSubmit={handleChangePassword}>
            <label>
              Nova password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>

            <label>
              Confirmar nova password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            {passwordMessage ? <p className="hint">{passwordMessage}</p> : null}

            <button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? 'A atualizar...' : 'Atualizar password'}
            </button>
          </form>
        </article>
      </section>

      <style jsx>{`
        .profile-shell {
          display: grid;
          gap: 20px;
          grid-template-columns: 1fr 1fr;
        }

        .panel {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          display: grid;
          gap: 14px;
        }

        .identity {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
          color: var(--muted);
        }

        .form {
          display: grid;
          gap: 12px;
        }

        label {
          display: grid;
          gap: 8px;
          color: var(--text);
        }

        .hint {
          margin: 0;
          color: var(--muted);
        }

        .muted {
          color: var(--muted);
          margin: 0;
        }

        button {
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 980px) {
          .profile-shell {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AuthenticatedShell>
  );
}
