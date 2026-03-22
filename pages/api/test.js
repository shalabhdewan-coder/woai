export default async function handler(req, res) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  // Test 1: Check keys exist
  if (!anthropicKey) return res.status(200).json({ step: "FAIL", msg: "No Anthropic key" });
  if (!tavilyKey) return res.status(200).json({ step: "FAIL", msg: "No Tavily key" });

  // Test 2: Try Tavily
  let tavilyOk = false;
  let tavilyArticles = "";
  try {
    const t = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: "OpenAI news March 2026",
        search_depth: "basic",
        max_results: 3,
      }),
    });
    const td = await t.json();
    tavilyOk = td.results?.length > 0;
    tavilyArticles = td.results?.map(r => r.title).join(" | ") || "no results";
  } catch (e) {
    tavilyArticles = "ERROR: " + e.message;
  }

  // Test 3: Try Claude with simple prompt
  let claudeOk = false;
  let claudeRaw = "";
  try {
    const c = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: 'Return exactly this JSON and nothing else: [{"title":"test","summary":"test summary","category":"models","urgency":"high","source":"Test","signal":"TEST signal"}]' }],
      }),
    });
    const cd = await c.json();
    claudeRaw = cd.content?.[0]?.text || JSON.stringify(cd);
    claudeOk = claudeRaw.includes("[");
  } catch (e) {
    claudeRaw = "ERROR: " + e.message;
  }

  return res.status(200).json({
    anthropicKey: "✓ exists",
    tavilyKey: "✓ exists",
    tavilyWorking: tavilyOk,
    tavilyTitles: tavilyArticles,
    claudeWorking: claudeOk,
    claudeRawResponse: claudeRaw,
  });
}
