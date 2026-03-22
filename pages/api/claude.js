export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    const { agentId, agentFocus } = req.body;

    // ── EXPAND: full article — plain text only, no JSON ──────────────────────
    if (agentId === "expand") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{ role: "user", content: agentFocus }],
        }),
      });
      const d = await r.json();
      return res.status(200).json({ text: d.content?.[0]?.text || "Unable to load full article." });
    }

    // ── LEADERBOARD ──────────────────────────────────────────────────────────
    if (agentId === "leaderboard") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: `List the best AI tools right now for: Coding, Writing, Image Gen, Research, Video, Voice, Data Analysis, Agents. Top 3 per category with one-line reason. Return ONLY this JSON with no other text: {"Coding":[{"name":"tool","reason":"why"}],"Writing":[{"name":"tool","reason":"why"}],"Image Gen":[{"name":"tool","reason":"why"}],"Research":[{"name":"tool","reason":"why"}],"Video":[{"name":"tool","reason":"why"}],"Voice":[{"name":"tool","reason":"why"}],"Data Analysis":[{"name":"tool","reason":"why"}],"Agents":[{"name":"tool","reason":"why"}]}` }],
        }),
      });
      const d = await r.json();
      return res.status(200).json({ text: d.content?.[0]?.text || "{}" });
    }

    // ── NEWS AGENTS ──────────────────────────────────────────────────────────
    let articles = "";
    if (tavilyKey && agentFocus) {
      try {
        const t = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyKey, query: `${agentFocus} news March 2026`, search_depth: "basic", max_results: 6 }),
        });
        const td = await t.json();
        if (td.results?.length > 0) {
          articles = td.results.map((r, i) => `[${i+1}] TITLE: ${r.title}\nSUMMARY: ${r.content?.slice(0, 300)}\nURL: ${r.url}`).join("\n\n");
        }
      } catch (_) {}
    }

    const prompt = `You are an AI news analyst. ${articles ? `Based on these real web articles:\n\n${articles}\n\n` : ""}Return ONLY a JSON array of exactly 3 news items. Nothing before or after the array:
[{"title":"headline","summary":"2-3 sentence summary of what happened and why it matters","category":"${agentId}","urgency":"high","source":"Publication Name","url":"https://actual-url","signal":"WATCH/TRACK key insight 4-6 words"}]`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json();
    return res.status(200).json({ text: d.content?.[0]?.text || "[]" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
