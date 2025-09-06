-- Drop existing tables (this will remove all data and policies)
DROP TABLE IF EXISTS holdings CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;

-- Recreate portfolios table
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate holdings table
CREATE TABLE holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  purchase_price DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for portfolios table
CREATE POLICY "Users can insert own portfolios" ON portfolios
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own portfolios" ON portfolios
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for holdings table
CREATE POLICY "Users can insert own holdings" ON holdings
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = holdings.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view own holdings" ON holdings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = holdings.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own holdings" ON holdings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = holdings.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = holdings.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own holdings" ON holdings
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = holdings.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);
