import React, { useState } from "react";
import { ChatImageLightbox } from "./ChatImageLightbox";
import { cn } from "@/lib/utils";

interface ChatImageProps {
  src: string;
  caption?: string;
  /** Optional gallery: when provided, lightbox supports prev/next across siblings. */
  gallery?: { url: string; caption?: string }[];
  index?: number;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/**
 * Tap-to-zoom image used in chat surfaces.
 * Click/tap opens a full-screen lightbox with pinch/scroll zoom & pan.
 */
export function ChatImage({ src, caption, gallery, index = 0, className, imgClassName, alt }: ChatImageProps) {
  const [open, setOpen] = useState(false);
  const list = gallery && gallery.length ? gallery : [{ url: src, caption }];
  const startIndex = gallery ? index : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("group block w-full overflow-hidden rounded-lg bg-muted relative active:scale-[0.99] transition-transform", className)}
        aria-label="Ouvrir l'image en plein écran"
      >
        <img
          src={src}
          alt={alt || caption || ""}
          loading="lazy"
          decoding="async"
          className={cn("w-full h-full object-cover transition-transform group-hover:scale-[1.02]", imgClassName)}
        />
        {caption && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] leading-tight px-2 py-1.5 line-clamp-2">
            {caption}
          </span>
        )}
      </button>
      {open && (
        <ChatImageLightbox images={list} index={startIndex} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export default ChatImage;
