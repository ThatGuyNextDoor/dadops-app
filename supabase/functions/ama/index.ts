import { serve } from 'https://deno.land/std/http/server.ts'

const SYSTEM_PROMPT = `You are a newborn care assistant for Jacob, born 26 June 2026.
You ONLY answer questions about newborn care, infant feeding, sleep,
development, and parental wellbeing in the fourth trimester. If asked
about anything else, politely redirect. Never provide medical
diagnoses. Always recommend contacting a healthcare provider for
medical concerns. Keep answers warm, practical, and concise.`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Each request is standalone — no conversation history is sent,
    // which keeps token usage (and cost) flat regardless of session length.
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? 'Sorry, I could not get a response.'

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
