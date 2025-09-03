// api/generate-avatar.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: `Square portrait avatar, crisp line art, subtle texture, softly lit, centered, clean edge lighting. Persona: ${prompt}`,
        size: "1024x1024",   // ✅ valid size
        n: 1,
        quality: "high"
      }),
    });

    if (!r.ok) {
      const errTxt = await r.text();
      return res.status(500).json({ error: errTxt });
    }

    const data = await r.json();
    const item = data?.data?.[0];

    const b64 = item?.b64_json;
    const url = item?.url;

    if (b64) {
      return res.status(200).json({ dataUrl: `data:image/png;base64,${b64}` });
    }
    if (url) {
      return res.status(200).json({ dataUrl: url });
    }

    return res.status(500).json({ error: "No image returned" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unexpected error" });
  }
}
