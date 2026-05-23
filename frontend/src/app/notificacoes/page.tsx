"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { useEffect, useState } from 'react';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type?: string | null;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d !== 1 ? 's' : ''}`;
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    const res = await authFetch(`${apiUrl}/api/v1/notifications`);
    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function markRead(id: number) {
    await authFetch(`${apiUrl}/api/v1/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await authFetch(`${apiUrl}/api/v1/notifications/read-all`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  useEffect(() => { loadNotifications().catch(() => setLoading(false)); }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <AuthenticatedShell title="Notificações">
      <div className="page">
        <div className="toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="section-label-mono">Todas as notificações</span>
            {unread > 0 && <span className="unread-badge">{unread} por ler</span>}
          </div>
          {unread > 0 && (
            <button type="button" className="mark-all-btn" onClick={markAllRead}>Marcar todas como lidas</button>
          )}
        </div>

        {loading ? (
          <div className="loading">A carregar…</div>
        ) : notifications.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p>Sem notificações.</p>
          </div>
        ) : (
          <div className="list">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item${n.is_read ? '' : ' unread'}`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className="notif-indicator" />
                <div className="notif-body">
                  <div className="notif-top">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-time">{relativeTime(n.created_at)}</span>
                  </div>
                  <p className="notif-msg">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .section-label-mono {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .unread-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          background: var(--accent-dim);
          color: var(--accent-2);
          border: 1px solid var(--accent);
          font-family: var(--font-mono, monospace);
          font-weight: 600;
        }

        .mark-all-btn {
          padding: 6px 12px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .mark-all-btn:hover { background: var(--surface-2); color: var(--text-2); }

        .loading, .empty {
          color: var(--muted);
          font-style: italic;
          text-align: center;
          padding: 48px;
          font-size: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .list { display: flex; flex-direction: column; gap: 2px; }

        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: default;
          transition: border-color 0.12s;
        }
        .notif-item.unread {
          background: var(--surface-2);
          border-left: 3px solid var(--accent);
          cursor: pointer;
        }
        .notif-item.unread:hover { border-color: var(--accent); background: var(--surface-3); }

        .notif-indicator {
          margin-top: 6px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          background: transparent;
          transition: background 0.15s;
        }
        .notif-item.unread .notif-indicator { background: var(--accent); }

        .notif-body { flex: 1; min-width: 0; }

        .notif-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }

        .notif-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }

        .notif-time {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--muted);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notif-msg {
          font-size: 13px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </AuthenticatedShell>
  );
}
