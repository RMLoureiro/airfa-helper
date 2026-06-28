'use client';

import { useEffect, useState } from 'react';

// Chrome/Android fires this before showing the native install prompt.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'airfa_install_dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac but is touch-capable.
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document;
  return iOSDevice || iPadOS;
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPad|iPhone|iPod|Mobile/i.test(navigator.userAgent) || isIOS();
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [ios, setIos] = useState(false);

  // Register the service worker (required for installability).
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (!isMobile()) return; // desktop — no download button
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the mini-infobar; we drive the prompt ourselves
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => setVisible(false);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt — surface the button anyway
    // and explain the manual "Add to Home Screen" flow.
    if (isIOS()) {
      setIos(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (ios) {
      setShowIOSHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // The prompt can only be used once; close the bar whatever the user chose.
    // If they dismissed, don't nag again this session.
    setDeferredPrompt(null);
    setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    setShowIOSHelp(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className="install-bar" role="dialog" aria-label="Instalar aplicação">
        <span className="install-icon" aria-hidden="true">⤓</span>
        <span className="install-text">
          Instala a app da Airfa no teu telemóvel
        </span>
        <button type="button" className="install-btn" onClick={handleInstall}>
          {ios ? 'Como instalar' : 'Instalar'}
        </button>
        <button
          type="button"
          className="install-close"
          aria-label="Dispensar"
          onClick={dismiss}
        >
          ×
        </button>
      </div>

      {showIOSHelp && (
        <div className="ios-overlay" role="dialog" aria-modal="true" onClick={() => setShowIOSHelp(false)}>
          <div className="ios-sheet" onClick={e => e.stopPropagation()}>
            <h2 className="ios-title">Instalar no iPhone / iPad</h2>
            <ol className="ios-steps">
              <li>
                Toca no botão <strong>Partilhar</strong>
                <svg className="share-glyph" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v12M12 3l-4 4M12 3l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                na barra do Safari.
              </li>
              <li>Escolhe <strong>“Adicionar ao ecrã principal”</strong>.</li>
              <li>Confirma em <strong>“Adicionar”</strong>.</li>
            </ol>
            <button type="button" className="ios-ok" onClick={() => setShowIOSHelp(false)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .install-bar {
          position: fixed;
          left: 50%;
          bottom: max(16px, env(safe-area-inset-bottom));
          transform: translateX(-50%);
          z-index: 2100;
          display: flex;
          align-items: center;
          gap: 12px;
          width: min(94vw, 460px);
          padding: 12px 14px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border-strong);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(8px);
          animation: bar-in 0.2s ease-out;
        }
        .install-icon {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--accent-dim);
          color: var(--accent-2);
          font-size: 18px;
          font-weight: 700;
        }
        .install-text {
          flex: 1 1 auto;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.3;
          color: var(--text);
        }
        .install-btn {
          flex: 0 0 auto;
          border: none;
          border-radius: 8px;
          padding: 9px 14px;
          background: var(--accent);
          color: var(--accent-fg);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .install-btn:hover {
          background: var(--accent-2);
        }
        .install-close {
          flex: 0 0 auto;
          border: none;
          background: transparent;
          color: var(--muted);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 0 2px;
        }
        .install-close:hover {
          color: var(--text);
        }

        .ios-overlay {
          position: fixed;
          inset: 0;
          z-index: 2200;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          padding: 16px;
          animation: fade-in 0.18s ease-out;
        }
        .ios-sheet {
          width: min(100%, 440px);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 22px 22px calc(22px + env(safe-area-inset-bottom));
          box-shadow: var(--shadow-lg);
          animation: sheet-in 0.22s ease-out;
        }
        .ios-title {
          font-family: var(--font-display, sans-serif);
          font-size: 19px;
          font-weight: 700;
          margin: 0 0 14px;
          color: var(--text);
        }
        .ios-steps {
          margin: 0 0 18px;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          color: var(--text-2);
          line-height: 1.45;
        }
        .share-glyph {
          display: inline-block;
          width: 16px;
          height: 16px;
          vertical-align: -3px;
          margin: 0 3px;
          color: var(--accent-2);
        }
        .ios-ok {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 12px;
          background: var(--accent);
          color: var(--accent-fg);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        @keyframes bar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheet-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
