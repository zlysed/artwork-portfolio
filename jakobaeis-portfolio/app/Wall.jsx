'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

/* Jedes Poster bekommt aus seiner ID einen festen „Zufall“:
   Drehung, Breite, Versatz, Klebeband. Server und Client rechnen gleich. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function look(id) {
  const r = rng(hash(id));
  const w = 80 + Math.round(r() * 20);
  return {
    rot: (r() * 4.6 - 2.3).toFixed(2),
    w,
    ml: Math.round(r() * (100 - w)),
    tx: Math.round(r() * 16 - 8),
    ty: Math.round(r() * 40 - 22),
    tape: r() > 0.38,
    tapeRot: (r() * 16 - 8).toFixed(1),
    tapeLeft: 18 + Math.round(r() * 52),
    z: 1 + Math.floor(r() * 3),
    bp: `${Math.round(r() * 100)}% ${Math.round(r() * 100)}%`,
  };
}

const buzz = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {}
};

export default function Wall({ items }) {
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return set.size > 1 ? ['All', ...set] : [];
  }, [items]);

  const shown = useMemo(
    () => (filter === 'All' ? items : items.filter((i) => i.category === filter)),
    [items, filter]
  );

  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      {categories.length > 0 && (
        <nav className="filters" aria-label="Filter works">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={c === filter ? 'on' : ''}
              aria-pressed={c === filter}
              onClick={() => {
                buzz();
                setFilter(c);
              }}
            >
              {c}
            </button>
          ))}
        </nav>
      )}

      <section className="wall" key={filter} aria-label="Artworks">
        {shown.map((it, i) => {
          const L = look(it.id);
          return (
            <figure
              className="paste"
              key={it.id}
              style={{
                '--r': `${L.rot}deg`,
                '--w': `${L.w}%`,
                '--ml': `${L.ml}%`,
                '--tx': `${L.tx}px`,
                '--ty': `${L.ty}px`,
                '--z': L.z,
                '--bp': L.bp,
                '--d': `${Math.min(i, 9) * 110}ms`,
                '--tr': `${L.tapeRot}deg`,
                '--tl': `${L.tapeLeft}%`,
              }}
            >
              <button
                type="button"
                className="sheet"
                aria-label={`Open ${it.title}`}
                onClick={() => {
                  buzz();
                  setOpen(i);
                }}
              >
                <Image
                  src={it.src}
                  alt={it.title}
                  width={it.w}
                  height={it.h}
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 31vw"
                  quality={85}
                  priority={i < 2}
                />
              </button>
              {L.tape && <span className="tape" aria-hidden="true" />}
              <figcaption className="tag">{it.title}</figcaption>
            </figure>
          );
        })}
      </section>

      {open !== null && shown[open] && (
        <Lightbox items={shown} index={open} onIndex={setOpen} onClose={close} />
      )}
    </>
  );
}

function Lightbox({ items, index, onIndex, onClose }) {
  const box = useRef(null);
  const touch = useRef(null);
  const it = items[index];

  const go = useCallback(
    (d) => {
      buzz();
      onIndex((index + d + items.length) % items.length);
    },
    [index, items.length, onIndex]
  );

  useEffect(() => {
    const prev = document.activeElement;
    box.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      if (prev && prev.focus) prev.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const meta = [it.category, it.year].filter(Boolean).join(', ');

  return (
    <div
      className="lb"
      ref={box}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={it.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 50 && items.length > 1) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Image
          key={it.id}
          src={it.src}
          alt={it.title}
          fill
          sizes="100vw"
          quality={90}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div className="lb-bar">
        <div className="lb-cap">
          <strong>{it.title}</strong>
          {meta && <span>{meta}</span>}
        </div>
        <div className="lb-btns">
          {items.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)}>Prev</button>
              <span className="lb-count">{index + 1}/{items.length}</span>
              <button type="button" onClick={() => go(1)}>Next</button>
            </>
          )}
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
