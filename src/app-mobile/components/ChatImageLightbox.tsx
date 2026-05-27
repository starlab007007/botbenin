import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";

interface LightboxImage { url: string; caption?: string; }

interface Props {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function ChatImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [cur, setCur] = useState(index);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => setCur(index), [index]);
  useEffect(() => { onIndexChange?.(cur); }, [cur]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCur((c) => Math.min(images.length - 1, c + 1));
      if (e.key === "ArrowLeft") setCur((c) => Math.max(0, c - 1));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [images.length, onClose]);

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  useEffect(reset, [cur, reset]);

  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = clampScale(scale + (e.deltaY < 0 ? 0.25 : -0.25));
    setScale(next);
    if (next === 1) { setTx(0); setTy(0); }
  };
  const onDoubleClick = () => {
    if (scale === 1) setScale(2.2);
    else reset();
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (scale === 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
    setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setScale(clampScale(pinchRef.current.scale * (dist / pinchRef.current.dist)));
    }
  };
  const onTouchEnd = () => { pinchRef.current = null; };

  const current = images[cur];
  if (!current) return null;

  const node = (
    <div
      className="fixed inset-0 z-[1000] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-3 py-2 text-white safe-top">
        <div className="text-xs opacity-70 font-mono">
          {cur + 1} / {images.length}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setScale((s) => clampScale(s - 0.5))} className="h-9 w-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center" aria-label="Zoom arrière"><ZoomOut className="h-5 w-5" /></button>
          <button onClick={() => setScale((s) => clampScale(s + 0.5))} className="h-9 w-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center" aria-label="Zoom avant"><ZoomIn className="h-5 w-5" /></button>
          <button onClick={reset} className="h-9 w-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center" aria-label="Réinitialiser"><RotateCcw className="h-5 w-5" /></button>
          <a href={current.url} target="_blank" rel="noreferrer" download className="h-9 w-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center" aria-label="Télécharger"><Download className="h-5 w-5" /></a>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-white/15 active:bg-white/25 flex items-center justify-center" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => { if (e.target === e.currentTarget && scale === 1) onClose(); }}
        style={{ touchAction: scale === 1 ? "pinch-zoom" : "none", cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        <img
          src={current.url}
          alt={current.caption || "Image"}
          draggable={false}
          className="max-w-[100vw] max-h-[100dvh] object-contain transition-transform duration-100 will-change-transform"
          style={{ transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})` }}
        />
      </div>

      {current.caption && (
        <div className="px-4 py-2 text-center text-white/90 text-sm safe-bottom">{current.caption}</div>
      )}

      {images.length > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2">
          <button
            onClick={(e) => { e.stopPropagation(); setCur((c) => Math.max(0, c - 1)); }}
            disabled={cur === 0}
            className="pointer-events-auto h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
            aria-label="Précédent"
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); setCur((c) => Math.min(images.length - 1, c + 1)); }}
            disabled={cur === images.length - 1}
            className="pointer-events-auto h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30"
            aria-label="Suivant"
          >›</button>
        </div>
      )}
    </div>
  );

  return createPortal(node, document.body);
}

export default ChatImageLightbox;
