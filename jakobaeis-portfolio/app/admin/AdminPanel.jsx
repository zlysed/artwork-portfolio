'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

const MAX_SIDE = 2400;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif';

const cleanName = (n) =>
  n.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120) || 'Untitled';
const slug = (n) =>
  n.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) ||
  'artwork';

async function prepare(file, optimize) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`${file.name}: could not read this image`));
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!optimize || file.type === 'image/gif') return { blob: file, w, h, name: file.name };

    const s = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.round(w * s);
    const ch = Math.round(h * s);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.92));
    if (!blob) return { blob: file, w, h, name: file.name };
    return { blob, w: cw, h: ch, name: `${slug(file.name)}.webp` };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminPanel() {
  const [auth, setAuth] = useState(null);
  const [items, setItems] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [jobs, setJobs] = useState([]);
  const [optimize, setOptimize] = useState(true);
  const [category, setCategory] = useState('Poster');
  const [pw, setPw] = useState('');
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const loadAll = useCallback(async () => {
    const a = await (await fetch('/api/auth', { cache: 'no-store' })).json();
    setAuth(a);
    if (a.admin) {
      const r = await fetch('/api/artworks', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load works');
      setItems(d.items);
    }
  }, []);

  useEffect(() => {
    loadAll().catch((e) => setErr(e.message));
  }, [loadAll]);

  async function login(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Login failed');
      setPw('');
      await loadAll();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setItems([]);
    setAuth((a) => ({ ...a, admin: false }));
  }

  async function save(next) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const r = await fetch('/api/artworks', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setAuth((a) => ({ ...a, admin: false }));
        throw new Error('Session expired. Log in again, your changes are still here.');
      }
      if (!r.ok) throw new Error(d.error || 'Saving failed');
      setItems(d.items);
      setDirty(false);
      setMsg('Saved. The wall is updated.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    setBusy(true);
    setErr('');
    setMsg('');
    const added = [];

    for (const f of files) {
      const id = crypto.randomUUID();
      const patch = (p) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, ...p } : x)));
      setJobs((j) => [...j, { id, name: f.name, pct: 0, state: 'Preparing' }]);
      try {
        const p = await prepare(f, optimize);
        patch({ state: 'Uploading' });
        const res = await upload(`artworks/${p.name}`, p.blob, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: p.blob.type || undefined,
          onUploadProgress: ({ percentage }) => patch({ pct: Math.round(percentage) }),
        });
        added.push({
          id: crypto.randomUUID(),
          title: cleanName(f.name),
          year: '',
          category,
          src: res.url,
          w: p.w,
          h: p.h,
        });
        patch({ state: 'Done', pct: 100 });
      } catch (e) {
        patch({ state: `Failed: ${e.message}` });
      }
    }

    if (added.length) await save([...added, ...itemsRef.current]);
    else setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const update = (i, patch) => {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    setDirty(true);
    setMsg('');
  };
  const move = (i, d) => {
    setItems((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setDirty(true);
    setMsg('');
  };
  const remove = (i) => {
    if (!confirm(`Remove "${items[i].title}" from the wall? Uploaded files are deleted when you save.`)) return;
    setItems((list) => list.filter((_, idx) => idx !== i));
    setDirty(true);
    setMsg('');
  };

  if (!auth) return <p className="a-note">{err || 'Loading'}</p>;

  if (!auth.configured) {
    return (
      <div className="a-box">
        <h1>Admin</h1>
        <p className="a-err">
          ADMIN_PASSWORD is not set. Add it in Vercel under Settings, Environment Variables, then redeploy.
        </p>
      </div>
    );
  }

  if (!auth.admin) {
    return (
      <form className="a-box a-login" onSubmit={login}>
        <h1>Admin</h1>
        <label>
          Password
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        <button type="submit" className="a-btn" disabled={busy || !pw}>Log in</button>
        {err && <p className="a-err">{err}</p>}
        <a href="/" className="a-back">Back to the wall</a>
      </form>
    );
  }

  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];

  return (
    <div className="a-wrap">
      <header className="a-head">
        <h1>Admin</h1>
        <div className="a-head-r">
          <a href="/" target="_blank" rel="noopener">View site</a>
          <button type="button" className="a-link" onClick={logout}>Log out</button>
        </div>
      </header>

      {!auth.blob && (
        <p className="a-err">
          No Blob store is connected, so uploads and saving will fail. In Vercel: Storage, Create Blob store (public), connect it to this project, redeploy.
        </p>
      )}

      <section className="a-section">
        <h2>Add works</h2>
        <div
          className={`a-drop${drag ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        >
          <p>Drop images here</p>
          <button type="button" className="a-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            Choose images
          </button>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        </div>
        <div className="a-opts">
          <label>
            Category for new uploads
            <input list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="a-check">
            <input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} />
            Shrink to 2400 px and convert to WebP (faster site, recommended)
          </label>
        </div>
        <datalist id="cats">
          {['Poster', 'Cover', 'Edit', 'Photo', ...cats.filter((c) => !['Poster', 'Cover', 'Edit', 'Photo'].includes(c))].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        {jobs.length > 0 && (
          <ul className="a-jobs">
            {jobs.map((j) => (
              <li key={j.id}>
                <span>{j.name}</span>
                <span>{j.state === 'Uploading' ? `${j.pct}%` : j.state}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="a-section">
        <div className="a-row-head">
          <h2>On the wall ({items.length})</h2>
          <button type="button" className="a-btn" disabled={busy || !dirty} onClick={() => save(items)}>
            {busy ? 'Working' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
        {msg && <p className="a-ok" role="status">{msg}</p>}
        {err && <p className="a-err" role="alert">{err}</p>}
        <p className="a-hint">The first work in this list sits at the top left of the wall.</p>

        <ul className="a-list">
          {items.map((it, i) => (
            <li key={it.id} className="a-item">
              <img src={it.src} alt="" loading="lazy" />
              <div className="a-fields">
                <label>
                  Title
                  <input value={it.title} maxLength={120} onChange={(e) => update(i, { title: e.target.value })} />
                </label>
                <label>
                  Category
                  <input list="cats" value={it.category} maxLength={40} onChange={(e) => update(i, { category: e.target.value })} />
                </label>
                <label>
                  Year
                  <input value={it.year} maxLength={12} onChange={(e) => update(i, { year: e.target.value })} />
                </label>
              </div>
              <div className="a-actions">
                <button type="button" className="a-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                <button type="button" className="a-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">Down</button>
                <button type="button" className="a-sm danger" onClick={() => remove(i)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="a-note">The wall is empty. Drop your first image above.</p>}
      </section>
    </div>
  );
}
