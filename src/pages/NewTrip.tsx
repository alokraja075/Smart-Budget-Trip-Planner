import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from '../components/Router';
import { supabase } from '../lib/supabase';
import { Plane, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

interface BudgetCap {
  category: 'transport' | 'stay' | 'activity' | 'misc';
  cap: number;
}

export function NewTrip() {
  const { userId } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalBudget, setTotalBudget] = useState('');

  const [budgetCaps, setBudgetCaps] = useState<BudgetCap[]>([
    { category: 'transport', cap: 0 },
    { category: 'stay', cap: 0 },
    { category: 'activity', cap: 0 },
    { category: 'misc', cap: 0 },
  ]);

  const [weightCost, setWeightCost] = useState(33);
  const [weightTime, setWeightTime] = useState(33);
  const [weightComfort, setWeightComfort] = useState(34);

  const handleBudgetCapChange = (category: string, value: string) => {
    setBudgetCaps(prev =>
      prev.map(bc =>
        bc.category === category ? { ...bc, cap: parseFloat(value) || 0 } : bc
      )
    );
  };

  const handleWeightChange = (type: 'cost' | 'time' | 'comfort', value: number) => {
    const remaining = 100 - value;
    const otherTwo = remaining / 2;

    if (type === 'cost') {
      setWeightCost(value);
      setWeightTime(Math.round(otherTwo));
      setWeightComfort(100 - value - Math.round(otherTwo));
    } else if (type === 'time') {
      setWeightTime(value);
      setWeightCost(Math.round(otherTwo));
      setWeightComfort(100 - value - Math.round(otherTwo));
    } else {
      setWeightComfort(value);
      setWeightCost(Math.round(otherTwo));
      setWeightTime(100 - value - Math.round(otherTwo));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const budget = parseFloat(totalBudget);
    if (isNaN(budget) || budget <= 0) {
      setError('Please enter a valid budget');
      setLoading(false);
      return;
    }

    const totalCaps = budgetCaps.reduce((sum, bc) => sum + bc.cap, 0);
    if (totalCaps > budget) {
      setError('Category caps exceed total budget');
      setLoading(false);
      return;
    }

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title,
          origin,
          destination,
          start_date: startDate,
          end_date: endDate,
          currency: 'INR',
          total_budget: budget,
          status: 'draft',
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const budgetsToInsert = budgetCaps
        .filter(bc => bc.cap > 0)
        .map(bc => ({
          trip_id: trip.id,
          category: bc.category,
          cap: bc.cap,
        }));

      if (budgetsToInsert.length > 0) {
        const { error: budgetError } = await supabase
          .from('budgets')
          .insert(budgetsToInsert);

        if (budgetError) throw budgetError;
      }

      const { error: prefsError } = await supabase
        .from('prefs')
        .insert({
          trip_id: trip.id,
          weight_cost: weightCost / 100,
          weight_time: weightTime / 100,
          weight_comfort: weightComfort / 100,
        });

      if (prefsError) throw prefsError;

      navigate(`/trip/${trip.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels = {
    transport: 'Transport',
    stay: 'Accommodation',
    activity: 'Activities',
    misc: 'Miscellaneous',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-emerald-600" />
              <span className="text-lg font-bold text-gray-900">New Trip</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
          <p className="text-gray-600 mb-8">Fill in the details and set your preferences</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Trip Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="e.g., Summer Vacation to Delhi"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Bangalore"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    placeholder="Delhi"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget (INR)
                </label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="50000"
                  min="0"
                  step="100"
                  required
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Category Budget Caps</h2>
              <p className="text-sm text-gray-600">Optional: Set maximum spending for each category</p>

              <div className="grid md:grid-cols-2 gap-6">
                {budgetCaps.map((bc) => (
                  <div key={bc.category}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {categoryLabels[bc.category]} (INR)
                    </label>
                    <input
                      type="number"
                      value={bc.cap || ''}
                      onChange={(e) => handleBudgetCapChange(bc.category, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Optional"
                      min="0"
                      step="100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Optimization Preferences</h2>
              <p className="text-sm text-gray-600">Adjust weights to prioritize what matters most to you</p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Cost Priority</label>
                    <span className="text-sm font-semibold text-emerald-600">{weightCost}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weightCost}
                    onChange={(e) => handleWeightChange('cost', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Time Priority</label>
                    <span className="text-sm font-semibold text-teal-600">{weightTime}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weightTime}
                    onChange={(e) => handleWeightChange('time', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Comfort Priority</label>
                    <span className="text-sm font-semibold text-cyan-600">{weightComfort}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weightComfort}
                    onChange={(e) => handleWeightChange('comfort', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Trip...
                  </>
                ) : (
                  'Create Trip & Optimize'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
