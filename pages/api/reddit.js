export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!anthropicKey) return res.status(500).json({ error: "No API key" });

  try {
    let redditContent = "";

    // Use Tavily to search Reddit — works reliably from server
    if (tavilyKey) {
      try {
        const queries = [
          "site:reddit.com r/MachineLearning r/LocalLLaMA AI news 2026",
          "site:reddit.com r/artificial r/ChatGPT trending AI discussion March 2026",
        ];

        const results = [];
        for (const query of queries) {
          const t = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: tavilyKey, query, search_depth: "basic", max_results: 5 }),
          });
          const td = await t.json();
          if (td.results?.length) results.push(...td.results);
        }

        redditContent = results.slice(0, 10).map((r, i) => {
          const subreddit = r.url?.match(/reddit\.com\/r\/([^/]+)/)?.[1] || "artificial";
          return `[${i+1}] r/${subreddit} | TITLE: ${r.title} | URL: ${r.url} | CONTENT: ${r.content?.slice(0, 250)}`;
        }).join("\n\n");

      } catch (_) {}
    }

    const prompt = `${redditContent ? `Based on these real Reddit posts and discussions:\n\n${redditContent}\n\n` : ""}Generate 6 hot Reddit AI community posts that would be trending right now in March 2026 across r/MachineLearning, r/LocalLLaMA, r/artificial, r/ChatGPT.

Return ONLY this JSON array, nothing else:
[{"title":"post title","subreddit":"MachineLearning","summary":"2 sentence explanation of the discussion and why community is engaged","url":"https://reddit.com/r/subreddit/...","score":1250,"comments":340,"signal":"TRENDING insight 4-5 words","urgency":"high"}]`;

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
