import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

/* ── Helpers ─────────────────────────────────────────── */

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {}
  return null;
}

function domainEmoji(url) {
  const d = getDomain(url);
  if (d.includes("youtube") || d.includes("youtu.be")) return "▶";
  if (d.includes("instagram")) return "◈";
  if (d.includes("github")) return "◉";
  if (d.includes("twitter") || d.includes("x.com")) return "✕";
  if (d.includes("spotify")) return "♫";
  if (d.includes("tiktok")) return "◐";
  if (d.includes("behance") || d.includes("dribbble")) return "◎";
  if (d.includes("vimeo")) return "▷";
  return "○";
}

function isBlocked(url) {
  const d = getDomain(url);
  return d.includes("instagram") || d.includes("x.com") ||
    d.includes("twitter.com") || d.includes("linkedin.com");
}

async function fetchMeta(url) {
  if (isBlocked(url)) return { source: "blocked" };
  const ytId = getYouTubeId(url);
  if (ytId) {
    return {
      title: null, description: null,
      image: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      source: "youtube",
    };
  }
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const meta = data?.data || {};
    return {
      title: meta.title || null,
      description: meta.description || null,
      image: meta.image?.url || null,
      source: "microlink",
    };
  } catch { return { source: "failed" }; }
}

/* ── Storage (Supabase) ───────────────────────────────── */

async function loadAllLinks() {
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data || []).map(row => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    image: row.image,
    collections: row.collections || [],
    addedAt: row.added_at,
  }));
}

async function loadAllCollections() {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("name", { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }));
}

/* ── Logo SVG (We Are Social, all white) ─────────────── */
function WASLogo({ size = 36 }) {
  return (
    <svg width={size * 2.8} height={size} viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="78" fontFamily="'Dela Gothic One', sans-serif" fontSize="82" fill="white" letterSpacing="-2">
        we are social.
      </text>
    </svg>
  );
}

/* ── Card ─────────────────────────────────────────────── */
function LinkCard({ item, collections, onDelete, onOpen, onAddToCollection }) {
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const itemCollections = collections.filter(c => (item.collections || []).includes(c.id));

  return (
    <div className="card">
      <div className="card-thumb-wrap" onClick={() => onOpen(item.url)}>
        {item.image && !imgError ? (
          <img className="card-thumb" src={item.image} alt="" onError={() => setImgError(true)} />
        ) : (
          <div className="card-thumb-placeholder">
            <span className="card-emoji">{domainEmoji(item.url)}</span>
            <span className="card-domain-big">{getDomain(item.url)}</span>
          </div>
        )}
        <div className="card-overlay">
          <span className="card-open-label">Open ↗</span>
        </div>
      </div>

      <div className="card-body">
        <div className="card-title">{item.title || getDomain(item.url)}</div>
        {item.description && <div className="card-desc">{item.description}</div>}

        {itemCollections.length > 0 && (
          <div className="card-tags">
            {itemCollections.map(c => (
              <span key={c.id} className="card-tag" style={{ background: c.color + "22", color: c.color, borderColor: c.color + "44" }}>
                {c.name}
              </span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <span className="card-domain">{getDomain(item.url)}</span>
          <div className="card-actions">
            <div className="col-menu-wrap" ref={menuRef}>
              <button className="card-action-btn" title="ADD TO COLLECTION" onClick={() => setMenuOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
              {menuOpen && (
                <div className="col-menu">
                  <div className="col-menu-title">Add to collection</div>
                  {collections.length === 0 && <div className="col-menu-empty">No collections yet</div>}
                  {collections.map(c => {
                    const active = (item.collections || []).includes(c.id);
                    return (
                      <button key={c.id} className={`col-menu-item${active ? " active" : ""}`}
                        onClick={() => { onAddToCollection(item.id, c.id, !active); setMenuOpen(false); }}>
                        <span className="col-dot" style={{ background: c.color }} />
                        {c.name}
                        {active && <span className="col-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button className="card-action-btn card-delete-btn" title="Remove" onClick={() => onDelete(item.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Modal ────────────────────────────────────────── */
function AddModal({ url, collections, onSave, onClose }) {
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imgPreviewError, setImgPreviewError] = useState(false);
  const [metaSource, setMetaSource] = useState(null);
  const [selectedCols, setSelectedCols] = useState([]);

  useEffect(() => {
    async function load() {
      setFetching(true);
      const meta = await fetchMeta(url);
      setMetaSource(meta.source);
      if (meta.title) setTitle(meta.title);
      if (meta.description) setDescription(meta.description);
      if (meta.image) setImage(meta.image);
      setFetching(false);
    }
    load();
  }, [url]);

  function toggleCol(id) {
    setSelectedCols(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const blocked = metaSource === "blocked";

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Drop it in</div>
            <div className="modal-sub">{getDomain(url)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {fetching && (
          <div className="fetching-bar"><div className="spinner" /> Fetching preview…</div>
        )}

        <div className="modal-preview">
          <div className="modal-preview-thumb">
            {image && !imgPreviewError
              ? <img src={image} alt="" onError={() => setImgPreviewError(true)} />
              : <span>{domainEmoji(url)}</span>}
          </div>
          <div className="modal-preview-body">
            <div className="modal-preview-title">{title || getDomain(url)}</div>
            {description && <div className="modal-preview-desc">{description}</div>}
            <div className="modal-preview-domain">{getDomain(url)}</div>
          </div>
        </div>

        <div className="field">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder='Give it a name…' />
        </div>

        <div className="field">
          <label>Note — why this?</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            placeholder='What caught your eye?' />
        </div>

        <div className="field">
          <label>Thumbnail URL <span className="label-opt">(optional)</span></label>
          <input value={image} onChange={e => { setImage(e.target.value); setImgPreviewError(false); }}
            placeholder="Paste a direct image link" />
          {blocked && (
            <div className="field-hint field-hint--warn">
              📵 {getDomain(url)} blocks auto-thumbnails. Long-press the image on the post → Copy, then paste above.
            </div>
          )}
        </div>

        {collections.length > 0 && (
          <div className="field">
            <label>Add to collections</label>
            <div className="col-picker">
              {collections.map(c => (
                <button key={c.id} className={`col-pill${selectedCols.includes(c.id) ? " selected" : ""}`}
                  style={selectedCols.includes(c.id) ? { background: c.color, borderColor: c.color, color: "#000" } : { borderColor: c.color + "66", color: c.color }}
                  onClick={() => toggleCol(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save"
            onClick={() => onSave({ title: title || getDomain(url), description, image: imgPreviewError ? "" : image, collections: selectedCols })}>
            Save it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New Collection Modal ─────────────────────────────── */
const COLORS = ["#ff0038", "#ff6b35", "#ffd700", "#00e5ff", "#b388ff", "#69ff47", "#ff4081", "#ffffff"];

function NewCollectionModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ff0038");

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--sm">
        <div className="modal-header">
          <div className="modal-title">New collection</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder='e.g. "Campaign inspo", "Typography"' autoFocus />
        </div>
        <div className="field">
          <label>Colour</label>
          <div className="color-swatches">
            {COLORS.map(c => (
              <button key={c} className={`swatch${color === c ? " active" : ""}`}
                style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={!name.trim()}
            onClick={() => name.trim() && onSave(name.trim(), color)}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────── */
export default function App() {
  const [links, setLinks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeCol, setActiveCol] = useState(null); // null = All
  const [urlInput, setUrlInput] = useState("");
  const [modal, setModal] = useState(null); // null | { url } | "newCollection"
  const [toast, setToast] = useState({ msg: "", show: false });
  const toastTimer = useRef(null);

  useEffect(() => {
    loadAll();
    // Realtime — update instantly when anyone adds/removes links or collections
    const channel = supabase.channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "links" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "collections" }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadAll() {
    const [l, c] = await Promise.all([loadAllLinks(), loadAllCollections()]);
    setLinks(l);
    setCollections(c);
  }

  function showToast(msg) {
    setToast({ msg, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }

  function handleNext() {
    let url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setModal({ url });
    setUrlInput("");
  }

  async function handleSave({ title, description, image, collections: cols }) {
    const id = `lnk${Date.now()}${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const { error } = await supabase.from("links").insert({
      id,
      url: modal.url,
      title,
      description,
      image,
      collections: cols || [],
      added_at: now,
    });
    if (error) { console.error(error); showToast("Something went wrong"); return; }
    setLinks(prev => [{ id, url: modal.url, title, description, image, collections: cols || [], addedAt: now }, ...prev]);
    setModal(null);
    showToast("Saved ✓");
  }

  async function handleDelete(id) {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (error) { console.error(error); return; }
    setLinks(prev => prev.filter(l => l.id !== id));
    showToast("Removed");
  }

  async function handleAddToCollection(linkId, colId, add) {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const newCollections = add
      ? [...(link.collections || []), colId]
      : (link.collections || []).filter(c => c !== colId);
    const { error } = await supabase
      .from("links")
      .update({ collections: newCollections })
      .eq("id", linkId);
    if (error) { console.error(error); return; }
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, collections: newCollections } : l));
  }

  async function handleNewCollection(name, color) {
    const id = `col${Date.now()}${Math.random().toString(36).slice(2)}`;
    const now = Date.now();
    const { error } = await supabase.from("collections").insert({
      id, name, color, created_at: now,
    });
    if (error) { console.error(error); showToast("Something went wrong"); return; }
    setCollections(prev => [...prev, { id, name, color, createdAt: now }].sort((a, b) => a.name.localeCompare(b.name)));
    setModal(null);
    showToast(`"${name}" created`);
  }

  async function handleDeleteCollection(colId) {
    // Remove collection from all links that have it
    const affectedLinks = links.filter(l => (l.collections || []).includes(colId));
    await Promise.all(affectedLinks.map(l =>
      supabase.from("links").update({
        collections: l.collections.filter(c => c !== colId)
      }).eq("id", l.id)
    ));
    // Delete the collection itself
    const { error } = await supabase.from("collections").delete().eq("id", colId);
    if (error) { console.error(error); return; }
    setCollections(prev => prev.filter(c => c.id !== colId));
    setLinks(prev => prev.map(l => ({
      ...l,
      collections: (l.collections || []).filter(c => c !== colId),
    })));
    if (activeCol === colId) setActiveCol(null);
    showToast("Collection deleted");
  }

  const visibleLinks = activeCol
    ? links.filter(l => (l.collections || []).includes(activeCol))
    : links;

  const activeColData = collections.find(c => c.id === activeCol);

  return (
    <>
      <style>{CSS}</style>

      {modal && modal.url && (
        <AddModal url={modal.url} collections={collections} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal === "newCollection" && (
        <NewCollectionModal onSave={handleNewCollection} onClose={() => setModal(null)} />
      )}

      <div className="layout">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-text">we are<br />social.</div>
          </div>

          <div className="sidebar-title">THE LINK UP</div>

          <nav className="sidebar-nav">
            <button className={`nav-item${!activeCol ? " active" : ""}`} onClick={() => setActiveCol(null)}>
              <span className="nav-dot" style={{ background: "#ff0038" }} />
              ALL SAVES
              <span className="nav-count">{links.length}</span>
            </button>
            {collections.map(c => (
              <div key={c.id} className="nav-item-wrap">
                <button className={`nav-item${activeCol === c.id ? " active" : ""}`} onClick={() => setActiveCol(c.id)}>
                  <span className="nav-dot" style={{ background: c.color }} />
                  {c.name}
                  <span className="nav-count">{links.filter(l => (l.collections || []).includes(c.id)).length}</span>
                </button>
                <button className="nav-delete" onClick={() => handleDeleteCollection(c.id)} title="Delete collection">✕</button>
              </div>
            ))}
          </nav>

          <button className="new-col-btn" onClick={() => setModal("newCollection")}>
            + New collection
          </button>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          <div className="main-header">
            <div className="main-heading">
              {activeCol ? activeColData?.name : "ALL SAVES"}
            </div>
            <div className="input-row">
              <input
                className="url-input"
                type="url"
                placeholder="Drop a link…"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && urlInput.trim() && handleNext()}
              />
              <button className="add-btn" onClick={handleNext} disabled={!urlInput.trim()}>
                Save it
              </button>
            </div>
          </div>

          <div className="grid">
            {visibleLinks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◯</div>
                <div className="empty-text">Nothing saved yet</div>
                <div className="empty-sub">Drop the first link above</div>
              </div>
            ) : (
              visibleLinks.map(item => (
                <LinkCard
                  key={item.id}
                  item={item}
                  collections={collections}
                  onDelete={handleDelete}
                  onOpen={url => window.open(url, "_blank", "noopener,noreferrer")}
                  onAddToCollection={handleAddToCollection}
                />
              ))
            )}
          </div>
        </main>
      </div>

      <div className={`toast${toast.show ? " show" : ""}`}>{toast.msg}</div>
    </>
  );
}

/* ── CSS ──────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #ff0038;
    font-family: 'TikTok Sans', 'DM Sans', sans-serif;
    color: #fff;
    min-height: 100vh;
  }

  /* Layout */
  .layout {
    display: flex;
    min-height: 100vh;
  }

  /* Sidebar */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #000;
    border-right: 1px solid #000;
    display: flex;
    flex-direction: column;
    padding: 28px 20px 32px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-logo {
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid #222;
  }

  .logo-text {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 22px;
    line-height: 1.05;
    color: #fff;
    letter-spacing: -0.5px;
  }

  .logo-red { color: #ff0038; }

  .sidebar-title {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #ff0038;
    margin-bottom: 20px;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .nav-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #888;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s;
  }

  .nav-item:hover { background: #1a1a1a; color: #fff; }
  .nav-item.active { background: #1a1a1a; color: #fff; }

  .nav-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .nav-count {
    margin-left: auto;
    font-size: 11px;
    color: #444;
    font-family: 'Dela Gothic One', sans-serif;
  }

  .nav-item.active .nav-count { color: #666; }

  .nav-delete {
    background: none;
    border: none;
    color: #333;
    cursor: pointer;
    font-size: 10px;
    padding: 4px 6px;
    border-radius: 4px;
    flex-shrink: 0;
    transition: color 0.15s;
    display: none;
  }

  .nav-item-wrap:hover .nav-delete { display: block; }
  .nav-delete:hover { color: #ff0038; }

  .new-col-btn {
    margin-top: 20px;
    background: transparent;
    border: 1px solid #333;
    border-radius: 6px;
    color: #666;
    font-family: inherit;
    font-size: 12px;
    padding: 9px 14px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, color 0.15s;
  }

  .new-col-btn:hover { border-color: #ff0038; color: #fff; }

  /* Main area */
  .main {
    flex: 1;
    min-width: 0;
    padding: 36px 36px 80px;
  }

  .main-header {
    margin-bottom: 36px;
  }

  .main-heading {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: clamp(32px, 4vw, 52px);
    color: #fff;
    line-height: 1;
    margin-bottom: 20px;
    letter-spacing: -1px;
  }

  /* URL input */
  .input-row {
    display: flex;
    gap: 0;
    max-width: 560px;
    background: #cc0028;
    border: 1.5px solid #aa0020;
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .input-row:focus-within { border-color: #fff; }

  .url-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: #fff;
    font-family: inherit;
    font-size: 14px;
    padding: 12px 16px;
  }

  .url-input::placeholder { color: rgba(255,255,255,0.4); }

  .add-btn {
    background: #000;
    color: #fff;
    border: none;
    padding: 12px 20px;
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .add-btn:hover { background: #222; }
  .add-btn:disabled { background: rgba(0,0,0,0.3); color: rgba(255,255,255,0.3); cursor: not-allowed; }

  /* Grid */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  /* Card */
  .card {
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.18s, box-shadow 0.18s;
    animation: fadeUp 0.3s ease both;
  }

  .card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .card-thumb-wrap {
    position: relative;
    aspect-ratio: 16/9;
    overflow: hidden;
    cursor: pointer;
    background: #000;
  }

  .card-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s;
  }

  .card:hover .card-thumb { transform: scale(1.03); }

  .card-thumb-placeholder {
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .card-emoji { font-size: 28px; color: #ff0038; }
  .card-domain-big { font-size: 11px; color: #444; letter-spacing: 0.06em; }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255,0,56,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .card-thumb-wrap:hover .card-overlay { opacity: 1; }

  .card-open-label {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 14px;
    color: #fff;
    letter-spacing: 0.06em;
  }

  .card-body {
    padding: 12px 14px 14px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #fff;
  }

  .card-title {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 13px;
    color: #0a0a0a;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    letter-spacing: -0.2px;
  }

  .card-desc {
    font-size: 11px;
    color: #666;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
  }

  .card-tag {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 20px;
    border: 1px solid;
    letter-spacing: 0.04em;
    font-family: 'Dela Gothic One', sans-serif;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }

  .card-domain {
    font-size: 10px;
    color: #bbb;
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .card-action-btn {
    background: none;
    border: none;
    color: #bbb;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.15s, background 0.15s;
  }

  .card-action-btn:hover { color: #ff0038; background: #fff0f3; }
  .card-delete-btn:hover { color: #ff0038; }

  /* Collection picker in card */
  .col-menu-wrap { position: relative; }

  .col-menu {
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    background: #000;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 8px;
    min-width: 180px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  .col-menu-title {
    font-size: 10px;
    color: #555;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 6px 6px;
    font-family: 'Dela Gothic One', sans-serif;
  }

  .col-menu-empty { font-size: 12px; color: #444; padding: 4px 6px; }

  .col-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: none;
    border: none;
    color: #ccc;
    font-family: inherit;
    font-size: 13px;
    padding: 7px 8px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }

  .col-menu-item:hover { background: #252525; }
  .col-menu-item.active { color: #fff; }

  .col-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .col-check { margin-left: auto; font-size: 11px; color: #ff0038; }

  /* Empty state */
  .empty {
    grid-column: 1/-1;
    text-align: center;
    padding: 100px 20px;
    color: rgba(255,255,255,0.4);
  }

  .empty-icon { font-size: 48px; margin-bottom: 16px; }
  .empty-text { font-family: 'Dela Gothic One', sans-serif; font-size: 22px; color: rgba(255,255,255,0.6); text-transform: uppercase; }
  .empty-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 6px; text-transform: uppercase; }

  /* Modal overlay */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.15s ease;
    backdrop-filter: blur(4px);
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: #000;
    border: 1px solid #1a1a1a;
    border-radius: 10px;
    width: 100%;
    max-width: 460px;
    padding: 28px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6);
    animation: slideUp 0.2s ease;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal--sm { max-width: 360px; }

  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .modal-title {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 22px;
    color: #fff;
    letter-spacing: -0.5px;
  }

  .modal-sub { font-size: 12px; color: #555; margin-top: 3px; }

  .modal-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #555;
    cursor: pointer;
  }
  .modal-close:hover { color: #fff; }

  .field { margin-bottom: 14px; }

  .field label {
    display: block;
    font-size: 10px;
    font-family: 'Dela Gothic One', sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 7px;
  }

  .label-opt { font-family: inherit; text-transform: none; letter-spacing: 0; font-size: 10px; color: #444; }

  .field input, .field textarea {
    width: 100%;
    background: #111;
    border: 1.5px solid #222;
    border-radius: 5px;
    padding: 10px 12px;
    color: #fff;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;
    resize: none;
  }

  .field input:focus, .field textarea:focus { border-color: #ff0038; }
  .field input::placeholder, .field textarea::placeholder { color: #444; }

  .field-hint { font-size: 11px; color: #444; margin-top: 5px; line-height: 1.5; }
  .field-hint--warn {
    color: #ff8040;
    background: #1a0a00;
    border: 1px solid #3a2000;
    border-radius: 4px;
    padding: 7px 10px;
    margin-top: 6px;
  }

  /* Collection pills in modal */
  .col-picker { display: flex; flex-wrap: wrap; gap: 6px; }

  .col-pill {
    background: transparent;
    border: 1.5px solid #333;
    border-radius: 20px;
    padding: 5px 12px;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    color: #555;
    transition: all 0.15s;
  }

  .col-pill:hover { border-color: #555; color: #ccc; }
  .col-pill.selected { font-family: 'Dela Gothic One', sans-serif; }

  /* Modal preview */
  .modal-preview {
    border: 1px solid #222;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 18px;
    background: #fff;
  }

  .modal-preview-thumb {
    width: 100%;
    aspect-ratio: 16/9;
    background: #0a0a0a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    overflow: hidden;
    color: #ff0038;
  }

  .modal-preview-thumb img { width: 100%; height: 100%; object-fit: cover; }

  .modal-preview-body { padding: 10px 12px 12px; background: #fff; }
  .modal-preview-title { font-family: 'Dela Gothic One', sans-serif; font-size: 13px; color: #0a0a0a; letter-spacing: -0.2px; }
  .modal-preview-desc { font-size: 11px; color: #666; margin-top: 3px; }
  .modal-preview-domain { font-size: 10px; color: #bbb; margin-top: 5px; }

  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }

  .btn-cancel {
    background: none;
    border: 1.5px solid #2a2a2a;
    border-radius: 5px;
    padding: 9px 18px;
    color: #555;
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-cancel:hover { border-color: #555; color: #ccc; }

  .btn-save {
    background: #ff0038;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 9px 22px;
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-save:hover { background: #cc0028; }
  .btn-save:disabled { background: #2a2a2a; color: #444; cursor: not-allowed; }

  /* Colour swatches */
  .color-swatches { display: flex; gap: 8px; flex-wrap: wrap; }

  .swatch {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
  }

  .swatch:hover { transform: scale(1.15); }
  .swatch.active { border-color: #fff; transform: scale(1.1); }

  /* Fetching */
  .fetching-bar { font-size: 12px; color: #ff0038; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .spinner { width: 12px; height: 12px; border: 2px solid #333; border-top-color: #ff0038; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }

  [class*="modal-title"], [class*="main-heading"], [class*="sidebar-title"],
  [class*="card-title"], [class*="logo-text"], [class*="empty-text"],
  [class*="card-open-label"], [class*="col-menu-title"] {
    text-transform: uppercase;
  }


  /* Toast */
  .toast {
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%) translateY(16px);
    background: #000;
    color: #fff;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 13px;
    letter-spacing: 0.04em;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
    z-index: 300;
    white-space: nowrap;
  }

  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
`;
