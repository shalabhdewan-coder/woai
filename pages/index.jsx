import { useState, useEffect, useCallback } from "react";

const NAV = ["FEED", "VIDEOS", "COMMUNITY", "TRENDING", "LEADERBOARD", "SUBMIT TIP", "ABOUT"];

const CATEGORIES = [
  { id: "all",         label: "ALL SIGNALS",  emoji: "◎" },
  { id: "models",      label: "MODELS",       emoji: "◈" },
  { id: "funding",     label: "FUNDING",      emoji: "◆" },
  { id: "research",    label: "RESEARCH",     emoji: "◉" },
  { id: "tools",       label: "TOOLS",        emoji: "◐" },
  { id: "geopolitics", label: "GEO/POLICY",   emoji: "◑" },
  { id: "biotech",     label: "BIO+AI",       emoji: "◒" },
];

const AGENTS = [
  { id: "models",      label: "Model Tracker",    icon: "◈", focus: "new AI model releases GPT Claude Gemini Llama Mistral benchmarks" },
  { id: "funding",     label: "Money Flow",        icon: "◆", focus: "AI startup funding rounds acquisitions IPO investment venture capital" },
  { id: "research",    label: "Research Radar",    icon: "◉", focus: "AI research papers breakthroughs machine learning deep learning" },
  { id: "tools",       label: "Tool Scout",        icon: "◐", focus: "new AI tools products launches developer APIs SaaS" },
  { id: "geopolitics", label: "Geo Intelligence",  icon: "◑", focus: "AI regulation policy US China EU government export controls" },
  { id: "biotech",     label: "Bio+AI Monitor",    icon: "◒", focus: "AI healthcare biotech drug discovery longevity CRISPR" },
];

const LEADERBOARD_FIELDS = ["Coding", "Writing", "Image Gen", "Research", "Video", "Voice", "Data Analysis", "Agents"];

const CAT_DARK = {
  models:      { bg: "#1a1400", border: "#D4A017", text: "#D4A017" },
  funding:     { bg: "#001a08", border: "#22c55e", text: "#22c55e" },
  research:    { bg: "#001218", border: "#38bdf8", text: "#38bdf8" },
  tools:       { bg: "#12001a", border: "#a78bfa", text: "#a78bfa" },
  geopolitics: { bg: "#1a0000", border: "#f87171", text: "#f87171" },
  biotech:     { bg: "#001a14", border: "#34d399", text: "#34d399" },
};

const CAT_LIGHT = {
  models:      { bg: "#fef9e7", border: "#b8860b", text: "#92670a" },
  funding:     { bg: "#f0fdf4", border: "#16a34a", text: "#15803d" },
  research:    { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
  tools:       { bg: "#faf5ff", border: "#7c3aed", text: "#6d28d9" },
  geopolitics: { bg: "#fff1f2", border: "#dc2626", text: "#b91c1c" },
  biotech:     { bg: "#f0fdf4", border: "#059669", text: "#047857" },
};

function useTheme(dark) {
  return {
    bg:         dark ? "#080808" : "#f8f8f5",
    surface:    dark ? "#111111" : "#ffffff",
    surfaceAlt: dark ? "#0d0d0d" : "#f2f2ee",
    border:     dark ? "#1e1e1e" : "#e2e2da",
    borderMid:  dark ? "#2a2a2a" : "#d0d0c8",
    text:       dark ? "#e8e8e8" : "#1a1a1a",
    textMid:    dark ? "#888888" : "#555555",
    textMuted:  dark ? "#555555" : "#999999",
    textFaint:  dark ? "#333333" : "#cccccc",
    accent:     dark ? "#D4A017" : "#b8860b",
    accentDim:  dark ? "rgba(212,160,23,0.12)" : "rgba(184,134,11,0.08)",
    cats:       dark ? CAT_DARK : CAT_LIGHT,
  };
}

async function apiCall(agentId, agentFocus) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, agentFocus }),
  });
  const data = await res.json();
  return data.text || "";
}

async function youtubeCall() {
  const res = await fetch("/api/youtube", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const data = await res.json();
  return data.text || "[]";
}

async function redditCall() {
  const res = await fetch("/api/reddit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const data = await res.json();
  return data.text || "[]";
}

async function twitterCall() {
  const res = await fetch("/api/twitter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const data = await res.json();
  return data.text || "[]";
}

function cleanText(text) {
  if (!text) return "";
  return text.replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").replace(/\[\d+\]/g, "").trim();
}

function isValidUrl(url) {
  if (!url) return false;
  try { new URL(url); return url.startsWith("http"); } catch { return false; }
}

function parseJSON(raw, bracket = "[") {
  if (!raw) return null;
  const cleaned = raw.replace(/```json|```/g, "").replace(/<cite[^>]*>/g, "").replace(/<\/cite>/g, "").trim();
  const open  = bracket === "[" ? cleaned.indexOf("[")  : cleaned.indexOf("{");
  const close = bracket === "[" ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (open === -1 || close === -1) return null;
  try { return JSON.parse(cleaned.substring(open, close + 1)); } catch { return null; }
}

function Badge({ label, cat }) {
  return (
    <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, padding: "2px 7px", background: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, borderRadius: 2, whiteSpace: "nowrap" }}>
      {label?.toUpperCase()}
    </span>
  );
}

function AgentStatus({ agent, status, dark }) {
  const t = useTheme(dark);
  const col = status === "done" ? "#22c55e" : status === "scanning" ? t.accent : t.textFaint;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 3 }}>
      <span style={{ color: col, fontSize: 9, animation: status === "scanning" ? "pulse 1s infinite" : "none" }}>
        {status === "done" ? "✓" : status === "scanning" ? "●" : "○"}
      </span>
      <span style={{ fontFamily: "monospace", fontSize: 10, color: col, letterSpacing: 1 }}>{agent.icon} {agent.label}</span>
      <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textMuted, marginLeft: "auto" }}>
        {status === "done" ? "COMPLETE" : status === "scanning" ? "SCANNING..." : "QUEUED"}
      </span>
    </div>
  );
}

function SkeletonCard({ dark, height = 180 }) {
  const t = useTheme(dark);
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 3, padding: 18, height, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,${t.accentDim},transparent)`, animation: "scan 1.5s infinite" }} />
      {[35, 100, 85, 70, 45].map((w, j) => (
        <div key={j} style={{ height: j === 0 || j === 4 ? 8 : 12, background: dark ? "#1a1a1a" : "#eeeeea", borderRadius: 2, width: `${w}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}

// ─── NEWS CARD — no urgency badge, clean signal, working full story ────────────
function NewsCard({ item, idx, dark }) {
  const t = useTheme(dark);
  const cat = t.cats[item.category] || t.cats.tools;
  const [voted, setVoted] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullArticle, setFullArticle] = useState("");
  const [loadingArticle, setLoadingArticle] = useState(false);

  const share = () => {
    navigator.clipboard?.writeText(`${cleanText(item.title)} — via WOAI (woai.vercel.app)`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const loadFullArticle = async () => {
    if (fullArticle) { setExpanded(e => !e); return; }
    setExpanded(true);
    setLoadingArticle(true);
    try {
      // Plain text request — no JSON format
      const raw = await apiCall("expand",
        `Write a 350 word analysis of this AI news story: "${cleanText(item.title)}". Cover: what happened, why it matters, background context, and what to watch next. Write in flowing paragraphs. Do not use bullet points. Do not return JSON.`
      );
      // Clean any accidental JSON that slips through
      const text = cleanText(raw);
      const looksLikeJSON = text.trim().startsWith("[") || text.trim().startsWith("{");
      setFullArticle(looksLikeJSON ? "Full analysis unavailable — please try again." : text);
    } catch (_) {
      setFullArticle("Unable to load full article.");
    }
    setLoadingArticle(false);
  };

  return (
    <div style={{ background: t.surface, border: `1px solid ${expanded ? cat.border : t.border}`, borderLeft: `3px solid ${cat.border}`, borderRadius: 3, padding: "16px 18px", opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${idx * 0.05}s`, display: "flex", flexDirection: "column", transition: "border-color 0.2s" }}>

      {/* Category badge only — no urgency indicator */}
      <div style={{ marginBottom: 10 }}>
        <Badge label={item.category} cat={cat} />
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.5, marginBottom: 8, fontFamily: "Georgia, serif" }}>
        {cleanText(item.title)}
      </h3>

      {/* Summary */}
      <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.7, marginBottom: 12, flex: 1 }}>
        {cleanText(item.summary)}
      </p>

      {/* Full article expansion */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14, marginBottom: 14 }}>
          {loadingArticle ? (
            <div style={{ fontFamily: "monospace", fontSize: 11, color: t.accent, animation: "pulse 1s infinite" }}>● GENERATING ANALYSIS...</div>
          ) : (
            <div style={{ fontSize: 13, color: t.textMid, lineHeight: 1.8 }}>{fullArticle}</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted }}>{item.source}</span>
          {isValidUrl(item.url) && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "monospace", fontSize: 9, color: cat.text, textDecoration: "none", padding: "2px 6px", border: `1px solid ${cat.border}`, borderRadius: 2 }}>
              SOURCE ↗
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={loadFullArticle} style={{ fontFamily: "monospace", fontSize: 9, padding: "3px 8px", borderRadius: 2, cursor: "pointer", background: expanded ? cat.bg : "transparent", border: `1px solid ${expanded ? cat.border : t.borderMid}`, color: expanded ? cat.text : t.textMuted }}>
            {expanded ? "▲ LESS" : "▼ FULL STORY"}
          </button>
          {["up","dn"].map(v => (
            <button key={v} onClick={() => setVoted(p => p===v?null:v)} style={{ fontFamily: "monospace", fontSize: 10, padding: "3px 8px", borderRadius: 2, cursor: "pointer", background: voted===v?(v==="up"?"#22c55e22":"#f8717122"):"transparent", border: `1px solid ${voted===v?(v==="up"?"#22c55e":"#f87171"):t.borderMid}`, color: voted===v?(v==="up"?"#22c55e":"#f87171"):t.textMuted }}>
              {v==="up"?"👍":"👎"}
            </button>
          ))}
          <button onClick={share} style={{ fontFamily: "monospace", fontSize: 10, padding: "3px 8px", borderRadius: 2, cursor: "pointer", background: "transparent", border: `1px solid ${t.borderMid}`, color: copied?"#22c55e":t.textMuted }}>
            {copied?"✓":"SHARE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VIDEO CARD ───────────────────────────────────────────────────────────────
function VideoCard({ item, idx, dark }) {
  const t = useTheme(dark);
  const ytUrl = item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : (isValidUrl(item.url) ? item.url : null);
  const thumbUrl = item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : null;

  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 3, opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${idx * 0.06}s`, overflow: "hidden" }}>
      {thumbUrl && (
        <div style={{ position: "relative", paddingTop: "56.25%", background: "#000", overflow: "hidden" }}>
          <img src={thumbUrl} alt={item.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {ytUrl && (
              <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ width: 48, height: 48, background: "rgba(255,0,0,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                <span style={{ color: "#fff", fontSize: 18, marginLeft: 3 }}>▶</span>
              </a>
            )}
          </div>
        </div>
      )}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, padding: "2px 7px", background: dark?"#1a0808":"#fff0f0", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 2 }}>▶ YOUTUBE</span>
        </div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.45, marginBottom: 6, fontFamily: "Georgia, serif" }}>{cleanText(item.title)}</h3>
        <p style={{ fontSize: 11, color: t.textMid, lineHeight: 1.6, marginBottom: 10 }}>{cleanText(item.summary)}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted }}>{item.channel}</span>
          {ytUrl && <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "monospace", fontSize: 9, color: "#ef4444", textDecoration: "none", padding: "2px 6px", border: "1px solid #ef444433", borderRadius: 2 }}>WATCH ↗</a>}
        </div>
      </div>
    </div>
  );
}

// ─── REDDIT CARD ──────────────────────────────────────────────────────────────
function RedditCard({ item, idx, dark }) {
  const t = useTheme(dark);
  const validUrl = isValidUrl(item.url) ? item.url : `https://reddit.com/r/${item.subreddit}`;
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: "3px solid #ff4500", borderRadius: 3, padding: "16px 18px", opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${idx * 0.06}s`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, padding: "2px 7px", background: dark?"#1a0a00":"#fff4f0", color: "#ff4500", border: "1px solid #ff450033", borderRadius: 2 }}>r/{item.subreddit}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {item.score > 0 && <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textMuted }}>▲ {item.score?.toLocaleString()}</span>}
          {item.comments > 0 && <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textMuted }}>💬 {item.comments}</span>}
        </div>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.5, marginBottom: 8, fontFamily: "Georgia, serif" }}>{cleanText(item.title)}</h3>
      <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.7, marginBottom: 10, flex: 1 }}>{cleanText(item.summary)}</p>
      {item.signal && (
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#ff4500", background: dark?"#1a0a00":"#fff4f0", border: "1px solid #ff450033", borderRadius: 2, padding: "4px 8px", marginBottom: 10 }}>
          ► {cleanText(item.signal)}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <a href={validUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "monospace", fontSize: 9, color: "#ff4500", textDecoration: "none", padding: "2px 6px", border: "1px solid #ff450033", borderRadius: 2 }}>THREAD ↗</a>
      </div>
    </div>
  );
}

// ─── TWITTER CARD — no broken links, search instead ──────────────────────────
function TwitterCard({ item, idx, dark }) {
  const t = useTheme(dark);
  const engColor = item.engagement === "viral" ? "#ef4444" : item.engagement === "trending" ? "#f59e0b" : "#22c55e";
  // Search X for the topic instead of broken direct links
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(cleanText(item.title).slice(0, 60))}&src=typed_query&f=live`;

  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderLeft: "3px solid #1d9bf0", borderRadius: 3, padding: "16px 18px", opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${idx * 0.06}s`, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, padding: "2px 7px", background: dark?"#00101a":"#f0f8ff", color: "#1d9bf0", border: "1px solid #1d9bf033", borderRadius: 2 }}>𝕏 TRENDING</span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: engColor, padding: "2px 6px", border: `1px solid ${engColor}33`, borderRadius: 2 }}>{item.engagement?.toUpperCase()}</span>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.5, marginBottom: 8, fontFamily: "Georgia, serif" }}>{cleanText(item.title)}</h3>
      <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.7, marginBottom: 10, flex: 1 }}>{cleanText(item.summary)}</p>
      {item.signal && (
        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1d9bf0", background: dark?"#00101a":"#f0f8ff", border: "1px solid #1d9bf033", borderRadius: 2, padding: "4px 8px", marginBottom: 10 }}>
          ► {cleanText(item.signal)}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted }}>{item.author}</span>
        {/* Search X for this topic instead of broken direct link */}
        <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "monospace", fontSize: 9, color: "#1d9bf0", textDecoration: "none", padding: "2px 6px", border: "1px solid #1d9bf033", borderRadius: 2 }}>
          SEARCH 𝕏 ↗
        </a>
      </div>
    </div>
  );
}

// ─── FEED PAGE ────────────────────────────────────────────────────────────────
function FeedPage({ dark, news, agentStatuses, lastUpdated, running, runAgents }) {
  const t = useTheme(dark);
  const [activeTab, setActiveTab] = useState("all");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const stats = { total: news.length, high: news.filter(n => n.urgency === "high").length, sources: new Set(news.map(n => n.source)).size };
  const filtered = activeTab === "all" ? news : news.filter(n => n.category === activeTab);
  const catDone = activeTab === "all" ? !running : agentStatuses[activeTab] === "done";
  const showSkeletons = !catDone && filtered.length === 0;

  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 12, color: t.textMuted, letterSpacing: 1, marginBottom: 6 }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase()}
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, lineHeight: 1.25, marginBottom: 8, maxWidth: 560 }}>Every AI move that matters, right now.</h1>
        <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>6 specialist agents scanning the web — models, money, research, tools, policy, and biotech.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[{ l: "SIGNALS", v: stats.total || "—" }, { l: "HIGH URGENCY", v: stats.high || "—" }, { l: "SOURCES", v: stats.sources || "—" }].map(s => (
            <div key={s.l}>
              <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: t.accent }}>{s.v}</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: t.textMuted, letterSpacing: 2 }}>{s.l}</div>
            </div>
          ))}
          {lastUpdated && <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textFaint }}>UPDATED {lastUpdated}</span>}
        </div>
        <button onClick={runAgents} disabled={running} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, padding: "9px 18px", background: running?"transparent":t.accent, border: `1px solid ${t.accent}`, color: running?t.textMuted:(dark?"#080808":"#fff"), cursor: running?"not-allowed":"pointer", borderRadius: 2, fontWeight: 700 }}>
          {running?"AGENTS RUNNING...":"↺ RUN ALL AGENTS"}
        </button>
      </div>
      {(running || Object.keys(agentStatuses).length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6, marginBottom: 20, padding: 14, background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 3 }}>
          <div style={{ gridColumn: "1/-1", fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: t.accent, marginBottom: 4 }}>AGENT STATUS BOARD</div>
          {AGENTS.map(agent => <AgentStatus key={agent.id} agent={agent} status={agentStatuses[agent.id] || "queued"} dark={dark} />)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)} style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1.5, padding: "5px 12px", background: activeTab===cat.id?t.accent:"transparent", color: activeTab===cat.id?(dark?"#080808":"#fff"):t.textMuted, border: `1px solid ${activeTab===cat.id?t.accent:t.border}`, cursor: "pointer", borderRadius: 2, fontWeight: activeTab===cat.id?700:400 }}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {showSkeletons ? [...Array(3)].map((_,i) => <SkeletonCard key={i} dark={dark} />)
            : filtered.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", fontFamily: "monospace", color: t.textMuted, letterSpacing: 2 }}>
                {running?"AGENTS WORKING...":"NO SIGNALS — CLICK RUN ALL AGENTS"}
              </div>
            ) : filtered.map((item, i) => <NewsCard key={i} item={item} idx={i} dark={dark} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 3, padding: 16 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: t.accent, marginBottom: 8 }}>BETA — STAY IN THE LOOP</div>
            <p style={{ fontSize: 12, color: t.textMid, marginBottom: 12, lineHeight: 1.6 }}>Get the daily AI brief. No noise, just signals.</p>
            {subscribed ? <div style={{ fontFamily: "monospace", fontSize: 11, color: "#22c55e" }}>✓ YOU'RE IN.</div> : (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ flex: 1, fontFamily: "monospace", fontSize: 11, padding: "7px 10px", background: t.surface, border: `1px solid ${t.border}`, color: t.text, borderRadius: 2, outline: "none" }} />
                <button onClick={() => email.includes("@") && setSubscribed(true)} style={{ fontFamily: "monospace", fontSize: 10, padding: "7px 12px", background: t.accent, border: "none", color: dark?"#080808":"#fff", cursor: "pointer", borderRadius: 2, fontWeight: 700 }}>JOIN</button>
              </div>
            )}
          </div>
          <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 3, padding: 16 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: t.textMuted, marginBottom: 10 }}>SIGNAL KEY</div>
            {Object.entries(t.cats).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ width: 3, height: 14, background: val.border, borderRadius: 1, flexShrink: 0 }} />
                <span style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted, letterSpacing: 1 }}>{key.toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div style={{ background: t.accentDim, border: `1px solid ${t.accent}33`, borderRadius: 3, padding: 14 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: t.accent, marginBottom: 6 }}>PRIVATE BETA</div>
            <p style={{ fontSize: 12, color: t.textMid, lineHeight: 1.6 }}>You're one of the first. Tell us what's missing or brilliant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VIDEOS PAGE ──────────────────────────────────────────────────────────────
function VideosPage({ dark, videos, videosLoading, loadVideos }) {
  const t = useTheme(dark);
  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, marginBottom: 8 }}>AI Video Intelligence</h1>
            <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>Latest videos from top AI creators — summarised so you get the insight in seconds.</p>
          </div>
          <button onClick={loadVideos} disabled={videosLoading} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, padding: "9px 18px", background: videosLoading?"transparent":t.accent, border: `1px solid ${t.accent}`, color: videosLoading?t.textMuted:(dark?"#080808":"#fff"), cursor: videosLoading?"not-allowed":"pointer", borderRadius: 2, fontWeight: 700 }}>
            {videosLoading?"SCANNING...":"↺ REFRESH VIDEOS"}
          </button>
        </div>
      </div>
      {videosLoading && videos.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[...Array(6)].map((_,i) => <SkeletonCard key={i} dark={dark} height={280} />)}
        </div>
      ) : videos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "monospace", color: t.textMuted, letterSpacing: 2 }}>NO VIDEOS YET — CLICK REFRESH VIDEOS</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {videos.map((item, i) => <VideoCard key={i} item={item} idx={i} dark={dark} />)}
        </div>
      )}
    </div>
  );
}

// ─── COMMUNITY PAGE ───────────────────────────────────────────────────────────
function CommunityPage({ dark, posts, postsLoading, loadPosts }) {
  const t = useTheme(dark);
  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, marginBottom: 8 }}>Community Intelligence</h1>
            <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>What the AI community is actually talking about — r/MachineLearning, r/LocalLLaMA, r/artificial and more.</p>
          </div>
          <button onClick={loadPosts} disabled={postsLoading} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, padding: "9px 18px", background: postsLoading?"transparent":t.accent, border: `1px solid ${t.accent}`, color: postsLoading?t.textMuted:(dark?"#080808":"#fff"), cursor: postsLoading?"not-allowed":"pointer", borderRadius: 2, fontWeight: 700 }}>
            {postsLoading?"SCANNING...":"↺ REFRESH REDDIT"}
          </button>
        </div>
      </div>
      {postsLoading && posts.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[...Array(6)].map((_,i) => <SkeletonCard key={i} dark={dark} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "monospace", color: t.textMuted, letterSpacing: 2 }}>NO POSTS YET — CLICK REFRESH REDDIT</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {posts.map((item, i) => <RedditCard key={i} item={item} idx={i} dark={dark} />)}
        </div>
      )}
    </div>
  );
}

// ─── TRENDING PAGE ────────────────────────────────────────────────────────────
function TrendingPage({ dark, tweets, tweetsLoading, loadTweets }) {
  const t = useTheme(dark);
  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, marginBottom: 8 }}>Trending on 𝕏</h1>
            <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>What AI Twitter is buzzing about — click SEARCH 𝕏 to see the live discussion.</p>
          </div>
          <button onClick={loadTweets} disabled={tweetsLoading} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, padding: "9px 18px", background: tweetsLoading?"transparent":t.accent, border: `1px solid ${t.accent}`, color: tweetsLoading?t.textMuted:(dark?"#080808":"#fff"), cursor: tweetsLoading?"not-allowed":"pointer", borderRadius: 2, fontWeight: 700 }}>
            {tweetsLoading?"SCANNING...":"↺ REFRESH TRENDS"}
          </button>
        </div>
      </div>
      {tweetsLoading && tweets.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {[...Array(6)].map((_,i) => <SkeletonCard key={i} dark={dark} />)}
        </div>
      ) : tweets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "monospace", color: t.textMuted, letterSpacing: 2 }}>NO TRENDS YET — CLICK REFRESH TRENDS</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {tweets.map((item, i) => <TwitterCard key={i} item={item} idx={i} dark={dark} />)}
        </div>
      )}
    </div>
  );
}

// ─── LEADERBOARD PAGE ─────────────────────────────────────────────────────────
function LeaderboardPage({ dark, lbData, lbLoading, lbLastFetch, loadLeaderboard }) {
  const t = useTheme(dark);
  const medals = ["🥇","🥈","🥉"];
  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, marginBottom: 8 }}>Best AI For Every Job</h1>
        <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>Live rankings from AI agents scanning benchmarks, reviews, and real-world usage.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        {lbLastFetch && <span style={{ fontFamily: "monospace", fontSize: 10, color: t.textMuted }}>LAST SCANNED: {lbLastFetch}</span>}
        <button onClick={loadLeaderboard} disabled={lbLoading} style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, padding: "9px 18px", background: lbLoading?"transparent":t.accent, border: `1px solid ${t.accent}`, color: lbLoading?t.textMuted:(dark?"#080808":"#fff"), cursor: lbLoading?"not-allowed":"pointer", borderRadius: 2, fontWeight: 700 }}>
          {lbLoading?"SCANNING...":"↺ REFRESH RANKINGS"}
        </button>
      </div>
      {lbLoading && Object.keys(lbData).length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {LEADERBOARD_FIELDS.map((_,i) => <SkeletonCard key={i} dark={dark} height={160} />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {LEADERBOARD_FIELDS.map((field, fi) => (
            <div key={field} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 3, padding: 20, opacity: 0, animation: "fadeUp 0.4s ease forwards", animationDelay: `${fi*0.07}s` }}>
              <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: t.accent, marginBottom: 14 }}>{field.toUpperCase()}</div>
              {lbData[field] ? lbData[field].slice(0,3).map((item,i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{medals[i]}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 3 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: t.textMid, lineHeight: 1.5 }}>{item.reason}</div>
                  </div>
                </div>
              )) : <div style={{ fontFamily: "monospace", fontSize: 11, color: t.textFaint }}>LOADING...</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUBMIT PAGE ──────────────────────────────────────────────────────────────
function SubmitPage({ dark }) {
  const t = useTheme(dark);
  const [form, setForm] = useState({ name:"", email:"", category:"models", tip:"", source:"" });
  const [submitted, setSubmitted] = useState(false);
  const set = (k,v) => setForm(prev => ({...prev,[k]:v}));
  return (
    <div>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: t.text, marginBottom: 8 }}>Submit a Signal</h1>
        <p style={{ fontSize: 13, color: t.textMid, maxWidth: 480 }}>Spotted something the agents missed? Drop it here. Good tips get featured.</p>
      </div>
      {submitted ? (
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 3, padding: 32, textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#22c55e", letterSpacing: 2, marginBottom: 8 }}>✓ SIGNAL RECEIVED</div>
          <p style={{ fontSize: 13, color: t.textMid, marginBottom: 16 }}>Our agents will review your tip. If it checks out, it goes live in the next brief.</p>
          <button onClick={() => { setSubmitted(false); setForm({name:"",email:"",category:"models",tip:"",source:""}); }} style={{ fontFamily: "monospace", fontSize: 10, padding: "8px 16px", background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, cursor: "pointer", borderRadius: 2 }}>SUBMIT ANOTHER</button>
        </div>
      ) : (
        <div style={{ maxWidth: 540 }}>
          {[{label:"YOUR NAME (optional)",key:"name",type:"text",ph:"Anonymous is fine"},{label:"EMAIL (optional)",key:"email",type:"email",ph:"Only if you want credit"},{label:"SOURCE / LINK",key:"source",type:"text",ph:"URL or publication name"}].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, display: "block", marginBottom: 6 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.ph} style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: "9px 12px", background: t.surface, border: `1px solid ${t.border}`, color: t.text, borderRadius: 2, outline: "none" }} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, display: "block", marginBottom: 6 }}>CATEGORY</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: "9px 12px", background: t.surface, border: `1px solid ${t.border}`, color: t.text, borderRadius: 2, outline: "none", cursor: "pointer" }}>
              {CATEGORIES.filter(c => c.id !== "all").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: t.textMuted, display: "block", marginBottom: 6 }}>THE SIGNAL *</label>
            <textarea value={form.tip} onChange={e => set("tip", e.target.value)} placeholder="What did you spot? Be specific — who, what, why it matters." rows={5} style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: "9px 12px", background: t.surface, border: `1px solid ${t.border}`, color: t.text, borderRadius: 2, outline: "none", resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <button onClick={() => form.tip.length>10 && setSubmitted(true)} style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 2, padding: "11px 24px", background: form.tip.length>10?t.accent:"transparent", border: `1px solid ${form.tip.length>10?t.accent:t.border}`, color: form.tip.length>10?(dark?"#080808":"#fff"):t.textMuted, cursor: form.tip.length>10?"pointer":"not-allowed", borderRadius: 2, fontWeight: 700 }}>SUBMIT SIGNAL →</button>
        </div>
      )}
    </div>
  );
}

function AboutPage({ dark }) {
  const t = useTheme(dark);
  const sections = [
    { title: "What is WOAI?", body: "WOAI (World of AI) is an AI-native intelligence platform monitoring the global AI landscape in real time. Specialist agents scan news, YouTube, Reddit, and Twitter simultaneously — no editors, no agendas, no hype." },
    { title: "How does it work?", body: "Specialist AI agents run in parallel across multiple verticals: model releases, funding, research, tools, geopolitics, and bio+AI. They search the web, extract signals, and surface what actually matters." },
    { title: "Why no hype?", body: "99% of AI news coverage is PR-driven cheerleading or panic. We built WOAI because serious builders, investors, and thinkers needed a feed that treats them like adults." },
    { title: "Who is this for?", body: "AI founders, investors, researchers, CTOs, and anyone who needs to stay genuinely informed without spending 3 hours a day reading newsletters." },
    { title: "This is Beta", body: "WOAI is in private beta. Sharing with a small trusted group first. Your feedback directly shapes what this becomes." },
  ];
  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ padding: "28px 0 20px", borderBottom: `1px solid ${t.border}`, marginBottom: 32 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 3, color: t.accent, marginBottom: 10 }}>ABOUT WOAI</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: t.text, marginBottom: 10, lineHeight: 1.25 }}>No hype.<br />No agenda.<br />Just signal.</h1>
        <p style={{ fontSize: 14, color: t.textMid, lineHeight: 1.7 }}>The Reuters of AI — built by people who actually think about this stuff.</p>
      </div>
      {sections.map((s,i) => (
        <div key={i} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i<sections.length-1?`1px solid ${t.border}`:"none" }}>
          <h2 style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 2, color: t.accent, marginBottom: 10 }}>{s.title.toUpperCase()}</h2>
          <p style={{ fontSize: 14, color: t.textMid, lineHeight: 1.8 }}>{s.body}</p>
        </div>
      ))}
      <div style={{ background: t.accentDim, border: `1px solid ${t.accent}33`, borderRadius: 3, padding: 20 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: t.accent, marginBottom: 8 }}>BETA STATUS</div>
        <p style={{ fontSize: 13, color: t.textMid, lineHeight: 1.7 }}>You're one of the first people to see WOAI. Your feedback directly shapes what this becomes.</p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function WOAI() {
  const [page, setPage] = useState("FEED");
  const [dark, setDark] = useState(false);
  const t = useTheme(dark);

  const [news, setNews] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [running, setRunning] = useState(false);

  const [lbData, setLbData] = useState({});
  const [lbLoading, setLbLoading] = useState(false);
  const [lbLastFetch, setLbLastFetch] = useState(null);
  const [lbLoaded, setLbLoaded] = useState(false);

  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);

  const [tweets, setTweets] = useState([]);
  const [tweetsLoading, setTweetsLoading] = useState(false);
  const [tweetsLoaded, setTweetsLoaded] = useState(false);

  const runAgents = useCallback(async () => {
    setRunning(true); setNews([]); setAgentStatuses({});
    for (const agent of AGENTS) {
      setAgentStatuses(prev => ({ ...prev, [agent.id]: "scanning" }));
      try {
        const raw = await apiCall(agent.id, agent.focus);
        const parsed = parseJSON(raw, "[");
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setNews(prev => [...prev, ...parsed.map(item => ({ ...item, category: agent.id }))]);
        }
      } catch (_) {}
      setAgentStatuses(prev => ({ ...prev, [agent.id]: "done" }));
    }
    setLastUpdated(new Date().toLocaleTimeString());
    setRunning(false);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const raw = await apiCall("leaderboard", "");
      const parsed = parseJSON(raw, "{");
      if (parsed) { setLbData(parsed); setLbLastFetch(new Date().toLocaleTimeString()); setLbLoaded(true); }
    } catch (_) {}
    setLbLoading(false);
  }, []);

  const loadVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const raw = await youtubeCall();
      const parsed = parseJSON(raw, "[");
      if (parsed && Array.isArray(parsed)) { setVideos(parsed); setVideosLoaded(true); }
    } catch (_) {}
    setVideosLoading(false);
  }, []);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const raw = await redditCall();
      const parsed = parseJSON(raw, "[");
      if (parsed && Array.isArray(parsed)) { setPosts(parsed); setPostsLoaded(true); }
    } catch (_) {}
    setPostsLoading(false);
  }, []);

  const loadTweets = useCallback(async () => {
    setTweetsLoading(true);
    try {
      const raw = await twitterCall();
      const parsed = parseJSON(raw, "[");
      if (parsed && Array.isArray(parsed)) { setTweets(parsed); setTweetsLoaded(true); }
    } catch (_) {}
    setTweetsLoading(false);
  }, []);

  useEffect(() => { runAgents(); }, []);
  useEffect(() => { if (!lbLoaded) loadLeaderboard(); }, [lbLoaded]);
  useEffect(() => {
    if (page === "VIDEOS"    && !videosLoaded && !videosLoading)  loadVideos();
    if (page === "COMMUNITY" && !postsLoaded  && !postsLoading)   loadPosts();
    if (page === "TRENDING"  && !tweetsLoaded && !tweetsLoading)  loadTweets();
  }, [page]);

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes scan   { 0%{transform:translateX(-100%)} 100%{transform:translateX(500%)} }
        input::placeholder, textarea::placeholder { color: ${t.textFaint}; }
        a { color: inherit; }
      `}</style>

      <nav style={{ borderBottom: `1px solid ${t.border}`, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: t.bg, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", height: 54 }}>
          <div onClick={() => setPage("FEED")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 6, marginRight: 16 }}>
            <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, letterSpacing: 4, color: t.accent }}>WOAI</span>
            <span style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: 2, color: t.textMuted, display: "none" }}>WORLD OF AI</span>
          </div>
          <div style={{ display: "flex" }}>
            {NAV.map(n => (
              <button key={n} onClick={() => setPage(n)} style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 1, padding: "0 9px", height: 54, background: "transparent", border: "none", borderBottom: page===n?`2px solid ${t.accent}`:"2px solid transparent", color: page===n?t.accent:t.textMuted, cursor: "pointer", fontWeight: page===n?700:400, whiteSpace: "nowrap" }}>{n}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: running?t.accent:"#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "monospace", fontSize: 9, color: running?t.accent:"#22c55e", letterSpacing: 2 }}>{running?"SCANNING":"LIVE"}</span>
          </div>
          <div style={{ width: 1, height: 18, background: t.border }} />
          <button onClick={() => setDark(d => !d)} style={{ fontFamily: "monospace", fontSize: 11, padding: "6px 12px", background: dark?"#1c1c1c":"#ededea", border: `1px solid ${t.border}`, color: t.text, cursor: "pointer", borderRadius: 2 }}>{dark?"☀":"☾"}</button>
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {page === "FEED"        && <FeedPage dark={dark} news={news} agentStatuses={agentStatuses} lastUpdated={lastUpdated} running={running} runAgents={runAgents} />}
        {page === "VIDEOS"      && <VideosPage dark={dark} videos={videos} videosLoading={videosLoading} loadVideos={loadVideos} />}
        {page === "COMMUNITY"   && <CommunityPage dark={dark} posts={posts} postsLoading={postsLoading} loadPosts={loadPosts} />}
        {page === "TRENDING"    && <TrendingPage dark={dark} tweets={tweets} tweetsLoading={tweetsLoading} loadTweets={loadTweets} />}
        {page === "LEADERBOARD" && <LeaderboardPage dark={dark} lbData={lbData} lbLoading={lbLoading} lbLastFetch={lbLastFetch} loadLeaderboard={loadLeaderboard} />}
        {page === "SUBMIT TIP"  && <SubmitPage dark={dark} />}
        {page === "ABOUT"       && <AboutPage dark={dark} />}
      </main>

      <footer style={{ borderTop: `1px solid ${t.border}`, margin: "40px 24px 0", padding: "20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 3, color: t.accent }}>WOAI — WORLD OF AI</span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textMuted }}>PRIVATE BETA — NOT FOR REDISTRIBUTION</span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: t.textFaint }}>{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
