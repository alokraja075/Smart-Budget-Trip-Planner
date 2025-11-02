const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function explainTripTradeoffs(
  origin: string,
  destination: string,
  segments: Array<{
    type: string;
    provider: string;
    price: number;
    duration_min: number;
    comfort_score: number;
  }>,
  prefs: {
    weight_cost: number;
    weight_time: number;
    weight_comfort: number;
  }
): Promise<string[]> {
  const segmentsSummary = segments
    .map(
      (s) =>
        `${s.type}: ${s.provider} (₹${s.price}, ${Math.round(s.duration_min / 60)}h, comfort: ${s.comfort_score}/10)`
    )
    .join('\n');

  const prefsSummary = `Cost priority: ${Math.round(prefs.weight_cost * 100)}%, Time priority: ${Math.round(prefs.weight_time * 100)}%, Comfort priority: ${Math.round(prefs.weight_comfort * 100)}%`;

  const prompt = `You are a travel planning expert. Analyze this trip itinerary and explain the trade-offs made in the optimization.

Trip: ${origin} to ${destination}

Selected segments:
${segmentsSummary}

User preferences:
${prefsSummary}

Provide 4-5 concise bullet points (2-3 sentences each) explaining:
1. Why each segment was selected based on the user's priorities
2. What trade-offs were made (e.g., saved money by adding time)
3. How the choices align with the preference weights
4. Any notable balance achieved between competing factors

Format each point as a clear, actionable insight. Be specific and refer to actual numbers.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert travel planning advisor who explains optimization decisions clearly and concisely.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);
  return response
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim()))
    .map((line) => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export async function suggestActivities(
  destination: string,
  date: string,
  interests: string[],
  budget: number
): Promise<
  Array<{
    title: string;
    description: string;
    price: number;
    duration_min: number;
    comfort_score: number;
    category: string;
  }>
> {
  const interestsStr = interests.length > 0 ? interests.join(', ') : 'general sightseeing';

  const prompt = `Suggest 6 diverse activities for a traveler visiting ${destination} on ${date}.

Traveler interests: ${interestsStr}
Budget per activity: Up to ₹${budget}

For each activity, provide:
- Title (short, catchy name)
- Description (2-3 sentences about what makes it special)
- Price in INR
- Duration in minutes
- Comfort score (1-10, where 10 is most comfortable/luxurious)
- Category (e.g., culture, adventure, food, nature, relaxation)

Return ONLY a valid JSON array with these 6 activities. Format:
[
  {
    "title": "Activity Name",
    "description": "Brief description",
    "price": 1500,
    "duration_min": 180,
    "comfort_score": 7,
    "category": "culture"
  }
]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a local travel expert. Return only valid JSON, no additional text.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse OpenAI response:', error);
    return [];
  }
}

export async function generateDetailedItinerary(
  origin: string,
  destination: string,
  startDate: string,
  endDate: string,
  totalBudget: number,
  interests: string[]
): Promise<string> {
  const interestsStr = interests.length > 0 ? interests.join(', ') : 'general travel';

  const prompt = `Create a detailed day-by-day itinerary for a trip:

From: ${origin}
To: ${destination}
Dates: ${startDate} to ${endDate}
Budget: ₹${totalBudget}
Interests: ${interestsStr}

Provide:
1. Daily breakdown with morning/afternoon/evening activities
2. Recommended restaurants and local food experiences
3. Transportation tips between locations
4. Budget allocation suggestions
5. Important travel tips and local customs
6. Best times to visit attractions

Format as a clear, structured plan that's easy to follow.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an experienced travel planner who creates detailed, practical itineraries.',
    },
    { role: 'user', content: prompt },
  ];

  return await chatCompletion(messages);
}

export async function getWeatherAndTravelTips(
  destination: string,
  startDate: string,
  endDate: string
): Promise<{
  weather: string;
  tips: string[];
}> {
  const prompt = `Provide travel information for ${destination} from ${startDate} to ${endDate}:

1. Expected weather conditions and temperature range
2. What to pack (clothing recommendations)
3. Best practices for that time of year
4. Any festivals, events, or seasonal highlights
5. Health and safety considerations

Format as:
WEATHER: (2-3 sentences)

TIPS:
- Tip 1
- Tip 2
- Tip 3
(etc)`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a travel advisor providing practical, location-specific advice.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);

  const weatherMatch = response.match(/WEATHER:\s*(.*?)(?=TIPS:|$)/s);
  const weather = weatherMatch ? weatherMatch[1].trim() : response.split('\n\n')[0];

  const tips = response
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter((line) => line.length > 0);

  return {
    weather: weather || 'Weather information not available',
    tips: tips.length > 0 ? tips : ['Pack appropriate clothing', 'Check local customs', 'Stay hydrated'],
  };
}

export async function generateTransportOptions(
  origin: string,
  destination: string,
  date: string,
  budget: number
): Promise<
  Array<{
    title: string;
    provider: string;
    price: number;
    duration_min: number;
    comfort_score: number;
    options: Record<string, any>;
  }>
> {
  const prompt = `Generate 6 realistic transportation options from ${origin} to ${destination} for ${date}.

Budget consideration: ₹${budget}

Provide diverse options including:
- Flights (economy, business)
- Trains (different classes)
- Buses (sleeper, semi-sleeper)

For each option, provide:
- title: Short name (e.g., "IndiGo Economy Flight")
- provider: Company name
- price: Realistic price in INR
- duration_min: Travel time in minutes
- comfort_score: Rating 1-10
- options: Object with details like departure, arrival, class, amenities

Return ONLY a valid JSON array. Format:
[
  {
    "title": "Option Name",
    "provider": "Provider Name",
    "price": 5000,
    "duration_min": 150,
    "comfort_score": 8,
    "options": {"departure": "08:00", "arrival": "10:30", "class": "Economy"}
  }
]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a travel booking expert. Return only valid JSON, no additional text.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse transport options:', error);
    return [];
  }
}

export async function generateAccommodationOptions(
  destination: string,
  startDate: string,
  endDate: string,
  budget: number
): Promise<
  Array<{
    title: string;
    provider: string;
    price: number;
    duration_min: number;
    comfort_score: number;
    options: Record<string, any>;
  }>
> {
  const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

  const prompt = `Generate 6 realistic accommodation options in ${destination} from ${startDate} to ${endDate} (${nights} nights).

Budget consideration: ₹${budget}

Provide diverse options including:
- Luxury hotels (5-star)
- Mid-range hotels (3-4 star)
- Budget hotels and hostels
- Airbnb/homestays

For each option, provide:
- title: Hotel/property name
- provider: Category (e.g., "Luxury Hotel", "Budget Hostel")
- price: Total price for ${nights} nights in INR
- duration_min: ${nights * 24 * 60} (total minutes)
- comfort_score: Rating 1-10
- options: Object with amenities, location, rating, breakfast included

Return ONLY a valid JSON array. Format:
[
  {
    "title": "Hotel Name",
    "provider": "Category",
    "price": 15000,
    "duration_min": ${nights * 24 * 60},
    "comfort_score": 9,
    "options": {"amenities": "Pool, Spa, Gym", "location": "City Center", "rating": "5-star", "breakfast": true}
  }
]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a hotel booking expert. Return only valid JSON, no additional text.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse accommodation options:', error);
    return [];
  }
}

export async function generateActivityOptions(
  destination: string,
  date: string,
  budget: number
): Promise<
  Array<{
    title: string;
    provider: string;
    price: number;
    duration_min: number;
    comfort_score: number;
    options: Record<string, any>;
  }>
> {
  const prompt = `Generate 6 realistic activity options in ${destination} for ${date}.

Budget consideration: ₹${budget}

Provide diverse options including:
- Guided tours
- Adventure activities
- Cultural experiences
- Food tours
- Museum visits
- Nature excursions

For each option, provide:
- title: Activity name
- provider: Tour company or category
- price: Realistic price in INR per person
- duration_min: Activity duration in minutes
- comfort_score: Physical ease rating 1-10 (10 = very easy)
- options: Object with details like type, includes, group_size

Return ONLY a valid JSON array. Format:
[
  {
    "title": "Activity Name",
    "provider": "Tour Company",
    "price": 2500,
    "duration_min": 240,
    "comfort_score": 7,
    "options": {"type": "Guided Tour", "includes": "Lunch, Transport", "group_size": "Small"}
  }
]`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a local tour expert. Return only valid JSON, no additional text.',
    },
    { role: 'user', content: prompt },
  ];

  const response = await chatCompletion(messages);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse activity options:', error);
    return [];
  }
}
