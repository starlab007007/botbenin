import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PublicContentMirror({
  title,
  publicPath,
}: {
  title: string;
  publicPath: string;
}) {
  const refresh = () => {
    const iframe = document.getElementById(`public-mirror-${title}`) as HTMLIFrameElement | null;
    if (iframe) iframe.src = `${publicPath}?app_mirror=${Date.now()}`;
  };

  return (
    <div className="flex h-full min-h-[720px] w-full flex-col bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-950">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">
            Contenu public officiel synchronisé depuis {publicPath}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={publicPath} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir
            </a>
          </Button>
        </div>
      </div>
      <iframe
        id={`public-mirror-${title}`}
        title={title}
        src={publicPath}
        className="h-full min-h-0 flex-1 border-0 bg-white"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

export function FaIaPublicMirrorBrick() {
  return <PublicContentMirror title="FA IA" publicPath="/fa" />;
}

export function ApresBacPublicMirrorBrick() {
  return <PublicContentMirror title="AprèsBac IA" publicPath="/apresbacia" />;
}
