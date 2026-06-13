import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, structured, vibes, exclude } = body;

    if (!query && !structured) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API not configured' }, { status: 500 });

    let structuredContext = '';
    let bookingContext = { origin: '', startDate: '', endDate: '', days: '' };

    if (structured) {
      const { origin, startDate, endDate, days, companions, transport, budget } = structured;
      bookingContext = { origin, startDate, endDate, days };
      structuredContext = `
TRIP DETAILS:
- From: ${origin || 'not specified'}
- Dates: ${startDate ? `${startDate} to ${endDate}` : 'flexible'}
- Duration: ${days || 'flexible'} days
- With: ${companions || 'not specified'}
- Transport: ${transport || 'any'}
- Budget: ${budget || 'not specified'}
${vibes?.length ? `- Vibe preferences: ${vibes.join(', ')}` : ''}

TRANSPORT RULES:
- motorcycle/car: only driveable destinations, give road route + distance + drive time
- train: train-connected destinations, mention train name and journey time
- flight: anywhere, mention nearest airport
- any: recommend best mode per destination
- Never suggest flying to places reachable by road in under 6 hours
- Always mention realistic travel time FROM the origin city
`;
    }

    let excludeBlock = '';
    if (exclude?.length) {
      excludeBlock = `

ABSOLUTE RULE — DO NOT REPEAT: The user has already seen these destinations:
${exclude.map((e: string) => `- ${e}`).join('\n')}

You MUST suggest 3 COMPLETELY DIFFERENT destinations not in this list, not even slight variations (e.g. if "Manali" is listed, do not suggest "Manali, Himachal Pradesh" or "Old Manali"). Pick genuinely different places — different regions, different vibes if possible. This is critical.`;
    }

    const systemPrompt = `You are ZoveAI — an honest, knowledgeable travel companion. Specific, practical, honest recommendations like a well-traveled friend.

${structuredContext}${excludeBlock}

For each destination, also provide a RISK METER with scores 1-10 (10 = highest risk):
- road_quality: 1=excellent roads, 10=terrible/dangerous roads
- medical_access: 1=hospital nearby, 10=no medical facilities for hours
- mobile_signal: 1=excellent connectivity, 10=no signal
- weather_risk: 1=very safe weather, 10=high risk (floods/landslides/extreme weather)
- solo_female_safety: 1=very safe for solo women, 10=unsafe
- crowd_level: 1=very quiet, 10=extremely crowded tourist trap
- overall_risk: calculated average, 1=very safe, 10=high risk

Respond ONLY with this JSON:
{
  "interpretation": "Warm 1-2 sentence acknowledgment",
  "destinations": [
    {
      "name": "Destination",
      "country": "Country",
      "region": "Region",
      "tagline": "One evocative sentence",
      "hero_image_query": "Descriptive search query",
      "why_recommended": "2-3 sentences why this matches",
      "best_for": ["tag1", "tag2", "tag3"],
      "travel_from_origin": {
        "origin": "origin city",
        "by_road": "distance and time",
        "by_train": "train option or No direct train",
        "by_flight": "flight option or No nearby airport",
        "recommended_mode": "car/train/flight/motorcycle",
        "recommended_reason": "why this mode is best"
      },
      "estimated_cost": {
        "budget_per_day": "e.g. INR 3000-5000",
        "total_trip_estimate": "e.g. INR 20000-30000 for 4 days",
        "currency_note": "cash/card situation"
      },
      "best_time": "months",
      "duration_ideal": "e.g. 4-5 days",
      "suitability_scores": {
        "couple": 8, "family": 6, "solo": 9, "elderly_parents": 4,
        "adventure": 8, "relaxation": 7, "food": 6, "culture": 7
      },
      "risk_meter": {
        "road_quality": 3,
        "medical_access": 6,
        "mobile_signal": 7,
        "weather_risk": 4,
        "solo_female_safety": 3,
        "crowd_level": 5,
        "overall_risk": 5,
        "risk_notes": "Brief honest summary of main risks"
      },
      "reality_check": ["Warning 1", "Warning 2", "Tip 3"],
      "day_sketch": [
        {"day": 1, "title": "Title", "highlight": "What to do"},
        {"day": 2, "title": "Title", "highlight": "What to do"},
        {"day": 3, "title": "Title", "highlight": "What to do"}
      ],
      "booking": {
        "flight_origin": "origin city",
        "flight_destination": "nearest airport city",
        "train_from": "origin station",
        "train_to": "destination station",
        "hotel_city": "city for hotel search"
      }
    }
  ]
}

Return exactly 3 destinations. Make them meaningfully different from each other.`;

    const userMessage = structured
      ? `${structuredContext}${excludeBlock}\nUser notes: ${query || 'None'}`
      : query;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        temperature: exclude?.length ? 0.95 : 0.75,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500 });
    if (!data.choices?.[0]?.message?.content) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const content = JSON.parse(data.choices[0].message.content);

    if (bookingContext.origin && content.destinations) {
      content.destinations = content.destinations.map((dest: any) => ({
        ...dest,
        bookingContext: { origin: bookingContext.origin, startDate: bookingContext.startDate, endDate: bookingContext.endDate, days: bookingContext.days }
      }));
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
