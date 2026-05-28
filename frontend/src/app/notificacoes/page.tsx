"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { authFetch } from '@/lib/authFetch';
import { API_URL } from '@/lib/config';
import { useEffect, useState } from 'react';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type?: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  EVENT: 'badge-event',
  NEWSLETTER: 'badge-newsletter',
  BIRTHDAY: 'badge-birthday',
  REPORT: 'badge-report',
};

const TYPE_LABEL: Record<string, string> = {
  EVENT: 'Evento',
  NEWSLETTER: 'Newsletter',
  BIRTHDAY: 'Aniversário',
  REPORT: 'Relatório',
};

function formatDay(iso: string): number { return new Date(iso).getDate(); }
function formatMonth(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { month: 'short' }).toUpperCase();
}
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
    const res = await authFetch(`${API_URL}/api/v1/notifications`);
    const data = await res.json();
    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function markRead(id: number) {
    await authFetch(`${API_URL}/api/v1/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new CustomEvent('notif-read'));
  }

  async function markAllRead() {
    await authFetch(`${API_URL}/api/v1/notifications/read-all`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new CustomEvent('notif-read'));
  }

  useEffect(() => { loadNotifications().catch(() => setLoading(false)); }, []);

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <AuthenticatedShell title="Notificações">
      <div className="page">
        <div className="toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="section-label-mono">Todas as notificações</span>
            {unread > 0 && <span className="badge badge-musical">{unread} por ler</span>}
          </div>
          {unread > 0 && (
            <button type="button" className="action-btn" onClick={markAllRead}>Marcar todas como lidas</button>
          )}
        </div>

        {loading ? (
          <div className="empty">A carregar…</div>
        ) : notifications.length === 0 ? (
          <div className="empty">Sem notificações.</div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => (
              <article
                key={n.id}
                className={`notif-card${n.is_read ? '' : ' unread'}`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className="date-block">
                  <span className="date-day">{formatDay(n.created_at)}</span>
                  <span className="date-mon">{formatMonth(n.created_at)}</span>
                </div>
                <div className="notif-body">
                  <div className="notif-header">
                    <span className="notif-title">{n.message}</span>
                    {n.notification_type && (
                      <span className={`badge ${TYPE_BADGE[n.notification_type] ?? ''}`}>
                        {TYPE_LABEL[n.notification_type] ?? n.notification_type}
                      </span>
                    )}
                  </div>
                  <div className="notif-meta">
                    <span>{relativeTime(n.created_at)}</span>
                    {!n.is_read && <span className="unread-dot">● não lida</span>}
                  </div>
                </div>
              </article>
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

        .empty {
          text-align: center;
          padding: 48px;
          color: var(--muted);
          font-style: italic;
          font-size: 14px;
        }

        .action-btn {
          padding: 5px 12px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }
        .action-btn:hover { background: var(--surface-3); border-color: var(--border-strong); color: var(--text); }

        .notif-list { display: flex; flex-direction: column; gap: 1px; }

        .notif-card {
          display: flex;
          align-items: stretch;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.12s;
          cursor: default;
        }
        .notif-card:hover { border-color: var(--border-strong); }
        .notif-card.unread {
          border-left: 3px solid var(--accent);
          cursor: pointer;
        }
        .notif-card.unread:hover { border-color: var(--accent); }

        .date-block {
          flex-shrink: 0;
          width: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--surface-2);
          border-right: 1px solid var(--border);
          padding: 16px 8px;
          gap: 2px;
        }

        .date-day {
          font-family: var(--font-display, serif);
          font-size: 26px;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }

        .date-mon {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .notif-body {
          flex: 1;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .notif-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .notif-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          flex: 1;
          min-width: 0;
          line-height: 1.4;
        }

        .notif-meta {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: var(--muted);
          display: flex;
          gap: 10px;
        }

        .unread-dot {
          color: var(--accent-2);
        }
      `}</style>
    </AuthenticatedShell>
  );
}

