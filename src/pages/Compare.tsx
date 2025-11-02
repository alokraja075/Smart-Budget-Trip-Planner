import { useEffect, useState } from 'react';
import { useRouter } from '../components/Router';
import { supabase } from '../lib/supabase';
import { ArrowLeft, DollarSign, Clock, Star, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { Database } from '../lib/supabase';

type Trip = Database['public']['Tables']['trips']['Row'];
type Segment = Database['public']['Tables']['segments']['Row'];
type Prefs = Database['public']['Tables']['prefs']['Row'];

export function Compare() {
  const { params, navigate } = useRouter();
  const tripId = params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentSegments, setCurrentSegments] = useState<Segment[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);

  const [proposalWeightCost, setProposalWeightCost] = useState(0.33);
  const [proposalWeightTime, setProposalWeightTime] = useState(0.33);
  const [proposalWeightComfort, setProposalWeightComfort] = useState(0.34);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
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

    const { data: prefsData } = await supabase
      .from('prefs')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    setTrip(tripData);
    setCurrentSegments(segmentsData || []);
    setPrefs(prefsData);

    if (prefsData) {
      setProposalWeightCost(prefsData.weight_cost);
      setProposalWeightTime(prefsData.weight_time);
      setProposalWeightComfort(prefsData.weight_comfort);
    }

    setLoading(false);
  };

  const handleWeightChange = (type: 'cost' | 'time' | 'comfort', value: number) => {
    const remaining = 1 - value;
    const otherTwo = remaining / 2;

    if (type === 'cost') {
      setProposalWeightCost(value);
      setProposalWeightTime(otherTwo);
      setProposalWeightComfort(1 - value - otherTwo);
    } else if (type === 'time') {
      setProposalWeightTime(value);
      setProposalWeightCost(otherTwo);
      setProposalWeightComfort(1 - value - otherTwo);
    } else {
      setProposalWeightComfort(value);
      setProposalWeightCost(otherTwo);
      setProposalWeightTime(1 - value - otherTwo);
    }
  };

  if (loading || !trip || !prefs) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const currentTotalPrice = currentSegments.reduce((sum, s) => sum + s.price, 0);
  const currentTotalTime = currentSegments.reduce((sum, s) => sum + s.duration_min, 0);
  const currentAvgComfort =
    currentSegments.reduce((sum, s) => sum + s.comfort_score, 0) / (currentSegments.length || 1);

  const proposalTotalPrice = currentTotalPrice * 0.95;
  const proposalTotalTime = currentTotalTime * 1.1;
  const proposalAvgComfort = currentAvgComfort * 1.05;

  const priceDelta = proposalTotalPrice - currentTotalPrice;
  const timeDelta = proposalTotalTime - currentTotalTime;
  const comfortDelta = proposalAvgComfort - currentAvgComfort;

  const formatDelta = (delta: number, prefix: string = '') => {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${prefix}${Math.round(delta)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate(`/trip/${tripId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Trip
            </button>
            <span className="text-lg font-bold text-gray-900">Compare Plans</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Adjust Proposal Preferences</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-700">Cost Priority</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {Math.round(proposalWeightCost * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={proposalWeightCost}
                onChange={(e) => handleWeightChange('cost', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-700">Time Priority</span>
                <span className="text-sm font-semibold text-teal-600">
                  {Math.round(proposalWeightTime * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={proposalWeightTime}
                onChange={(e) => handleWeightChange('time', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-700">Comfort Priority</span>
                <span className="text-sm font-semibold text-cyan-600">
                  {Math.round(proposalWeightComfort * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={proposalWeightComfort}
                onChange={(e) => handleWeightChange('comfort', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Plan</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Active
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Total Cost</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">₹{currentTotalPrice.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Total Time</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{Math.round(currentTotalTime / 60)} hours</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Star className="w-5 h-5" />
                  <span className="font-medium">Avg Comfort</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{currentAvgComfort.toFixed(1)}/10</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Preferences</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost</span>
                    <span className="font-medium">{Math.round(prefs.weight_cost * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">{Math.round(prefs.weight_time * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comfort</span>
                    <span className="font-medium">{Math.round(prefs.weight_comfort * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Proposal</h2>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                Simulated
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Total Cost</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-bold text-gray-900">₹{Math.round(proposalTotalPrice).toLocaleString()}</p>
                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${
                      priceDelta < 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {priceDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {formatDelta(priceDelta, '₹')}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Total Time</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-bold text-gray-900">{Math.round(proposalTotalTime / 60)} hours</p>
                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${
                      timeDelta < 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {timeDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {formatDelta(timeDelta / 60)} hrs
                  </span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Star className="w-5 h-5" />
                  <span className="font-medium">Avg Comfort</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-bold text-gray-900">{proposalAvgComfort.toFixed(1)}/10</p>
                  <span
                    className={`flex items-center gap-1 text-sm font-medium ${
                      comfortDelta > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {comfortDelta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatDelta(comfortDelta)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">New Preferences</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost</span>
                    <span className="font-medium">{Math.round(proposalWeightCost * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time</span>
                    <span className="font-medium">{Math.round(proposalWeightTime * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comfort</span>
                    <span className="font-medium">{Math.round(proposalWeightComfort * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <p className="text-gray-600 mb-6">
            The proposed plan shows estimated changes based on adjusted preferences. Actual results may vary when
            re-optimizing with real provider data.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/trip/${tripId}`)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => navigate(`/trip/${tripId}`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
            >
              Apply & Re-optimize
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
