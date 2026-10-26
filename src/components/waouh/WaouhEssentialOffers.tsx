import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { MapPin, ShoppingBag, SlidersHorizontal, Sparkles, ArrowRight, Check, X, Briefcase } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { NexusDiscoveryResult } from '@/lib/waouh/nexus';
import { resultPhotos } from '@/lib/waouh/resultCardData';
import { contactPossible, knownPeopleCount, normalizeOfferText, offerAdvice, offerHint, offerKind, offerMarket, offerPrice, uniqueOffers } from '@/lib/waouh/essentialOffers';
import './waouh-essential.css';

function OfferImage({ item, large = false, onClick }: { item: NexusDiscoveryResult; large?: boolean; onClick?: () => void }) {
  const photos = resultPhotos(item), [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.fabric_id, photos[0]]);
  const content = photos[0] && !failed ? <img src={photos[0]} alt={item.subject || 'Offre'} loading="lazy" onError={() => setFailed(true)} /> : <span className="we-no-photo">{offerKind(item) === 'service' ? <Briefcase /> : <ShoppingBag />}<small>Sans photo</small></span>;
  return onClick && photos.length ? <button className={`we-photo ${large ? 'we-photo-large' : ''}`} onClick={onClick} aria-label="Agrandir la photo">{content}</button> : <div className={`we-photo ${large ? 'we-photo-large' : ''}`}>{content}</div>;
}

/** The original result object is passed to every action, regardless of filtering. */
export function WaouhEssentialOffers({ results, city = '', renderActions }: { results: NexusDiscoveryResult[]; city?: string; renderActions: (item: NexusDiscoveryResult) => ReactNode }) {
  const offers = useMemo(() => uniqueOffers(results), [results]);
  const [active, setActive] = useState<string | null>(null), [selected, setSelected] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false), [filter, setFilter] = useState('all'), [compare, setCompare] = useState(false), [photo, setPhoto] = useState(0), [gallery, setGallery] = useState(false);
  useEffect(() => {
    const ids=new Set(uniqueOffers(results).map(r=>r.fabric_id));
    setActive(id=>id&&ids.has(id)?id:null);
    setSelected(previous=>previous.filter(id=>ids.has(id)));
    if(!ids.size){setCompare(false);setFilter('all');setGallery(false);}
  }, [results]);
  const item = offers.find(r => r.fabric_id === active);
  const visible = offers.filter(r => filter === 'near' ? !!city.trim() && normalizeOfferText(r.city) === normalizeOfferText(city) : filter === 'contact' ? contactPossible(r) : true);
  const chosen = offers.filter(r => selected.includes(r.fabric_id));
  useEffect(()=>{if(chosen.length<2)setCompare(false);},[chosen.length]);
  const toggle = (id: string) => setSelected(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 5 ? [...ids,id] : ids);
  const people = knownPeopleCount(offers);
  if (!offers.length) return null;
  const market = item ? offerMarket(item) : null;
  const photos = item ? resultPhotos(item) : [];
  return <section className="we-offers" aria-label="Offres trouvées">
    <div className="we-list-heading"><div><strong>{visible.length} offre{visible.length > 1 ? 's' : ''}</strong>{people > 0 && <small>{people} profil{people > 1 ? 's' : ''} identifié{people > 1 ? 's' : ''}</small>}</div><button className="we-text-button" aria-expanded={filterOpen} onClick={() => setFilterOpen(v => !v)}><SlidersHorizontal size={16} /> Filtres</button></div>
    {filterOpen && <div className="we-filters" aria-label="Filtrer les offres">{[['all','Toutes'],['near','Proches'],['contact','Avec contact']].map(([id,label]) => <button key={id} aria-pressed={filter === id} disabled={id === 'near' && !city.trim()} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="we-advice"><Sparkles size={16} /><span>Prix, unité et disponibilité à confirmer.</span></div>
    <div className="we-list">{visible.map(r => <article className="we-card" key={r.fabric_id}>
      <button className="we-card-open" onClick={() => { setActive(r.fabric_id); setPhoto(0); }} aria-label={`Voir l’offre : ${r.subject || 'Offre'}`}><OfferImage item={r} /><span className="we-card-copy"><strong className="we-title">{r.subject || r.category || 'Offre'}</strong><strong className="we-price">{offerPrice(r)}</strong><small>{offerHint(r)}</small><small className="we-location"><MapPin size={12} />{r.city || 'Zone à confirmer'}</small><span className="we-open-label">Voir l’offre <ArrowRight size={14}/></span></span></button>
      <button className="we-select" aria-label={`Comparer : ${r.subject || 'Offre'}`} aria-pressed={selected.includes(r.fabric_id)} disabled={selected.length >= 5 && !selected.includes(r.fabric_id)} onClick={() => toggle(r.fabric_id)}>{selected.includes(r.fabric_id) ? <Check size={16}/> : <span/>}</button>
    </article>)}</div>
    {!visible.length && <p className="we-empty">Aucune offre pour ce filtre.</p>}
    {chosen.length > 0 && <div className="we-compare-tray" aria-label="Sélection à comparer"><div className="we-miniatures">{chosen.slice(0,3).map(r => <OfferImage key={r.fabric_id} item={r}/>)}</div><span>{chosen.length} / 5</span><Button className="we-primary" disabled={chosen.length < 2} onClick={() => setCompare(true)}>Comparer</Button><button className="we-text-button" aria-label="Vider la sélection" onClick={() => setSelected([])}><X size={16}/></button></div>}
    <Sheet open={!!item} onOpenChange={open => { if (!open) { setActive(null); setGallery(false); } }}><SheetContent side="bottom" className="we-detail" aria-describedby="we-detail-description">
      {item && <><OfferImage item={item} large onClick={() => setGallery(true)} /><SheetTitle className="we-detail-title">{item.subject || item.category || 'Offre'}</SheetTitle><div className="we-detail-price">{offerPrice(item)}</div><SheetDescription id="we-detail-description">{offerHint(item)} · {item.city || 'Zone à confirmer'}</SheetDescription><div className="we-advice"><Sparkles size={16}/><span>{offerAdvice(item)}</span></div>
        <details className="we-disclosure"><summary>Marché <span>{market?.label}</span></summary><p className="we-muted">Prix observés ; unité, modèle et conditions doivent correspondre.</p>{market?.median != null && <p>Médiane des références : {new Intl.NumberFormat('fr-FR').format(market.median)} {item.currency === 'XOF' || !item.currency ? 'F CFA' : item.currency}</p>}{market?.refs.map(ref => <a className="we-reference" key={ref.url} href={ref.url} target="_blank" rel="noreferrer"><span>{ref.seller}</span><strong>{new Intl.NumberFormat('fr-FR').format(ref.amount)} {ref.currency === 'XOF' ? 'F CFA' : ref.currency}</strong><small>{ref.observed_at ? new Date(ref.observed_at).toLocaleDateString('fr-FR') : 'Date non précisée'} · {ref.comparable ? 'Comparable' : 'Équivalence à confirmer'}</small></a>)}</details>
        <details className="we-disclosure"><summary>Pourquoi ce choix ?</summary><p>{(item.scores?.reasons || []).filter(t => !/ENRICH|NEXUS|C[0-5]|score|Opportunity OS|\d+%/i.test(t)).slice(0,3).join(' · ') || 'Offre issue de votre recherche. Conditions à vérifier.'}</p>{typeof item.evidence?.description === 'string' && <p>{item.evidence.description}</p>}<small>Vos coordonnées restent protégées.</small></details>
        <div className="we-actions">{renderActions(item)}</div>
      </>}
    </SheetContent></Sheet>
    <Dialog open={compare} onOpenChange={setCompare}><DialogContent className="we-comparison"><DialogTitle>Comparer · {chosen.length} offres</DialogTitle><p className="we-muted">Prix observés. Comparez les mêmes unités et conditions.</p><div className="we-comparison-scroll"><div className="we-comparison-grid" style={{gridTemplateColumns:`repeat(${chosen.length}, minmax(180px, 1fr))`}}>{chosen.map(r => <div key={r.fabric_id}><OfferImage item={r}/><h3>{r.subject || 'Offre'}</h3><strong className="we-price">{offerPrice(r)}</strong><p>{offerHint(r)}</p><p>{r.city || 'Zone à confirmer'}</p><p>{offerAdvice(r)}</p><p>Marché : {offerMarket(r).label}</p><button className="we-text-button" onClick={() => { setCompare(false); setActive(r.fabric_id); }}>Voir l’offre <ArrowRight size={14}/></button></div>)}</div></div></DialogContent></Dialog>
    <Dialog open={gallery && !!item} onOpenChange={setGallery}><DialogContent className="we-gallery"><DialogTitle>Photos de l’offre</DialogTitle>{photos[photo] && <img src={photos[photo]} alt={item?.subject || 'Offre'}/>}<div className="we-filters">{photos.map((url,i) => <button key={url} aria-label={`Photo ${i+1}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>{i+1}</button>)}</div></DialogContent></Dialog>
  </section>;
}
