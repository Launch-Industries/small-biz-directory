import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name, section, city } = await req.json()
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  const sectionContext: Record<string, string> = {
    spend: 'local business, restaurant, shop, or service',
    save: 'credit union, CDFI, or community lender',
    swap: 'barter network, tool library, or reuse organization',
    share: 'thrift store, mutual aid org, or repair café',
    support: 'nonprofit, community org, or advocacy group',
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a short, genuine 2-3 sentence description for "${name}", a ${sectionContext[section] ?? 'local business'} in ${city || 'Seattle'}. Write in first person ("We are..." or "We offer..."). Focus on community value and what makes them worth supporting locally. Do not invent specific details. Keep it under 75 words.`,
      }],
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  const data = await res.json()
  return NextResponse.json({ description: data.content?.[0]?.text ?? '' })
}
