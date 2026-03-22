export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!anthropicKey) return res.status(500).json({ error: "No Anthropic API key" });

  try {
    let twitterContent = "";

    // Use Tavily to search Twitter/X for trending AI content
    if (tavilyKey) {
      try {
        const queries = [
          "site:twitter.com OR site:x.com AI artificial intelligence trending 2026",
          "AI machine learning viral thread twitter march 2026",
        ];

        const results = [];
        for (const query of queries) {
          const t = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              search_depth: "basic",
              max_results: 5,
            }),
          });
          const td = await t.json();
          if (td.results?.length) results.push(...td.results);
        }

        twitterContent = results.slice(0, 10).map((r, i) =>
          `[${i+1}] TITLE: ${r.title} | URL: ${r.url} | CONTENT: ${r.content?.slice(0, 300)}`
        ).join("\n\n");
      } catch (_) {}
    }

    // Also search for trending AI topics generally
    const generalSearch = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `${twitterContent ? `Based on these trending AI Twitter/X posts and threads:\n\n${twitterContent}\n\n` : ""}Generate 6 trending AI discussion topics that the AI Twitter community would be buzzing about right now in March 2026. Focus on: model releases, AI safety debates, new tools, industry drama, research breakthroughs.

Return ONLY this JSON array, no other text:
[{"title":"thread or topic title","author":"@relevant_account or 'AI Community'","summary":"2 sentence summary of what people are discussing and why it's trending","url":"https://x.com/relevant or #topic","engagement":"viral/trending/rising","signal":"HOT insight in 4-5 words"}]`
        }],
      }),
    });

    const d = await generalSearch.json();
    return res.status(200).json({ text: d.content?.[0]?.text || "[]" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
