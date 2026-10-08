import { useEffect, useState } from "react";
import { WaouhExternalExchange } from "@/components/waouh/WaouhExternalExchange";
export default function WaouhGuestExchangePage() {
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-slate-50 p-3 sm:p-6">
      <header className="mb-4">
        <p className="text-xs font-semibold text-cyan-700">
          WAOUH · Discussion invitée
        </p>
        <h1 className="mt-1 text-xl font-bold">
          Échangez sans installer l’application
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          Consultez l’offre, posez vos questions et confirmez vos conditions.
        </p>
      </header>
      {/^[a-f0-9]{64}$/.test(token) ? (
        <WaouhExternalExchange access={{ token }} />
      ) : (
        <p role="alert" className="rounded-xl border bg-white p-4 text-sm">
          Lien incomplet. Demandez un nouveau lien à votre interlocuteur.
        </p>
      )}
    </main>
  );
}
