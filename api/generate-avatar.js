// api/generate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `Avatar portrait of persona: ${prompt}`,
        size: "512x512",
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }

    const data = await r.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: "No image returned" });
    }

    return res
      .status(200)
      .json({ dataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
