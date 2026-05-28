"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import { MUSICAL_ROLE_LABEL, SYSTEM_BADGE, SYSTEM_ROLE_LABEL } from '@/lib/format';
import type { MemberItem } from '@/lib/types';
import { getStoredUser, isSuperAdmin as checkIsSuperAdmin } from '@/lib/user';
import { useEffect, useState } from 'react';

type CreateForm = {
  username: string;
  name: string;
  password: string;
  phone: string;
  birth_date: string;
  address: string;
  join_year: string;
  system_role: string;
  musical_role: string;
};

type EditForm = {
  username: string;
  name: string;
  password: string;
  phone: string;
  birth_date: string;
  address: string;
  join_year: string;
  system_role: string;
  musical_role: string;
};

const EMPTY_FORM: CreateForm = { username: '', name: '', password: '', phone: '', birth_date: '', address: '', join_year: '', system_role: 'MEMBER', musical_role: '' };

export default function MembrosPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);
  const [filterNaipe, setFilterNaipe] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  async function loadMembers() {
    const res = await authFetch(`${API_URL}/api/v1/members/`);
    const data = await res.json();
    setMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers().catch(() => setLoading(false));
    setIsSuperAdmin(checkIsSuperAdmin(getStoredUser()));
  }, []);

  async function createMember() {
    const payload = {
      username: createForm.username,
      name: createForm.name,
      password: createForm.password,
      phone: createForm.phone || null,
      birth_date: createForm.birth_date || null,
      address: createForm.address || null,
      join_year: createForm.join_year ? parseInt(createForm.join_year) : null,
      system_role: createForm.system_role,
      musical_role: createForm.musical_role || null,
    };
    await authFetch(`${API_URL}/api/v1/members/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setIsCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    await loadMembers();
  }

  async function saveMember() {
    if (!editingMember) return;
    const payload: Record<string, unknown> = {
      name: editForm.name,
      phone: editForm.phone || null,
      birth_date: editForm.birth_date || null,
      address: editForm.address || null,
      join_year: editForm.join_year ? parseInt(editForm.join_year) : null,
      system_role: editForm.system_role,
      musical_role: editForm.musical_role || null,
    };
    if (editForm.username) payload.username = editForm.username;
    if (editForm.password) payload.password = editForm.password;
    await authFetch(`${API_URL}/api/v1/members/${editingMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setEditingMember(null);
    await loadMembers();
  }

  async function deleteMember(id: number) {
    await authFetch(`${API_URL}/api/v1/members/${id}`, { method: 'DELETE' });
    await loadMembers();
  }

  function openEdit(m: MemberItem) {
    setEditingMember(m);
    setEditForm({ username: m.username, name: m.name, password: '', phone: m.phone ?? '', birth_date: m.birth_date ? m.birth_date.slice(0, 10) : '', address: m.address ?? '', join_year: m.join_year ? String(m.join_year) : '', system_role: m.system_role, musical_role: m.musical_role ?? '' });
  }

  const availableNaipes = Array.from(new Set(members.map(m => m.musical_role ?? ''))).filter(Boolean).sort();
  const displayed = members
    .filter(m => !filterNaipe || m.musical_role === filterNaipe)
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <AuthenticatedShell title="Membros">
      <div className="page">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="filters">
            <input
              type="search"
              className="search-input"
              placeholder="Pesquisar membro…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-pills">
              <button type="button" className={`fpill${filterNaipe === null ? ' active' : ''}`} onClick={() => setFilterNaipe(null)}>Todos</button>
              {availableNaipes.map(n => (
                <button key={n} type="button" className={`fpill${filterNaipe === n ? ' active' : ''}`} onClick={() => setFilterNaipe(v => v === n ? null : n)}>
                  {MUSICAL_ROLE_LABEL[n] ?? n}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)}>+ Novo membro</button>
        </div>

        {/* Count */}
        <div className="count-row">
          <span className="section-label-mono">
            {displayed.length} {displayed.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        {loading ? (
          <div className="loading">A carregar…</div>
        ) : displayed.length === 0 ? (
          <div className="empty">Sem membros encontrados.</div>
        ) : (
          <div className="grid">
            {displayed.map(m => {
              const initials = m.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
              return (
                <div key={m.id} className="member-card">
                  <div className="member-top">
                    <div className="mini-avatar">{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="member-name">{m.name}</div>
                      <div className="member-username">@{m.username}</div>
                    </div>
                    <div className="member-badge-col">
                      <span className={`badge ${SYSTEM_BADGE[m.system_role] ?? 'badge-musical'}`}>{SYSTEM_ROLE_LABEL[m.system_role] ?? m.system_role}</span>
                    </div>
                  </div>
                  {m.musical_role && <div className="member-naipe">{MUSICAL_ROLE_LABEL[m.musical_role] ?? m.musical_role}</div>}
                  <div className="member-meta">
                    {m.phone && <span>{m.phone}</span>}
                    {m.join_year && <span>desde {m.join_year}</span>}
                  </div>
                  <div className="member-actions">
                    <button type="button" className="action-btn" onClick={() => openEdit(m)}>Editar</button>
                    {isSuperAdmin && <button type="button" className="action-btn danger" onClick={() => setConfirmDeleteId(m.id)}>Remover</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create modal */}
        {isCreateOpen && (
          <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
            <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">Novo membro</h2>
                <button type="button" className="mc" onClick={() => setIsCreateOpen(false)}>✕</button>
              </div>
              <MemberFormFields form={createForm} onChange={f => setCreateForm(f as CreateForm)} showPassword />
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={createMember}>Criar</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingMember && (
          <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
            <div className="modal" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="mh">
                <h2 className="mt">Editar membro</h2>
                <button type="button" className="mc" onClick={() => setEditingMember(null)}>✕</button>
              </div>
              <MemberFormFields form={editForm} onChange={f => setEditForm(f as EditForm)} showPassword />
              <div className="mf">
                <button type="button" className="btn-secondary" onClick={() => setEditingMember(null)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={saveMember}>Guardar</button>
              </div>
            </div>
          </div>
        )}
        {confirmDeleteId !== null && (
          <ConfirmDialog
            message="Tens a certeza que pretendes remover este membro?"
            confirmLabel="Remover"
            onConfirm={() => { deleteMember(confirmDeleteId); setConfirmDeleteId(null); }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 16px; }

        .toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

        .filters { display: flex; flex-direction: column; gap: 8px; flex: 1; max-width: 700px; }

        .search-input {
          padding: 8px 12px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-size: 13px;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--accent); }
        .search-input::placeholder { color: var(--muted); }

        .filter-pills { display: flex; gap: 4px; flex-wrap: wrap; }
        .fpill { padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 12px; cursor: pointer; transition: all 0.12s; }
        .fpill:hover { background: var(--surface-2); color: var(--text-2); }
        .fpill.active { background: var(--accent-dim); color: var(--accent-2); border-color: var(--accent); }

        .count-row { display: flex; align-items: center; gap: 8px; }
        .section-label-mono { font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

        .loading, .empty { color: var(--muted); font-style: italic; text-align: center; padding: 48px; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }

        .member-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.12s;
        }
        .member-card:hover { border-color: var(--border-strong); }

        .member-top { display: flex; align-items: flex-start; gap: 10px; }

        .mini-avatar {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: var(--accent-dim);
          border: 1px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display, serif);
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
          flex-shrink: 0;
        }

        .member-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .member-username { font-family: var(--font-mono, monospace); font-size: 11px; color: var(--muted); }

        .member-badge-col { flex-shrink: 0; }

        .member-naipe { font-size: 12px; color: var(--text-2); }

        .member-meta { display: flex; gap: 8px; font-size: 11px; color: var(--muted); flex-wrap: wrap; font-family: var(--font-mono, monospace); }

        .member-actions { display: flex; gap: 6px; margin-top: 4px; }

        .action-btn { padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--text-2); font-size: 12px; cursor: pointer; transition: all 0.12s; }
        .action-btn:hover { background: var(--surface-2); }
        .action-btn.danger { color: var(--danger); border-color: rgba(194,78,66,0.3); }
        .action-btn.danger:hover { background: var(--danger-dim); }

        /* Modal */
        .mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mt { font-family: var(--font-display, serif); font-size: 22px; font-weight: 600; margin: 0; }
        .mc { width: 30px; height: 30px; border-radius: 5px; border: 1px solid var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0; }
        .mc:hover { border-color: var(--danger); color: var(--danger); }
        .mf { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border); padding-top: 16px; margin-top: 8px; }

        .btn-primary { padding: 8px 16px; border-radius: 6px; border: none; background: var(--accent); color: var(--accent-fg); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn-primary:hover { background: var(--accent-2); }
        .btn-secondary { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border-strong); background: transparent; color: var(--text-2); font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: var(--surface-3); }
      `}</style>
    </AuthenticatedShell>
  );
}

// ─── Shared form fields component ────────────────────────────────────────────
type FormFieldsProps = {
  form: CreateForm;
  onChange: (form: CreateForm) => void;
  showPassword?: boolean;
};

function MemberFormFields({ form, onChange, showPassword }: FormFieldsProps) {
  const MUSICAL_ROLES = [
    '', 'MAESTRO', 'FLUTE_PLAYER', 'CLARINET_PLAYER', 'SAXOPHONE_PLAYER',
    'TROMBONE_PLAYER', 'EUPHONIUM_PLAYER', 'TUBA_PLAYER', 'FRENCH_HORN_PLAYER',
    'TRUMPET_PLAYER', 'PERCUSSION_PLAYER',
  ];
  const MUSICAL_ROLE_LABEL: Record<string, string> = {
    MAESTRO: 'Maestro', FLUTE_PLAYER: 'Flauta', CLARINET_PLAYER: 'Clarinete',
    SAXOPHONE_PLAYER: 'Saxofone', TROMBONE_PLAYER: 'Trombone', EUPHONIUM_PLAYER: 'Eufônio',
    TUBA_PLAYER: 'Tuba', FRENCH_HORN_PLAYER: 'Trompa', TRUMPET_PLAYER: 'Trompete',
    PERCUSSION_PLAYER: 'Percussão',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
      {[
        { label: 'Username', key: 'username', type: 'text', placeholder: 'username' },
        { label: 'Nome completo', key: 'name', type: 'text', placeholder: 'Nome' },
        ...(showPassword ? [{ label: 'Password', key: 'password', type: 'password', placeholder: 'Mínimo 12 caracteres' }] : []),
        { label: 'Telefone', key: 'phone', type: 'text', placeholder: '+351…' },
        { label: 'Data de nascimento', key: 'birth_date', type: 'date', placeholder: '' },
        { label: 'Ano de entrada', key: 'join_year', type: 'number', placeholder: 'Ex: 2010' },
        { label: 'Morada', key: 'address', type: 'text', placeholder: 'Morada' },
      ].map(f => (
        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
          {f.label}
          <input
            type={f.type}
            value={(form as Record<string, string>)[f.key] ?? ''}
            onChange={e => onChange({ ...form, [f.key]: e.target.value })}
            placeholder={f.placeholder}
          />
        </label>
      ))}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
        Função musical
        <select value={form.musical_role} onChange={e => onChange({ ...form, musical_role: e.target.value })}>
          <option value="">Sem função musical</option>
          {MUSICAL_ROLES.filter(Boolean).map(r => <option key={r} value={r}>{MUSICAL_ROLE_LABEL[r] ?? r}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
        Função no sistema
        <select value={form.system_role} onChange={e => onChange({ ...form, system_role: e.target.value })}>
          <option value="MEMBER">Membro</option>
          <option value="ADMIN">Administrador</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </label>
    </div>
  );
}
