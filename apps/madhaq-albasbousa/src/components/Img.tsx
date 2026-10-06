import { useState } from 'react';
import emblem from '../assets/emblem.png';
import { imageProps } from '../lib/images';
import type { Photo } from '../lib/types';

interface Props {
  photo: Photo;
  /** width / height of the rendered box — keeps the CDN crop and the layout in sync (no layout shift). */
  ratio: number;
  sizes: string;
  widths?: number[];
  priority?: boolean;
  className?: string;
}

/** Photo with a branded fallback, so a slow or blocked image never leaves a blank box. */
export function Img({ photo, ratio, sizes, widths, priority, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`img-fallback ${className ?? ''}`} role="img" aria-label={photo.alt}>
        <img src={emblem} alt="" width={96} height={97} />
      </div>
    );
  }
  return (
    <img
      {...imageProps(photo, ratio, widths)}
      sizes={sizes}
      alt={photo.alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      onError={() => setFailed(true)}
    />
  );
}
