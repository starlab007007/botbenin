import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');

const renderBootError = (error: unknown) => {
  console.error('[Bot.BJ] Application startup failed:', error);
  if (!rootElement) return;
  rootElement.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
      <section style="width:min(100%,680px);text-align:center;">
        <img src="/bot-bj-logo.png" alt="Bot.BJ" width="72" height="72" style="width:72px;height:72px;object-fit:contain;margin-bottom:18px;" />
        <h1 style="font-size:clamp(28px,6vw,48px);line-height:1.05;margin:0 0 14px;">Bot.BJ</h1>
        <p style="font-size:18px;line-height:1.6;margin:0 auto 22px;max-width:560px;color:#334155;">
          Le chargement de l’application interactive a échoué. Cela arrive souvent quand le navigateur garde une ancienne version des fichiers JavaScript.
        </p>
        <button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:8px;background:#2563eb;color:white;font-weight:700;cursor:pointer;">
          Recharger la page
        </button>
      </section>
    </main>
  `;
};

if (rootElement) {
  import('./App.tsx')
    .then(({ default: App }) => {
      createRoot(rootElement).render(<App />);
    })
    .catch(renderBootError);
}
