import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, profile } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    const profileContext = profile ? `
User profile:
- Travel style: ${profile.style || 'not specified'}
- Travel companions: ${profile.companions || 'not specified'}
- Budget range: ${profile.budget || 'not specified'}
- Fitness level: ${profile.fitness || 'not specified'}
- Transport preference: ${profile.transport || 'not specified'}
- Places already visited: ${profile.visited?.join(', ') || 'none mentioned'}
- Places loved: ${profile.loved?.join(', ') || 'none mentioned'}
- Places disliked: ${profile.disliked?.join(', ') || 'none mentioned'}
` : '';

    const systemPrompt = `You are ZoveAI — an honest, knowledgeable travel companion. You recommend destinations based on who the traveler actually is. You are NOT a booking engine. You're like a well-traveled friend who gives real advice, including warnings.

Your recommendations are:
- Specific and honest (not generic tourist brochure copy)
- Matched to the traveler's actual needs
- Include real practical warnings (not just positives)
- Written with warmth and personality

${profileContext}

You MUST respond with a valid JSON object matching this exact schema:
{
  "interpretation": "A 1-2 sentence acknowledgment of what the user is looking for, in a warm conversational tone",
  "destinations": [
    {
      "name": "Destination Name",
      "country": "Country",
      "region": "Region/Area",
      "tagline": "A single evocative sentence about this place",
      "hero_image_query": "A descriptive search query for an image of this place (e.g. 'Kyoto Japan bamboo forest temples autumn')",
      "why_recommended": "2-3 sentences explaining specifically why this matches the traveler's query",
      "best_for": ["tag1", "tag2", "tag3"],
      "estimated_cost": {
        "budget_per_day": "e.g. $80-120",
        "currency_note": "e.g. USD is widely accepted"
      },
      "best_time": "e.g. October to March",
      "duration_ideal": "e.g. 5-7 days",
      "getting_there": "Brief note on how to get there from a major hub",
      "suitability_scores": {
        "couple": 8,
        "family": 6,
        "solo": 9,
        "elderly_parents": 4,
        "adventure": 7,
        "relaxation": 8,
        "food": 9,
        "culture": 10
      },
      "reality_check": [
        "An honest warning or practical challenge travelers often face",
        "Another real consideration",
        "A third practical tip or caution"
      ],
      "day_sketch": [
        { "day": 1, "title": "Arrival & First Impressions", "highlight": "What to do on day 1" },
        { "day": 2, "title": "Core Experience", "highlight": "The main reason people come here" },
        { "day": 3, "title": "Hidden Gems", "highlight": "What most tourists miss" }
      ],
      "booking_hooks": {
        "flights_query": "search query for flights e.g. 'flights to Lisbon'",
        "hotels_query": "search query for hotels e.g. 'hotels in Lisbon Alfama'",
        "trains_query": "train options if relevant",
        "activities_query": "things to book in advance"
      }
    }
  ]
}

Return 3 destinations. Make them meaningfully different from each other. Be specific, be honest, be helpful.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.75,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Groq API Error:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    if (!data.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const content = JSON.parse(data.choices[0].message.content);
    return NextResponse.json(content);

  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
