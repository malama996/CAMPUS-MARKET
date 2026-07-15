"use client";

import { useState } from 'react';
import Lightbox from './Lightbox';

export default function ImageGallery({ images = [], title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images.length) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground border-b border-border">
        No Images
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      {/* Main image */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="w-full aspect-video bg-muted relative block group cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIndex]}
          alt={title}
          className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
        />
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </button>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-background">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                i === activeIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={images}
          index={activeIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setActiveIndex}
        />
      )}
    </div>
  );
}