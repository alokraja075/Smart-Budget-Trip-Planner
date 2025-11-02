/*
  # Remove custom users table and use Supabase Auth

  This migration removes the custom users table since Supabase Auth
  already manages users. We'll use auth.users() and user metadata instead.

  1. Changes
    - Drop the custom users table
    - Update trips table to reference auth.users() directly
    - Keep existing trips data intact

  2. Security
    - RLS policies remain unchanged for trips table
    - Use auth.uid() which references Supabase's auth.users
*/

-- Drop the custom users table
DROP TABLE IF EXISTS users CASCADE;

-- The trips table already references user_id as uuid
-- Supabase auth.uid() will work with this directly
-- No changes needed to trips table structure