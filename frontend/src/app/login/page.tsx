"use client";

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@airfa.pt');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Email ou password inválidos.');
      }

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
      <section className="login-card">
        <div className="login-brand">
          <span className="eyebrow">banda airfa</span>
          <h1>Gestão banda filarmónica</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .login-shell {
          display: grid;
          place-items: center;
          padding: 32px;
        }

        .login-card {
          width: min(100%, 980px);
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 28px;
          padding: 28px;
          background: rgba(22, 27, 34, 0.84);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
        }

        .login-brand {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 16px;
        }

        .eyebrow {
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 12px;
          margin-bottom: 12px;
        }

        h1 {
          font-size: clamp(2.4rem, 5vw, 4.8rem);
          line-height: 0.95;
          margin: 0 0 16px;
          max-width: 10ch;
        }

        p {
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.6;
          margin: 0;
          max-width: 54ch;
        }

        .login-form {
          display: grid;
          gap: 16px;
          align-content: center;
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: calc(var(--radius) - 4px);
        }

        label {
          display: grid;
          gap: 8px;
          font-size: 0.95rem;
          color: var(--text);
        }

        button {
          margin-top: 4px;
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: #08111f;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.8;
          cursor: progress;
        }

        .error {
          color: var(--danger);
          margin: 0;
        }

        @media (max-width: 860px) {
          .login-card {
            grid-template-columns: 1fr;
          }

          h1 {
            max-width: none;
          }
        }
      `}</style>
    </main>
  );
}
