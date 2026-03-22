// Smart two-step approach:
// Step 1: Tavily searches the web fast (2-3 seconds)
// Step 2: Claude reads results and extracts signals (3-5 seconds)
// Total: ~7 seconds vs 300 seconds with Claude web search

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    const { messages } = req.body;
    const userPrompt = messages?.[0]?.content || "";

    // Extract the focus topic from the prompt
    const focusMatch = userPrompt.match(/focused on: (.+?)\./);
    const searchQuery = focusMatch
      ? `latest AI news ${focusMatch[1]} 2025`
      : "latest AI news today 2025";

    let contextText = "";

    // Step 1: Search web with Tavily (fast - 2-3 seconds)
    if (tavilyKey) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: searchQuery,
            search_depth: "basic",
            max_results: 8,
            include_answer: false,
            include_raw_content: false,
          }),
        });
        const tavilyData = await tavilyRes.json();
        if (tavilyData.results?.length > 0) {
          contextText = tavilyData.results
            .map(r => `SOURCE: ${r.source || r.url}\nTITLE: ${r.title}\nSUMMARY: ${r.content?.slice(0, 300)}`)
            .join("\n\n");
        }
      } catch (_) {
        // Tavily failed silently — Claude will use its own knowledge
      }
    }

    // Step 2: Claude analyses results and writes signal cards (3-5 seconds)
    const enhancedPrompt = contextText
      ? `${userPrompt}\n\nUse these REAL fresh web articles:\n\n${contextText}\n\nNow return the JSON array based on these real articles.`
      : userPrompt;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: enhancedPrompt }],
      }),
    });

    const data = await claudeRes.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
