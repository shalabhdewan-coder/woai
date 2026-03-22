export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const SUBREDDITS = [
    "MachineLearning",
    "LocalLLaMA", 
    "artificial",
    "ChatGPT",
    "singularity",
    "OpenAI",
  ];

  try {
    const allPosts = [];

    // Fetch top posts from each subreddit — no API key needed
    for (const sub of SUBREDDITS.slice(0, 4)) {
      try {
        const r = await fetch(
          `https://www.reddit.com/r/${sub}/hot.json?limit=5`,
          { headers: { "User-Agent": "WOAI-Intelligence-Bot/1.0" } }
        );
        const d = await r.json();
        const posts = d?.data?.children?.map(p => ({
          subreddit: sub,
          title: p.data.title,
          score: p.data.score,
          comments: p.data.num_comments,
          url: `https://reddit.com${p.data.permalink}`,
          selftext: p.data.selftext?.slice(0, 200) || "",
          flair: p.data.link_flair_text || "",
        })) || [];
        allPosts.push(...posts);
      } catch (_) {}
    }

    if (allPosts.length === 0) {
      return res.status(200).json({ text: "[]" });
    }

    // Sort by score + comments velocity
    allPosts.sort((a, b) => (b.score + b.comments * 5) - (a.score + a.comments * 5));
    const topPosts = allPosts.slice(0, 12);

    const postList = topPosts.map((p, i) =>
      `[${i+1}] r/${p.subreddit} | TITLE: ${p.title} | SCORE: ${p.score} | COMMENTS: ${p.comments} | URL: ${p.url} | PREVIEW: ${p.selftext}`
    ).join("\n\n");

    // Claude extracts the real intelligence
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `These are the hottest AI Reddit posts right now:\n\n${postList}\n\nExtract the 6 most significant posts that indicate real trends or breaking news in AI. Return ONLY this JSON array, no other text:\n[{"title":"post title","subreddit":"subreddit name","summary":"2 sentence explanation of what this post is about and why the community is excited","url":"reddit url","score":1234,"signal":"TRENDING insight in 4-5 words","urgency":"high/medium/low"}]`
        }],
      }),
    });

    const d = await claudeRes.json();
    return res.status(200).json({ text: d.content?.[0]?.text || "[]" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
