/*
  # Smart Budget Trip Planner Database Schema

  ## Overview
  Complete schema for a trip planning application with budget optimization,
  provider quotes, event tracking, and user preferences.

  ## New Tables
  
  ### users
  - `id` (uuid, primary key) - Unique user identifier
  - `name` (text) - User's full name
  - `email` (text, unique) - User's email address
  - `password_hash` (text) - Hashed password
  - `created_at` (timestamptz) - Account creation timestamp
  
  ### trips
  - `id` (uuid, primary key) - Unique trip identifier
  - `user_id` (uuid, foreign key) - Owner of the trip
  - `title` (text) - Trip name/title
  - `origin` (text) - Starting location
  - `destination` (text) - Destination location
  - `start_date` (date) - Trip start date
  - `end_date` (date) - Trip end date
  - `currency` (text) - Currency code (default 'INR')
  - `total_budget` (numeric) - Overall budget limit
  - `status` (text) - Trip status (draft/optimized/confirmed)
  - `created_at` (timestamptz) - Trip creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### budgets
  - `id` (uuid, primary key) - Unique budget constraint identifier
  - `trip_id` (uuid, foreign key) - Associated trip
  - `category` (text) - Budget category (transport/stay/activity/misc)
  - `cap` (numeric) - Maximum allowed spending for category
  - `created_at` (timestamptz) - Creation timestamp
  
  ### prefs
  - `id` (uuid, primary key) - Unique preference identifier
  - `trip_id` (uuid, foreign key) - Associated trip
  - `weight_cost` (numeric) - Cost importance weight (0-1)
  - `weight_time` (numeric) - Time importance weight (0-1)
  - `weight_comfort` (numeric) - Comfort importance weight (0-1)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### segments
  - `id` (uuid, primary key) - Unique segment identifier
  - `trip_id` (uuid, foreign key) - Associated trip
  - `type` (text) - Segment type (transport/stay/activity)
  - `title` (text) - Segment name/description
  - `provider` (text) - Service provider name
  - `start_ts` (timestamptz) - Segment start time
  - `end_ts` (timestamptz) - Segment end time
  - `duration_min` (integer) - Duration in minutes
  - `comfort_score` (numeric) - Comfort rating (0-10)
  - `price` (numeric) - Segment price
  - `currency` (text) - Price currency
  - `locked` (boolean) - Whether segment is locked from changes
  - `status` (text) - Segment status (draft/selected/confirmed)
  - `meta` (jsonb) - Additional metadata
  - `created_at` (timestamptz) - Creation timestamp
  
  ### quotes
  - `id` (uuid, primary key) - Unique quote identifier
  - `segment_id` (uuid, foreign key, nullable) - Associated segment (null for alternatives)
  - `trip_id` (uuid, foreign key) - Associated trip
  - `type` (text) - Quote type (transport/stay/activity)
  - `source` (text) - Provider/source name
  - `price` (numeric) - Quote price
  - `currency` (text) - Price currency
  - `duration_min` (integer) - Duration in minutes
  - `comfort_score` (numeric) - Comfort rating (0-10)
  - `options` (jsonb) - Additional quote details
  - `created_at` (timestamptz) - Creation timestamp
  
  ### events
  - `id` (uuid, primary key) - Unique event identifier
  - `trip_id` (uuid, foreign key) - Associated trip
  - `kind` (text) - Event type (delay/weather/price_change/fx_change)
  - `payload` (jsonb) - Event data
  - `severity` (text) - Event severity (info/warning/critical)
  - `created_at` (timestamptz) - Event timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - All policies verify authentication and ownership
  - Cascading deletes for dependent records
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  total_budget numeric NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  cap numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN ('transport', 'stay', 'activity', 'misc'))
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets for own trips"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = budgets.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budgets for own trips"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = budgets.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budgets for own trips"
  ON budgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = budgets.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = budgets.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets for own trips"
  ON budgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = budgets.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create prefs table
CREATE TABLE IF NOT EXISTS prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weight_cost numeric NOT NULL DEFAULT 0.33,
  weight_time numeric NOT NULL DEFAULT 0.33,
  weight_comfort numeric NOT NULL DEFAULT 0.34,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view prefs for own trips"
  ON prefs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = prefs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create prefs for own trips"
  ON prefs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = prefs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prefs for own trips"
  ON prefs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = prefs.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = prefs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prefs for own trips"
  ON prefs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = prefs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create segments table
CREATE TABLE IF NOT EXISTS segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  provider text NOT NULL,
  start_ts timestamptz NOT NULL,
  end_ts timestamptz NOT NULL,
  duration_min integer NOT NULL,
  comfort_score numeric NOT NULL DEFAULT 5,
  price numeric NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  locked boolean DEFAULT false NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_segment_type CHECK (type IN ('transport', 'stay', 'activity'))
);

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view segments for own trips"
  ON segments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create segments for own trips"
  ON segments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update segments for own trips"
  ON segments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = segments.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete segments for own trips"
  ON segments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid REFERENCES segments(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  source text NOT NULL,
  price numeric NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  duration_min integer NOT NULL,
  comfort_score numeric NOT NULL DEFAULT 5,
  options jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_quote_type CHECK (type IN ('transport', 'stay', 'activity'))
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes for own trips"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = quotes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quotes for own trips"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = quotes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quotes for own trips"
  ON quotes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = quotes.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = quotes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quotes for own trips"
  ON quotes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = quotes.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  kind text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  severity text DEFAULT 'info' NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_event_kind CHECK (kind IN ('delay', 'weather', 'price_change', 'fx_change')),
  CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events for own trips"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = events.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events for own trips"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = events.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete events for own trips"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = events.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_trip_id ON budgets(trip_id);
CREATE INDEX IF NOT EXISTS idx_prefs_trip_id ON prefs(trip_id);
CREATE INDEX IF NOT EXISTS idx_segments_trip_id ON segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_quotes_trip_id ON quotes(trip_id);
CREATE INDEX IF NOT EXISTS idx_quotes_segment_id ON quotes(segment_id);
CREATE INDEX IF NOT EXISTS idx_events_trip_id ON events(trip_id);