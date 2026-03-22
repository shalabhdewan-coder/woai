export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const youtubeKey = process.env.YOUTUBE_API_KEY;

  const TOP_AI_CHANNELS = [
    "UCXZCJLdBC09xxGZ6gcdrc6A", // Fireship
    "UCWX3yGbODI3nMnBQHkYFQoQ", // Two Minute Papers
    "UCbfYPyITQ-7l4upoX8nvctg", // Two Minute Papers alt
    "UCSHZKyawb77ixDdsGog4iWA", // Lex Fridman
    "UCnUYZLuoy1rq1aVMwx4aTzw", // Google DeepMind
    "UC9-y-6csu5WGm29I7JiwpnA", // Computerphile
    "UCMLtBahI5DMrt0ym1p5zDTA", // Matt Wolfe
    "UCVls1GmFKf6WlTraIb_IaJg", // Wes Roth
  ];

  try {
    let videos = [];

    if (youtubeKey) {
      // Fetch latest videos from each channel
      const channelPromises = TOP_AI_CHANNELS.slice(0, 5).map(async (channelId) => {
        try {
          const r = await fetch(
            `https://www.googleapis.com/youtube/v3/search?key=${youtubeKey}&channelId=${channelId}&part=snippet&order=date&maxResults=2&type=video&publishedAfter=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`
          );
          const d = await r.json();
          return d.items || [];
        } catch { return []; }
      });

      const results = await Promise.all(channelPromises);
      const allVideos = results.flat();

      // Format for Claude
      const videoList = allVideos.slice(0, 10).map((v, i) =>
        `[${i+1}] TITLE: ${v.snippet?.title} | CHANNEL: ${v.snippet?.channelTitle} | DATE: ${v.snippet?.publishedAt?.slice(0,10)} | VIDEO_ID: ${v.id?.videoId} | DESCRIPTION: ${v.snippet?.description?.slice(0, 200)}`
      ).join("\n\n");

      if (videoList) {
        // Ask Claude to summarize and rank
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            messages: [{
              role: "user",
              content: `Based on these recent AI YouTube videos:\n\n${videoList}\n\nReturn ONLY a JSON array of the top 6 most interesting videos. No other text:\n[{"title":"video title","channel":"channel name","summary":"2 sentence summary of what this video covers and why it matters","videoId":"the video_id","relevance":"high/medium","signal":"KEY insight in 4-5 words"}]`
            }],
          }),
        });
        const d = await claudeRes.json();
        const text = d.content?.[0]?.text || "[]";
        return res.status(200).json({ text });
      }
    }

    // Fallback: use Tavily to find AI YouTube content
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      const t = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: "top AI YouTube videos this week 2026 artificial intelligence",
          search_depth: "basic",
          max_results: 8,
          include_domains: ["youtube.com", "youtu.be"],
        }),
      });
      const td = await t.json();
      const videoList = td.results?.map((r, i) =>
        `[${i+1}] TITLE: ${r.title} | URL: ${r.url} | SUMMARY: ${r.content?.slice(0, 200)}`
      ).join("\n\n") || "";

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `Based on these AI YouTube videos:\n\n${videoList}\n\nReturn ONLY a JSON array of top 6 videos. Extract videoId from YouTube URLs. No other text:\n[{"title":"video title","channel":"channel name","summary":"2 sentence summary","videoId":"youtube-video-id-here","relevance":"high","signal":"KEY insight 4-5 words"}]`
          }],
        }),
      });
      const d = await claudeRes.json();
      return res.status(200).json({ text: d.content?.[0]?.text || "[]" });
    }

    return res.status(200).json({ text: "[]" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
