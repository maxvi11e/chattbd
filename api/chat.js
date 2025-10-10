// /api/chat.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
  const { persona, avatarName, personalityTraits, message, history, temperature, presencePenalty, frequencyPenalty, stream } = await req.json();

    if (!message || !persona) {
      return new Response(JSON.stringify({ error: 'Missing persona or message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nameText = avatarName ? ` Your name is ${avatarName}.` : '';
    const traitsText = personalityTraits ? ` Personality: ${personalityTraits}.` : '';
    const sys = `You are the persona described by the user: "${persona}".${nameText}${traitsText} 
Respond concisely and stay in character. Never break persona.`;

    if(stream){
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: typeof temperature === 'number' ? temperature : 0.85,
          presence_penalty: typeof presencePenalty === 'number' ? presencePenalty : 0.3,
          frequency_penalty: typeof frequencyPenalty === 'number' ? frequencyPenalty : 0.2,
          stream: true,
          messages: [
            { role: 'system', content: sys },
            ...(Array.isArray(history) ? history : []),
            { role: 'user', content: message }
          ]
        })
      });
      if(!r.ok || !r.body){
        const errText = await r.text();
        return new Response(JSON.stringify({ error: errText || 'Upstream error' }), { status: 500, headers:{'Content-Type':'application/json'} });
      }
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const streamBody = new ReadableStream({
        async start(controller){
          const reader = r.body.getReader();
            let buffer = '';
            try{
              while(true){
                const {done, value} = await reader.read();
                if(done) break;
                buffer += decoder.decode(value, {stream:true});
                const parts = buffer.split(/\n\n/);
                buffer = parts.pop();
                for(const part of parts){
                  const lines = part.split(/\n/).filter(l=>l.trim().length);
                  for(const line of lines){
                    if(!line.startsWith('data:')) continue;
                    const data = line.replace(/^data:\s*/,'');
                    if(data === '[DONE]'){
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                      controller.close();
                      return;
                    }
                    try {
                      const json = JSON.parse(data);
                      const delta = json.choices?.[0]?.delta?.content;
                      if(delta){
                        controller.enqueue(encoder.encode('data: '+ JSON.stringify({ delta }) +'\n\n'));
                      }
                    } catch(_e){ /* ignore parse errors */ }
                  }
                }
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch(e){
              controller.enqueue(encoder.encode('data: '+JSON.stringify({ error: e.message || 'stream error' })+'\n\n'));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
        }
      });
      return new Response(streamBody, {
        headers:{
          'Content-Type':'text/event-stream; charset=utf-8',
          'Cache-Control':'no-cache, no-transform',
          'Connection': 'keep-alive'
        }
      });
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: typeof temperature === 'number' ? temperature : 0.85,
          presence_penalty: typeof presencePenalty === 'number' ? presencePenalty : 0.3,
          frequency_penalty: typeof frequencyPenalty === 'number' ? frequencyPenalty : 0.2,
          messages: [
            { role: 'system', content: sys },
            ...(Array.isArray(history) ? history : []),
            { role: 'user', content: message }
          ]
        })
      });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
