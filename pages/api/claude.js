export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    const { agentId, agentFocus } = req.body;

    // Step 1: Tavily searches web (2-3 seconds)
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
            include_answer: false,
            include_raw_content: false,
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

    // Step 2: Claude extracts signals (3-5 seconds)
    const prompt = articles
      ? `You are an AI news analyst. Based on these real articles:\n\n${articles}\n\nExtract exactly 3 news signals. Return ONLY this JSON array, no other text:\n[{"title":"headline here","summary":"one sentence summary","category":"${agentId}","urgency":"high","source":"publication name","signal":"WATCH key insight"}]`
      : `You are an AI news analyst. Generate 3 recent AI news items about: ${agentFocus}. Return ONLY this JSON array, no other text:\n[{"title":"headline here","summary":"one sentence summary","category":"${agentId}","urgency":"high","source":"publication name","signal":"WATCH key insight"}]`;

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
