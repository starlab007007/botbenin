import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Expand, ImageOff} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {ChatImageLightbox} from '@/app-mobile/components/ChatImageLightbox';
import {productPhotos, productSnapshot, type ProductSnapshot} from '../../../supabase/functions/_shared/waouh-product-presentation';
import './product-presentation.css';

export {productPhotos, productSnapshot};
export function ProductGallery({photos: supplied, title, detail = false, compact = false}: {photos: string[]; title: string; detail?: boolean; compact?: boolean}) {
  const photos = productPhotos({photos:supplied}), identity = photos.join('|');
  const [index, setIndex] = useState(0), [zoom, setZoom] = useState(false), [failed, setFailed] = useState<string[]>([]);
  const touch = useRef<{x:number;y:number}|null>(null), swiped = useRef(false);
  useEffect(() => {setIndex(0);setZoom(false);setFailed([]);}, [identity, title]);
  const active = Math.min(index, Math.max(0, photos.length-1)), url = photos[active];
  const next = (step:number) => setIndex(i => (i+step+photos.length)%photos.length);
  const media = url && !failed.includes(url) ? <img src={url} alt={`${title} · photo ${active+1}`} loading="lazy" decoding="async" onError={() => setFailed(old=>[...old,url])}/> : <span className="wpp-placeholder"><ImageOff aria-hidden="true"/><small>{url?'Photo indisponible':'Photo non fournie'}</small></span>;
  return <div className={`wpp-gallery ${detail?'is-detail':''} ${compact?'is-compact':''}`} data-product-gallery>
    <div className="wpp-hero" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};swiped.current=false;}} onTouchEnd={e=>{if(!touch.current||photos.length<2)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)){swiped.current=true;next(dx<0?1:-1);if(e.cancelable)e.preventDefault();e.stopPropagation();}}} onClickCapture={e=>{if(swiped.current){e.preventDefault();e.stopPropagation();swiped.current=false;}}}>
      {detail&&photos.length?<button type="button" className="wpp-zoom" aria-label={`Agrandir les photos de ${title}`} onClick={()=>setZoom(true)}>{media}<span className="wpp-expand"><Expand size={15}/></span></button>:media}
      {photos.length>0&&<span className="wpp-counter">{active+1} / {photos.length}</span>}
      {!detail&&photos.length>1&&<span className="wpp-dots" aria-hidden="true">{photos.map((p,i)=><i key={p} className={i===active?'active':''}/>)}</span>}
    </div>
    {detail&&photos.length>1&&<div className="wpp-thumbnails" aria-label="Photos de ce produit"><button type="button" aria-label="Photo précédente" onClick={()=>next(-1)}><ChevronLeft size={18}/></button>{photos.map((p,i)=><button type="button" className={i===active?'active':''} key={p} aria-label={`Afficher la photo ${i+1}`} aria-pressed={i===active} onClick={()=>setIndex(i)}>{failed.includes(p)?<ImageOff size={16}/>:<img src={p} alt="" onError={()=>setFailed(old=>old.includes(p)?old:[...old,p])}/>}</button>)}<button type="button" aria-label="Photo suivante" onClick={()=>next(1)}><ChevronRight size={18}/></button></div>}
    {zoom&&photos.length>0&&<ChatImageLightbox images={photos.map(url=>({url,caption:title}))} index={active} onClose={()=>setZoom(false)}/>}
  </div>;
}
function ProductFacts({product:p,expanded=false}: {product:ProductSnapshot;expanded?:boolean}) {
  const quick=p.attributes.filter(a=>['État','Capacité','Garantie annoncée'].includes(a.label)).slice(0,3);
  if(!p.description&&!p.attributes.length)return null;
  return <div className="wpp-facts">{quick.length>0&&<div className="wpp-quick-facts">{quick.map(a=><span key={a.label}>{a.value}</span>)}</div>}<details className="wpp-more" open={expanded||undefined}><summary>Détails du produit <ChevronRight size={14}/></summary>{p.description&&<p>{p.description}</p>}{p.attributes.length>0&&<dl>{p.attributes.map(a=><div key={a.label}><dt>{a.label}</dt><dd>{a.value}</dd></div>)}</dl>}<small>Prix et conditions annoncés, à confirmer avant accord.</small></details></div>;
}

export function productPrice(p:ProductSnapshot) {
  const money=(v:number)=>`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v)} ${p.currency==='XOF'?'F CFA':p.currency}`;
  return p.price_min&&p.price_max&&p.price_min!==p.price_max?`${money(p.price_min)} – ${money(p.price_max)}`:p.price_min||p.price_max?money((p.price_min??p.price_max)!):'Prix à préciser';
}
export function WaouhProductPresentation({value, label='Produit suivi'}:{value:unknown;label?:string}) {
  const p=productSnapshot(value),[open,setOpen]=useState(false);
  useEffect(()=>setOpen(false),[p?.id,p?.title]);
  if(!p)return null;
  return <><article className="wpp-product" data-product-summary><div className="wpp-product-media"><ProductGallery photos={p.photos} title={p.title} compact/></div><div className="wpp-product-copy"><small>{label}</small><strong>{p.title}</strong><b>{productPrice(p)}</b>{p.city&&<span>{p.city}</span>}<button type="button" onClick={()=>setOpen(true)}>Voir le produit <ChevronRight size={14}/></button></div></article><Dialog open={open} onOpenChange={setOpen}><DialogContent className="wpp-dialog"><DialogTitle>{p.title}</DialogTitle><DialogDescription className="sr-only">Photos et informations du produit concerné.</DialogDescription><ProductGallery photos={p.photos} title={p.title} detail/><div className="wpp-dialog-copy"><strong className="wpp-price">{productPrice(p)}</strong>{p.city&&<p>{p.city}</p>}<ProductFacts product={p} expanded/></div></DialogContent></Dialog></>;
}
export {ProductFacts};
