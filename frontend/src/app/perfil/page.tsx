"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { useEffect, useState } from 'react';

type UserProfile = {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  address?: string | null;
  system_role: string;
  musical_role?: string | null;
};

type ProfileForm = {
  name: string;
  phone: string;
  birth_date: string;
  address: string;
};

type PwForm = { current_password: string; new_password: string; confirm_password: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const SYSTEM_ROLE_LABEL: Record<string, string> = { MEMBER: 'Membro', ADMIN: 'Administrador', SUPER_ADMIN: 'Super Admin' };
const MUSICAL_ROLE_LABEL: Record<string, string> = {
  MAESTRO: 'Maestro', FLUTE_PLAYER: 'Flauta', CLARINET_PLAYER: 'Clarinete',
  SAXOPHONE_PLAYER: 'Saxofone', TROMBONE_PLAYER: 'Trombone', EUPHONIUM_PLAYER: 'Eufônio',
  TUBA_PLAYER: 'Tuba', FRENCH_HORN_PLAYER: 'Trompa', TRUMPET_PLAYER: 'Trompete',
  PERCUSSION_PLAYER: 'Percussão',
};

const SYSTEM_BADGE: Record<string, string> = { MEMBER: 'badge-musical', ADMIN: 'badge-admin', SUPER_ADMIN: 'badge-super' };

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ name: '', phone: '', birth_date: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pwForm, setPwForm] = useState<PwForm>({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function loadProfile() {
    const res = await authFetch(`${apiUrl}/api/v1/members/me`);
    const data: UserProfile = await res.json();
    setProfile(data);
    setForm({ name: data.name, phone: data.phone ?? '', birth_date: data.birth_date ? data.birth_date.slice(0, 10) : '', address: data.address ?? '' });
    setLoading(false);
  }

  useEffect(() => { loadProfile().catch(() => setLoading(false)); }, []);

  async function saveProfile() {
    setSaving(true);
    setSaveMsg(null);
    const payload = { name: form.name, phone: form.phone || null, birth_date: form.birth_date || null, address: form.address || null };
    const res = await authFetch(`${apiUrl}/api/v1/members/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated: UserProfile = await res.json();
      setProfile(updated);
      setSaveMsg('Perfil atualizado com sucesso.');
      setEditMode(false);
    } else {
      setSaveMsg('Erro ao guardar.');
    }
    setSaving(false);
  }

  async function changePassword() {
    setPwError(null);
    setPwSuccess(false);
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('As passwords não coincidem.'); return; }
    if (pwForm.new_password.length < 12) { setPwError('A nova password deve ter pelo menos 12 caracteres.'); return; }
    const res = await authFetch(`${apiUrl}/api/v1/members/me/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
    });
    if (res.ok) { setPwSuccess(true); setPwForm({ current_password: '', new_password: '', confirm_password: '' }); }
    else { const d = await res.json(); setPwError(d.detail ?? 'Erro ao alterar a password.'); }
  }

  const initials = profile?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '??';

  return (
    <AuthenticatedShell title="Perfil">
      {loading ? (
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, letterSpacing: '0.08em', padding: '60px 0', textAlign: 'center' }}>A carregar…</div>
      ) : profile && (
        <div className="page">
          {/* Profile card */}
          <div className="card">
            <div className="card-head">
              <div className="avatar">{initials}</div>
              <div className="identity">
                <h2 className="name">{profile.name}</h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <span className={`badge ${SYSTEM_BADGE[profile.system_role] ?? 'badge-musical'}`}>{SYSTEM_ROLE_LABEL[profile.system_role] ?? profile.system_role}</span>
                  {profile.musical_role && <span className="badge badge-musical">{MUSICAL_ROLE_LABEL[profile.musical_role] ?? profile.musical_role}</span>}
                </div>
                <span className="username">@{profile.username}</span>
              </div>
            </div>

            {!editMode ? (
              <>
                <div className="fields-grid">
                  {profile.email && <div className="field-row"><span className="fl">Email</span><span className="fv">{profile.email}</span></div>}
                  {profile.phone && <div className="field-row"><span className="fl">Telefone</span><span className="fv">{profile.phone}</span></div>}
                  {profile.birth_date && <div className="field-row"><span className="fl">Data de nascimento</span><span className="fv">{new Date(profile.birth_date).toLocaleDateString('pt-PT')}</span></div>}
                  {profile.address && <div className="field-row"><span className="fl">Morada</span><span className="fv">{profile.address}</span></div>}
                </div>
                {saveMsg && <div className="save-msg ok">{saveMsg}</div>}
                <div className="card-footer">
                  <button type="button" className="btn-primary" onClick={() => { setEditMode(true); setSaveMsg(null); }}>Editar perfil</button>
                </div>
              </>
            ) : (
              <>
                <div className="form-grid">
                  <label className="field">
                    Nome
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="field">
                    Telefone
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Número de telefone" />
                  </label>
                  <label className="field">
                    Data de nascimento
                    <input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                  </label>
                  <label className="field">
                    Morada
                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Morada" />
                  </label>
                </div>
                {saveMsg && <div className={`save-msg${saveMsg.includes('Erro') ? ' err' : ' ok'}`}>{saveMsg}</div>}
                <div className="card-footer">
                  <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>Cancelar</button>
                  <button type="button" className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'A guardar…' : 'Guardar'}</button>
                </div>
              </>
            )}
          </div>

          {/* Password card */}
          <div className="card">
            <h3 className="section-heading">Alterar password</h3>
            <div className="form-grid">
              <label className="field span-2">
                Password atual
                <input type="password" value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} placeholder="Password atual" />
              </label>
              <label className="field">
                Nova password
                <input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} placeholder="Mínimo 12 caracteres" />
              </label>
              <label className="field">
                Confirmar nova password
                <input type="password" value={pwForm.confirm_password} onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })} placeholder="Repetir nova password" />
              </label>
            </div>
            {pwError && <div className="save-msg err">{pwError}</div>}
            {pwSuccess && <div className="save-msg ok">Password alterada com sucesso.</div>}
            <div className="card-footer">
              <button type="button" className="btn-primary" onClick={changePassword}>Alterar password</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 20px; max-width: 640px; }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card-head {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 14px;
          background: var(--accent-dim);
          border: 1px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display, serif);
          font-size: 22px;
          font-weight: 700;
          color: var(--accent);
          flex-shrink: 0;
          letter-spacing: -0.02em;
        }

        .identity { display: flex; flex-direction: column; gap: 4px; padding-top: 2px; }

        .name {
          font-family: var(--font-display, serif);
          font-size: 22px;
          font-weight: 600;
          margin: 0;
          color: var(--text);
          line-height: 1.2;
        }

        .username {
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          color: var(--muted);
          margin-top: 4px;
        }

        .fields-grid { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid var(--border); padding-top: 4px; }

        .field-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        .field-row:last-child { border-bottom: none; }

        .fl { font-size: 12px; color: var(--muted); font-weight: 500; flex-shrink: 0; min-width: 140px; }
        .fv { font-size: 14px; color: var(--text); }

        .section-heading {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 500; color: var(--text-2); }
        .span-2 { grid-column: span 2; }

        .card-footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 4px; }

        .save-msg { font-size: 13px; padding: 8px 12px; border-radius: 6px; }
        .save-msg.ok { background: var(--success-dim); color: var(--success); border: 1px solid rgba(78,152,104,0.3); }
        .save-msg.err { background: var(--danger-dim); color: var(--danger); border: 1px solid rgba(194,78,66,0.3); }

        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: #0B0A08; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover:not(:disabled) { background: var(--accent-2); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
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
