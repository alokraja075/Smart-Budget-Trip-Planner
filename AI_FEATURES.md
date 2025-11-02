# AI Features Guide

This document describes all the AI-powered features in the Smart Budget Trip Planner.

## Overview

The application integrates OpenAI's GPT-4o-mini model to provide **100% AI-powered trip planning**. Unlike traditional travel apps that use static mock data, every recommendation in this app is generated in real-time by AI based on your specific trip details, budget, and preferences.

## Core AI Integration

### AI-Generated Itineraries

**What it does**:
- When you create a trip, OpenAI generates all transport, accommodation, and activity options
- No mock data or pre-defined templates - everything is custom-generated
- Options are tailored to your origin, destination, dates, and budget
- Generates 6 diverse options per category for comparison

**Categories generated**:
1. **Transport**: Flights (economy/business), trains (various classes), buses (sleeper/semi-sleeper)
   - Realistic pricing based on route and distance
   - Duration estimates and comfort ratings
   - Departure/arrival times and class details

2. **Accommodation**: Luxury hotels, mid-range hotels, budget hostels, Airbnb/homestays
   - Total pricing for your entire stay
   - Amenities, location, and rating information
   - Breakfast inclusion and property details

3. **Activities**: Guided tours, adventure activities, cultural experiences, food tours
   - Per-person pricing
   - Duration and comfort level
   - What's included and group size information

**How it works**:
- App analyzes your total budget and allocates: 30% transport, 40% accommodation, 30% activities
- OpenAI receives context about your trip and budget constraints
- AI generates realistic, location-specific options with Indian pricing (INR)
- Options are stored in the database for quick access and comparison

## Additional AI Features

### 1. AI Trade-off Explanations

**Location**: Trip Detail Page → "Explain Trade-offs" button

**What it does**:
- Analyzes your complete itinerary (transport, accommodation, activities)
- Considers your preference weights (cost, time, comfort)
- Generates 4-5 detailed explanations about optimization decisions

**Example output**:
- "Selected transport option balances cost efficiency with time savings, prioritizing your 60% cost preference"
- "Accommodation choice provides 8/10 comfort while staying ₹2,000 under the stay budget cap"
- "Activity timing minimizes travel overlap and maximizes destination exploration"

**Use when**:
- You want to understand why the optimizer chose specific options
- You're comparing alternatives and need guidance
- You want insights into the trade-offs being made

### 2. AI Activity Suggestions

**Location**: Trip Detail Page → "AI Activity Suggestions" button

**What it does**:
- Opens an interactive modal for interest selection
- Allows you to choose from 8 common interest categories
- Supports custom interest input
- Generates 6 personalized activity recommendations

**Interest Categories**:
- Culture & History
- Food & Dining
- Adventure
- Nature & Wildlife
- Shopping
- Relaxation & Spa
- Nightlife
- Art & Museums

**Generated information**:
- Activity title and detailed description
- Price in INR
- Duration in hours
- Comfort score (1-10)
- Category classification
- One-click "Add to Trip" functionality

**Use when**:
- Planning daily activities for your trip
- Looking for personalized recommendations
- Want activities that match your interests and budget

### 3. Weather & Travel Tips

**Location**: Trip Detail Page → "Weather & Tips" button

**What it does**:
- Fetches weather forecast for your destination and travel dates
- Provides location-specific packing recommendations
- Suggests seasonal highlights and events
- Offers health and safety considerations

**Information provided**:
- Expected weather conditions
- Temperature ranges
- Clothing recommendations
- Best practices for that time of year
- Festival and event information
- Safety tips

**Use when**:
- Planning what to pack
- Want to know what to expect weather-wise
- Looking for seasonal insights
- Preparing for specific local conditions

## Technical Implementation

### API Integration
- All features use OpenAI's GPT-4o-mini model
- API key stored in environment variables
- Graceful error handling with user-friendly messages
- Loading states during API calls

### Request Optimization
- Temperature set to 0.7 for balanced creativity/consistency
- Max tokens: 1000 per request
- JSON parsing for structured data (activities)
- Bullet point extraction for explanations

### User Experience
- Real-time loading indicators
- Error messages for failed requests
- Cached results where appropriate (weather)
- Responsive modal designs
- Smooth transitions and animations

## Usage Tips

1. **For Best Explanations**:
   - Ensure your itinerary has at least one segment in each category
   - Set clear preference weights before requesting explanations
   - Review after making significant changes to preferences

2. **For Activity Suggestions**:
   - Select multiple interests for diverse recommendations
   - Use custom interests for niche activities
   - Check the budget allocation (defaults to 20% of total budget)
   - Add activities as quotes first, then compare alternatives

3. **For Weather Tips**:
   - Request early in planning to adjust your itinerary
   - Use packing recommendations to avoid overpacking
   - Check seasonal events for unique experiences

## API Key Configuration

The OpenAI API key must be set in your `.env` file:

```
VITE_OPENAI_API_KEY=your_openai_api_key
```

Without this key, AI features will show error messages when clicked.

## Cost Considerations

Each AI request consumes OpenAI API tokens:
- Trade-off explanations: ~500-800 tokens
- Activity suggestions: ~700-1000 tokens
- Weather & tips: ~600-900 tokens

Monitor your OpenAI usage dashboard to track costs. The app uses the cost-effective GPT-4o-mini model.

## Future AI Enhancements

Planned improvements:
- Real-time flight price prediction
- Smart packing list generation
- Conversational trip planning assistant
- Multi-language support for international travelers
- Image-based activity discovery
- Budget optimization recommendations
- Travel companion matching
