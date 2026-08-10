import { ArrowUpRight, Download, FileLock2, ShieldCheck, WifiOff } from "lucide-react";

const WINDOWS_DOWNLOAD = "/privatia/downloads/PrivatAI-Windows-x64-Setup.exe";
const MAC_DOWNLOAD = "/privatia/downloads/PrivatAI-Mac-Intel.dmg";

function WindowsMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M2.4 4.3 10.8 3v8.1H2.4V4.3Zm9.5-1.5L21.6 1.4v9.7h-9.7V2.8ZM2.4 12.2h8.4v8.1l-8.4-1.2v-6.9Zm9.5 0h9.7v9.7l-9.7-1.4v-8.3Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M18.7 19.5c-.8 1.2-1.7 2.5-3 2.5s-1.7-.8-3.2-.8-2 .8-3.2.8c-1.3.1-2.3-1.3-3.1-2.6-1.7-2.5-3-7-1.3-10.1.9-1.5 2.5-2.5 4.2-2.5 1.3 0 2.5.9 3.2.9.7 0 2.1-1.1 3.6-.9.6 0 2.3.2 3.4 1.8-.1.1-2 1.2-2 3.6 0 2.9 2.5 3.8 2.5 3.9 0 .1-.4 1.4-1.1 2.4ZM13.7 5.7c.7-.8 1.8-1.5 2.8-1.5.1 1.2-.3 2.3-1 3.2-.7.8-1.7 1.5-2.8 1.4-.1-1.2.4-2.3 1-3.1Z" />
    </svg>
  );
}

export default function PrivatAIPromoCard() {
  return (
    <section
      aria-label="PrivatAI — IA locale et privée"
      className="mx-3 my-3 overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-emerald-50/60 shadow-sm dark:border-violet-900/60 dark:from-violet-950/35 dark:via-background dark:to-emerald-950/20"
    >
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
            <FileLock2 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-tight text-foreground">PrivatAI</h2>
              <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">IA LOCALE</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">GRATUIT</span>
            </div>
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground">
              Analysez vos documents sensibles avec une IA qui fonctionne directement sur votre ordinateur.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span className="truncate text-[10px] font-semibold">Hors ligne</span>
          </div>
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="truncate text-[10px] font-semibold">Données locales</span>
          </div>
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border/70 bg-background/80 px-2 py-1.5">
            <FileLock2 className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
            <span className="truncate text-[10px] font-semibold">Confidentiel</span>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <a
            href="/privatia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-[11px] font-bold text-white shadow-sm transition hover:opacity-95 active:scale-[.99]"
          >
            Découvrir PrivatAI
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <a
            href={WINDOWS_DOWNLOAD}
            download="PrivatAI-Windows-x64-Setup.exe"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-[10.5px] font-semibold text-foreground transition hover:bg-muted active:scale-[.99]"
            aria-label="Télécharger PrivatAI pour Windows x64"
          >
            <WindowsMark />
            Windows x64
            <Download className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={MAC_DOWNLOAD}
            download="PrivatAI-Mac-Intel.dmg"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-[10.5px] font-semibold text-foreground transition hover:bg-muted active:scale-[.99]"
            aria-label="Télécharger PrivatAI pour Mac Intel"
          >
            <AppleMark />
            Mac Intel
            <Download className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>

        <p className="mt-2 text-center text-[9.5px] leading-4 text-muted-foreground">
          Après installation des modèles locaux : vos analyses documentaires peuvent fonctionner sans Internet.
        </p>
      </div>
    </section>
  );
}
