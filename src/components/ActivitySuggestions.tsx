import { useState } from 'react';
import { X, Loader2, Plus, Clock, DollarSign, Star } from 'lucide-react';
import { suggestActivities } from '../lib/openai';
import { supabase } from '../lib/supabase';

interface ActivitySuggestionsProps {
  tripId: string;
  destination: string;
  date: string;
  budget: number;
  onClose: () => void;
  onAdded: () => void;
}

export function ActivitySuggestions({
  tripId,
  destination,
  date,
  budget,
  onClose,
  onAdded,
}: ActivitySuggestionsProps) {
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const commonInterests = [
    'Culture & History',
    'Food & Dining',
    'Adventure',
    'Nature & Wildlife',
    'Shopping',
    'Relaxation & Spa',
    'Nightlife',
    'Art & Museums',
  ];

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const handleGetSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const activities = await suggestActivities(destination, date, interests, budget);
      setSuggestions(activities);
    } catch (err: any) {
      setError(err.message || 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const addToItinerary = async (activity: any) => {
    try {
      const startDate = new Date(date);
      const endDate = new Date(startDate.getTime() + activity.duration_min * 60 * 1000);

      await supabase.from('quotes').insert({
        trip_id: tripId,
        segment_id: null,
        type: 'activity',
        source: activity.title,
        price: activity.price,
        currency: 'INR',
        duration_min: activity.duration_min,
        comfort_score: activity.comfort_score,
        options: {
          description: activity.description,
          category: activity.category,
        },
      });

      onAdded();
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">AI Activity Suggestions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">What are you interested in?</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {commonInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    interests.includes(interest)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                placeholder="Add custom interest..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
              <button
                onClick={addCustomInterest}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>

            {interests.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Selected interests:</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Select your interests and click the button below to get personalized activity suggestions powered by
                AI.
              </p>
              <button
                onClick={handleGetSuggestions}
                disabled={interests.length === 0}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get AI Suggestions
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Suggested Activities</h3>
                <button
                  onClick={handleGetSuggestions}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Refresh Suggestions
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {suggestions.map((activity, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {activity.category}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{activity.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>₹{activity.price}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{Math.round(activity.duration_min / 60)}h</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="w-4 h-4" />
                        <span>{activity.comfort_score}/10</span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToItinerary(activity)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Trip
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
