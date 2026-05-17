"use client";

import AuthenticatedShell from '@/components/AuthenticatedShell';
import { useEffect, useState } from 'react';

type NotificationItem = {
  id: number;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    fetch(`${apiUrl}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  async function markAsRead(notificationId: number) {
    const token = localStorage.getItem('airfa_token');
    if (!token) {
      return;
    }

    await fetch(`${apiUrl}/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    );
  }

  return (
    <AuthenticatedShell title="Notificações" subtitle="Centro de notificações in-app da banda.">
      <section className="section">
        <div className="section-header">
          <h1>Notificações</h1>
        </div>

        <div className="grid">
          {notifications.length ? (
            notifications.map((notification) => (
              <article key={notification.id} className={`card ${notification.read ? 'read' : ''}`}>
                <span className="badge">{notification.type}</span>
                <h2>{notification.content}</h2>
                <p>{new Date(notification.created_at).toLocaleString('pt-PT')}</p>
                {!notification.read ? (
                  <button type="button" onClick={() => markAsRead(notification.id)}>
                    Marcar como lida
                  </button>
                ) : (
                  <span className="read-label">Lida</span>
                )}
              </article>
            ))
          ) : (
            <p className="muted">Sem notificações para mostrar.</p>
          )}
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

        .grid {
          display: grid;
          gap: 16px;
        }

        .card {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--panel-soft);
        }

        .card.read {
          opacity: 0.72;
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
        .muted {
          color: var(--muted);
          margin: 0;
        }

        button {
          width: fit-content;
          border: 0;
          border-radius: 14px;
          padding: 12px 16px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
        }

        .read-label {
          color: var(--success);
          font-weight: 700;
        }
      `}</style>
    </AuthenticatedShell>
  );
}
