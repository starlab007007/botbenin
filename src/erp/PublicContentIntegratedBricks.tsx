import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ABSOLUTE_PROTOCOL = /^(https?:|data:|blob:|mailto:|tel:|javascript:)/i;

function publicIndexUrl(publicPath: string, version: number) {
  const base = publicPath.replace(/\/$/, '');
  return `${base}/index.html?app_integrated=${version}`;
}

function resolveAssetUrl(raw: string | null, publicPath: string) {
  if (!raw) return '';
  const value = raw.trim();
  if (!value || value.startsWith('#') || ABSOLUTE_PROTOCOL.test(value)) return value;
  if (value.startsWith('/')) return value;

  const base = `${window.location.origin}${publicPath.replace(/\/$/, '')}/`;
  return new URL(value, base).toString();
}

function copyAttributes(source: Element, target: HTMLElement, publicPath: string) {
  for (const attr of Array.from(source.attributes)) {
    if (attr.name === 'src') {
      target.setAttribute('src', resolveAssetUrl(attr.value, publicPath));
    } else if (attr.name === 'href') {
      target.setAttribute('href', resolveAssetUrl(attr.value, publicPath));
    } else {
      target.setAttribute(attr.name, attr.value);
    }
  }
}

async function appendScriptSequentially(script: HTMLScriptElement, publicPath: string, mark: string) {
  await new Promise<void>((resolve, reject) => {
    const node = document.createElement('script');
    copyAttributes(script, node, publicPath);
    node.dataset.publicIntegratedModule = mark;
    node.async = false;

    if (script.src) {
      node.onload = () => resolve();
      node.onerror = () => reject(new Error(`Script introuvable: ${node.src}`));
    } else {
      node.textContent = script.textContent ?? '';
    }

    document.body.appendChild(node);
    if (!script.src) resolve();
  });
}

type IntegratedPublicModuleProps = {
  title: string;
  publicPath: string;
};

function IntegratedPublicModule({ title, publicPath }: IntegratedPublicModuleProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [version, setVersion] = useState(() => Date.now());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const mark = useMemo(() => `integrated-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, [title]);

  useEffect(() => {
    let cancelled = false;
    const inserted: HTMLElement[] = [];

    const cleanup = () => {
      for (const node of inserted.splice(0)) node.remove();
      document
        .querySelectorAll(`[data-public-integrated-module="${mark}"]`)
        .forEach((node) => node.remove());
      if (mountRef.current) mountRef.current.innerHTML = '';
    };

    const run = async () => {
      cleanup();
      setStatus('loading');
      setError(null);

      try {
        const res = await fetch(publicIndexUrl(publicPath, version), {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const headLinks = Array.from(
          doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[as="style"], link[rel="preload"][as="style"]'),
        );
        for (const link of headLinks) {
          const node = document.createElement('link');
          copyAttributes(link, node, publicPath);
          node.dataset.publicIntegratedModule = mark;
          document.head.appendChild(node);
          inserted.push(node);
        }

        const inlineStyles = Array.from(doc.querySelectorAll<HTMLStyleElement>('style'));
        for (const style of inlineStyles) {
          const node = document.createElement('style');
          copyAttributes(style, node, publicPath);
          node.dataset.publicIntegratedModule = mark;
          node.textContent = style.textContent ?? '';
          document.head.appendChild(node);
          inserted.push(node);
        }

        const scripts = Array.from(doc.querySelectorAll<HTMLScriptElement>('script'));
        scripts.forEach((script) => script.remove());

        const container = mountRef.current;
        if (!container || cancelled) return;
        container.className = `waouh-public-integrated-module ${doc.body.className || ''}`.trim();
        container.innerHTML = doc.body.innerHTML;

        for (const script of scripts) {
          if (cancelled) return;
          await appendScriptSequentially(script, publicPath, mark);
        }

        if (!cancelled) setStatus('ready');
      } catch (e: any) {
        if (!cancelled) {
          setStatus('error');
          setError(e?.message || 'Chargement impossible');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [mark, publicPath, version]);

  return (
    <div className="flex h-full min-h-[720px] w-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            Code public intégré directement dans le module depuis {publicPath}, sans iframe.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setVersion(Date.now())}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recharger
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={publicPath} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir
            </a>
          </Button>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex items-center justify-center gap-2 border-b bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du code public intégré…
        </div>
      )}

      {status === 'error' && (
        <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Chargement impossible
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <div ref={mountRef} className="waouh-public-integrated-module min-h-0 flex-1 overflow-auto bg-white" />
    </div>
  );
}

export function FaIaPublicIntegratedBrick() {
  return <IntegratedPublicModule title="FA IA" publicPath="/fa" />;
}

export function ApresBacPublicIntegratedBrick() {
  return <IntegratedPublicModule title="AprèsBac IA" publicPath="/apresbacia" />;
}
