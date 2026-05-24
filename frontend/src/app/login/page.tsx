"use client";

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Username ou password inválidos.');
      const data = await response.json();
      localStorage.setItem('airfa_token', data.access_token);
      localStorage.setItem('airfa_user', JSON.stringify(data.user));
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-card">
        {/* Left decorative panel */}
        <div className="login-left" aria-hidden="true">
          <div className="staff-lines">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="staff-line" />)}
          </div>
          <div className="left-content">
            <p className="left-title">Banda Filarmónica<br />de Airfa</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-right">
          <div className="brand-mark">A</div>
          <h1 className="form-title">Iniciar sessão</h1>

          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="O teu username"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="A tua password"
              />
            </label>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="spinner" />
              ) : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg);
        }

        .login-card {
          width: min(100%, 820px);
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px var(--border);
        }

        /* Left panel */
        .login-left {
          position: relative;
          background: var(--surface-2);
          display: flex;
          align-items: flex-end;
          padding: 40px;
          overflow: hidden;
          min-height: 400px;
        }

        .staff-lines {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 20px;
          gap: 20px;
        }

        .staff-line {
          height: 1px;
          background: var(--text);
          opacity: 0.06;
        }

        .left-content {
          position: relative;
          z-index: 2;
        }

        .left-est {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 10px;
        }

        .left-title {
          font-family: var(--font-display, serif);
          font-size: 32px;
          line-height: 1.15;
          font-style: italic;
          color: var(--text);
          margin: 0;
          font-weight: 500;
        }

        /* Right panel */
        .login-right {
          background: var(--surface);
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: var(--accent);
          color: #0B0A08;
          font-family: var(--font-display, serif);
          font-size: 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          font-style: italic;
        }

        .form-title {
          font-family: var(--font-display, serif);
          font-size: 28px;
          font-weight: 600;
          margin: 0 0 6px;
          color: var(--text);
        }

        .form-subtitle {
          font-size: 13px;
          color: var(--muted);
          margin: 0 0 28px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
        }

        .error-msg {
          font-size: 13px;
          color: var(--danger);
          background: var(--danger-dim);
          border: 1px solid rgba(194,78,66,0.3);
          border-radius: 6px;
          padding: 8px 12px;
          margin: 0;
        }

        .submit-btn {
          margin-top: 4px;
          padding: 12px;
          border: none;
          border-radius: 7px;
          background: var(--accent);
          color: #0B0A08;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
        }
        .submit-btn:hover:not(:disabled) { background: var(--accent-2); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #0B0A08;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 640px) {
          .login-card { grid-template-columns: 1fr; }
          .login-left { display: none; }
          .login-right { padding: 36px 28px; align-items: flex-start; }
        }
      `}</style>
    </main>
  );
}
