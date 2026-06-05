import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, structured } = body;

    if (!query && !structured) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    let structuredContext = '';
    let bookingContext = { origin: '', startDate: '', endDate: '', days: '' };

    if (structured) {
      const { origin, startDate, endDate, days, companions, transport, budget, currency } = structured;
      bookingContext = { origin, startDate, endDate, days };
      structuredContext = `
STRUCTURED TRIP DETAILS:
- Travelling from: ${origin || 'not specified'}
- Travel dates: ${startDate ? `${startDate} to ${endDate}` : 'flexible'}
- Duration: ${days || 'flexible'} days
- Travelling with: ${companions || 'not specified'}
- Preferred transport: ${transport || 'any'}
- Budget: ${budget ? `${currency || 'INR'} ${budget} per person total` : 'not specified'}

TRANSPORT RULES:
- motorcycle/car/road trip: ONLY driveable destinations, give road route, distance in km, driving time
- train: prioritize train-connected destinations, mention train names and journey time  
- flight: anywhere, mention nearest airport and flight time
- any/unspecified: recommend BEST mode per destination
- NEVER suggest flying to a place reachable by road in under 6 hours
- Always mention realistic travel time FROM the origin city
`;
    }

    const systemPrompt = `You are ZoveAI — an honest, deeply knowledgeable travel companion. Specific, practical, honest — like a well-traveled friend, not a tourist brochure.

${structuredContext}

Respond ONLY with this exact JSON:
{
  "interpretation": "Warm 1-2 sentence acknowledgment",
  "destinations": [
    {
      "name": "Destination Name",
      "country": "Country",
      "region": "State/Region",
      "tagline": "One evocative sentence",
      "hero_image_query": "Descriptive image search query",
      "why_recommended": "2-3 sentences why this matches their request",
      "best_for": ["tag1", "tag2", "tag3"],
      "travel_from_origin": {
        "origin": "Origin city",
        "by_road": "Distance and time e.g. 350km, ~7 hours via NH44",
        "by_train": "Train option or 'No direct train'",
        "by_flight": "Flight option or 'No nearby airport'",
        "recommended_mode": "car/train/flight/motorcycle",
        "recommended_reason": "Why this mode is best"
      },
      "estimated_cost": {
        "budget_per_day": "e.g. INR 3000-5000 per person",
        "total_trip_estimate": "e.g. INR 18000-25000 for 4 days 2 people",
        "currency_note": "Cash/card situation"
      },
      "best_time": "Months",
      "duration_ideal": "e.g. 4-5 days",
      "suitability_scores": {
        "couple": 9, "family": 6, "solo": 8, "elderly_parents": 3,
        "adventure": 8, "relaxation": 7, "food": 6, "culture": 7
      },
      "reality_check": ["Warning 1", "Warning 2", "Tip 3"],
      "day_sketch": [
        { "day": 1, "title": "Title", "highlight": "What to do" },
        { "day": 2, "title": "Title", "highlight": "What to do" },
        { "day": 3, "title": "Title", "highlight": "What to do" }
      ],
      "booking": {
        "flight_origin": "Origin city",
        "flight_destination": "Nearest airport city",
        "train_from": "Origin station",
        "train_to": "Destination station",
        "hotel_city": "City for hotel search"
      }
    }
  ]
}

Return exactly 3 destinations. Be specific and honest.`;

    const userMessage = structured
      ? `${structuredContext}\nUser notes: ${query || 'None'}`
      : query;

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.75,
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
        bookingContext: {
          origin: bookingContext.origin,
          startDate: bookingContext.startDate,
          endDate: bookingContext.endDate,
          days: bookingContext.days,
        }
      }));
    }

    return NextResponse.json(content);

  } catch (error) {
    console.error('Recommend API Error:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
