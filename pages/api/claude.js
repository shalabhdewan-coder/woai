export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    const { agentId, agentFocus } = req.body;

    // ── LEADERBOARD: just ask Claude directly, no Tavily needed ──
    if (agentId === "leaderboard") {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `List the best AI tools right now for: Coding, Writing, Image Gen, Research, Video, Voice, Data Analysis, Agents.
For each give top 3 tools with a one-line reason why.
Return ONLY this raw JSON, nothing else, no markdown:
{"Coding":[{"name":"X","reason":"..."},{"name":"Y","reason":"..."},{"name":"Z","reason":"..."}],"Writing":[...],"Image Gen":[...],"Research":[...],"Video":[...],"Voice":[...],"Data Analysis":[...],"Agents":[...]}`,
          }],
        }),
      });
      const data = await claudeRes.json();
      const text = data.content?.[0]?.text || "{}";
      return res.status(200).json({ text });
    }

    // ── NEWS AGENTS: Tavily search + Claude analysis ──
    let articles = "";
    if (tavilyKey && agentFocus) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${agentFocus} news March 2026`,
            search_depth: "basic",
            max_results: 6,
          }),
        });
        const tavilyData = await tavilyRes.json();
        if (tavilyData.results?.length > 0) {
          articles = tavilyData.results
            .map((r, i) => `[${i + 1}] ${r.title} | ${r.content?.slice(0, 200)} | SOURCE: ${r.url}`)
            .join("\n");
        }
      } catch (_) {}
    }

    const prompt = articles
      ? `You are an AI news analyst. Based on these real articles:\n\n${articles}\n\nExtract exactly 3 news signals. Return ONLY this JSON array, nothing else:\n[{"title":"...","summary":"one sentence","category":"${agentId}","urgency":"high","source":"publication name","signal":"WATCH insight here"}]`
      : `You are an AI news analyst. List 3 recent AI news items about: ${agentFocus}. Return ONLY this JSON array:\n[{"title":"...","summary":"one sentence","category":"${agentId}","urgency":"high","source":"publication name","signal":"WATCH insight here"}]`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await claudeRes.json();
    const text = data.content?.[0]?.text || "[]";
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
