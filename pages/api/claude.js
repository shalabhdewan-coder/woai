export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    const { agentId, agentFocus } = req.body;

    // LEADERBOARD — straight to Claude, no Tavily
    if (agentId === "leaderboard") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: `Give me the best AI tools right now for: Coding, Writing, Image Gen, Research, Video, Voice, Data Analysis, Agents. Top 3 per category with one-line reason. Return ONLY raw JSON like this with no extra text: {"Coding":[{"name":"X","reason":"why"}],"Writing":[{"name":"X","reason":"why"}],"Image Gen":[{"name":"X","reason":"why"}],"Research":[{"name":"X","reason":"why"}],"Video":[{"name":"X","reason":"why"}],"Voice":[{"name":"X","reason":"why"}],"Data Analysis":[{"name":"X","reason":"why"}],"Agents":[{"name":"X","reason":"why"}]}` }],
        }),
      });
      const d = await r.json();
      return res.status(200).json({ text: d.content?.[0]?.text || "{}" });
    }

    // NEWS AGENTS — Tavily search + Claude analysis
    let articles = "";
    if (tavilyKey) {
      try {
        const t = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyKey, query: `${agentFocus} news March 2026`, search_depth: "basic", max_results: 6 }),
        });
        const td = await t.json();
        if (td.results?.length > 0) {
          articles = td.results.map((r, i) => `[${i+1}] TITLE: ${r.title} | SUMMARY: ${r.content?.slice(0, 250)}`).join("\n\n");
        }
      } catch (_) {}
    }

    const prompt = `You are an AI news analyst. ${articles ? `Based on these real articles:\n\n${articles}\n\n` : ""}Return ONLY a JSON array of exactly 3 news items, nothing else before or after the array:
[{"title":"headline","summary":"one sentence summary","category":"${agentId}","urgency":"high","source":"Source Name","signal":"WATCH key insight"}]`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json();
    return res.status(200).json({ text: d.content?.[0]?.text || "[]" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
