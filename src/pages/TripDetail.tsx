import { useEffect, useState } from 'react';
import { useRouter } from '../components/Router';
import { supabase } from '../lib/supabase';
import { searchAndSeedQuotes, optimizeItinerary, replanImpacted } from '../lib/optimizer';
import { explainTripTradeoffs, getWeatherAndTravelTips } from '../lib/openai';
import { ActivitySuggestions } from '../components/ActivitySuggestions';
import {
  Plane,
  ArrowLeft,
  Loader2,
  Lock,
  Unlock,
  RefreshCw,
  DollarSign,
  Clock,
  Star,
  TrendingUp,
  Calendar,
  MapPin,
  Lightbulb,
  Sparkles,
  Cloud,
} from 'lucide-react';
import type { Database } from '../lib/supabase';

type Trip = Database['public']['Tables']['trips']['Row'];
type Segment = Database['public']['Tables']['segments']['Row'];
type Budget = Database['public']['Tables']['budgets']['Row'];
type Prefs = Database['public']['Tables']['prefs']['Row'];
type Quote = Database['public']['Tables']['quotes']['Row'];

export function TripDetail() {
  const { params, navigate } = useRouter();
  const tripId = params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Quote[]>([]);
  const [explanation, setExplanation] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [weatherInfo, setWeatherInfo] = useState<{ weather: string; tips: string[] } | null>(null);
  const [showWeather, setShowWeather] = useState(false);

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  const loadTripData = async () => {
    setLoading(true);

    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    const { data: segmentsData } = await supabase
      .from('segments')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_ts', { ascending: true });

    const { data: budgetsData } = await supabase
      .from('budgets')
      .select('*')
      .eq('trip_id', tripId);

    const { data: prefsData } = await supabase
      .from('prefs')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    setTrip(tripData);
    setSegments(segmentsData || []);
    setBudgets(budgetsData || []);
    setPrefs(prefsData);
    setLoading(false);

    if (tripData && tripData.status === 'draft') {
      handleOptimize();
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      await searchAndSeedQuotes(tripId);
      await optimizeItinerary(tripId);
      await loadTripData();
    } catch (error) {
      console.error('Optimization failed:', error);
    }
    setOptimizing(false);
  };

  const handleReplanImpacted = async () => {
    setOptimizing(true);
    try {
      await replanImpacted(tripId);
      await loadTripData();
    } catch (error) {
      console.error('Replan failed:', error);
    }
    setOptimizing(false);
  };

  const toggleLock = async (segmentId: string, currentLocked: boolean) => {
    await supabase
      .from('segments')
      .update({ locked: !currentLocked })
      .eq('id', segmentId);

    setSegments(prev =>
      prev.map(s => (s.id === segmentId ? { ...s, locked: !currentLocked } : s))
    );
  };

  const loadAlternatives = async (segment: Segment) => {
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('trip_id', tripId)
      .eq('type', segment.type)
      .is('segment_id', null)
      .order('price', { ascending: true })
      .limit(3);

    setAlternatives(data || []);
    setShowAlternatives(segment.id);
  };

  const replaceSegment = async (segment: Segment, quote: Quote) => {
    const startDate = new Date(trip!.start_date);
    let start = new Date(startDate);
    let end = new Date(startDate);

    if (quote.type === 'transport') {
      end = new Date(start.getTime() + quote.duration_min * 60 * 1000);
    } else if (quote.type === 'stay') {
      end = new Date(trip!.end_date);
    } else if (quote.type === 'activity') {
      start = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      end = new Date(start.getTime() + quote.duration_min * 60 * 1000);
    }

    await supabase
      .from('segments')
      .update({
        title: quote.source,
        provider: quote.source,
        price: quote.price,
        duration_min: quote.duration_min,
        comfort_score: quote.comfort_score,
        start_ts: start.toISOString(),
        end_ts: end.toISOString(),
        meta: quote.options,
      })
      .eq('id', segment.id);

    setShowAlternatives(null);
    await loadTripData();
  };

  const handleExplainTradeoffs = async () => {
    if (!trip || !prefs || segments.length === 0) return;

    setLoadingExplanation(true);
    setShowExplanation(true);
    try {
      const explanations = await explainTripTradeoffs(
        trip.origin,
        trip.destination,
        segments.map(s => ({
          type: s.type,
          provider: s.provider,
          price: s.price,
          duration_min: s.duration_min,
          comfort_score: s.comfort_score,
        })),
        prefs
      );
      setExplanation(explanations);
    } catch (error) {
      console.error('Failed to get AI explanation:', error);
      setExplanation(['Unable to generate explanation. Please try again.']);
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleGetWeather = async () => {
    if (!trip) return;
    setShowWeather(true);
    if (weatherInfo) return;

    try {
      const info = await getWeatherAndTravelTips(
        trip.destination,
        trip.start_date,
        trip.end_date
      );
      setWeatherInfo(info);
    } catch (error) {
      console.error('Failed to get weather info:', error);
      setWeatherInfo({
        weather: 'Weather information unavailable',
        tips: ['Check weather forecast before departure'],
      });
    }
  };

  const updatePreference = async (key: string, value: number) => {
    if (!prefs) return;

    const updates: any = {};
    const remaining = 1 - value;
    const otherTwo = remaining / 2;

    if (key === 'weight_cost') {
      updates.weight_cost = value;
      updates.weight_time = otherTwo;
      updates.weight_comfort = otherTwo;
    } else if (key === 'weight_time') {
      updates.weight_time = value;
      updates.weight_cost = otherTwo;
      updates.weight_comfort = otherTwo;
    } else {
      updates.weight_comfort = value;
      updates.weight_cost = otherTwo;
      updates.weight_time = otherTwo;
    }

    await supabase.from('prefs').update(updates).eq('id', prefs.id);
    setPrefs(prev => (prev ? { ...prev, ...updates } : null));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return <div>Trip not found</div>;
  }

  const totalSpent = segments.reduce((sum, s) => sum + s.price, 0);
  const budgetByCategory = budgets.reduce((acc, b) => {
    acc[b.category] = b.cap;
    return acc;
  }, {} as Record<string, number>);

  const spentByCategory = segments.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + s.price;
    return acc;
  }, {} as Record<string, number>);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transport':
        return <Plane className="w-5 h-5" />;
      case 'stay':
        return <MapPin className="w-5 h-5" />;
      case 'activity':
        return <Calendar className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transport':
        return 'bg-blue-100 text-blue-700';
      case 'stay':
        return 'bg-emerald-100 text-emerald-700';
      case 'activity':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div className="flex items-center gap-2">
                <Plane className="w-6 h-6 text-emerald-600" />
                <span className="text-lg font-bold text-gray-900">{trip.title}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/trip/${tripId}/compare`)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Compare
              </button>
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
                Re-run
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Itinerary</h2>
                <button
                  onClick={handleExplainTradeoffs}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-medium transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  Explain Trade-offs
                </button>
              </div>

              {segments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No segments yet</p>
                  {optimizing && <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />}
                </div>
              ) : (
                <div className="space-y-4">
                  {segments.map((segment) => (
                    <div key={segment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getTypeColor(segment.type)}`}>
                            {getTypeIcon(segment.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{segment.title}</h3>
                            <p className="text-sm text-gray-600">{segment.provider}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleLock(segment.id, segment.locked)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {segment.locked ? (
                            <Lock className="w-5 h-5 text-gray-700" />
                          ) : (
                            <Unlock className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span>₹{segment.price.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{Math.round(segment.duration_min / 60)}h</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star className="w-4 h-4" />
                          <div className="flex">
                            {Array.from({ length: Math.round(segment.comfort_score / 2) }).map((_, i) => (
                              <div key={i} className="w-2 h-2 bg-amber-400 rounded-full mr-0.5" />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => loadAlternatives(segment)}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          See alternatives
                        </button>
                      </div>

                      {showAlternatives === segment.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                          {alternatives.map((alt) => (
                            <div
                              key={alt.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{alt.source}</p>
                                <p className="text-sm text-gray-600">
                                  ₹{alt.price} • {Math.round(alt.duration_min / 60)}h • Comfort: {alt.comfort_score}/10
                                </p>
                              </div>
                              <button
                                onClick={() => replaceSegment(segment, alt)}
                                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                              >
                                Replace
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showExplanation && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Trade-off Explanation
                </h3>
                {loadingExplanation ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-amber-800">
                    {explanation.map((line, i) => (
                      <p key={i}>• {line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showWeather && weatherInfo && (
              <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-6">
                <h3 className="font-semibold text-cyan-900 mb-3 flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Weather & Travel Tips
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-cyan-800 mb-2">Expected Weather</h4>
                    <p className="text-sm text-cyan-800">{weatherInfo.weather}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-cyan-800 mb-2">Travel Tips</h4>
                    <ul className="space-y-1 text-sm text-cyan-800">
                      {weatherInfo.tips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Budget Overview</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Total</span>
                    <span className="font-semibold">
                      ₹{totalSpent.toLocaleString()} / ₹{trip.total_budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${Math.min((totalSpent / trip.total_budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {Object.entries(budgetByCategory).map(([category, cap]) => {
                  const spent = spentByCategory[category] || 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 capitalize">{category}</span>
                        <span className="font-semibold">
                          ₹{spent.toLocaleString()} / ₹{cap.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${Math.min((spent / cap) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {prefs && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-700">Cost</span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {Math.round(prefs.weight_cost * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={prefs.weight_cost}
                      onChange={(e) => updatePreference('weight_cost', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-700">Time</span>
                      <span className="text-sm font-semibold text-teal-600">
                        {Math.round(prefs.weight_time * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={prefs.weight_time}
                      onChange={(e) => updatePreference('weight_time', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-700">Comfort</span>
                      <span className="text-sm font-semibold text-cyan-600">
                        {Math.round(prefs.weight_comfort * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={prefs.weight_comfort}
                      onChange={(e) => updatePreference('weight_comfort', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleGetWeather}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-colors"
              >
                <Cloud className="w-5 h-5" />
                Weather & Tips
              </button>

            </div>
          </div>
        </div>
      </main>

      {showActivityModal && (
        <ActivitySuggestions
          tripId={tripId}
          destination={trip.destination}
          date={trip.start_date}
          budget={Math.floor(trip.total_budget * 0.2)}
          onClose={() => setShowActivityModal(false)}
          onAdded={() => {
            setShowActivityModal(false);
            loadTripData();
          }}
        />
      )}
    </div>
  );
}
