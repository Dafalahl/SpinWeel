-- Create the prizes table
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color code (e.g. #FF5733)
  probability NUMERIC NOT NULL CHECK (probability >= 0 AND probability <= 100),
  stock INTEGER NULL, -- NULL indicates unlimited stock
  stock_used INTEGER DEFAULT 0 NOT NULL CHECK (stock_used >= 0),
  is_zonk BOOLEAN DEFAULT false NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create the spins table
CREATE TABLE IF NOT EXISTS spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id UUID REFERENCES prizes(id) ON DELETE SET NULL,
  prize_name TEXT NOT NULL,
  spun_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_prizes_active ON prizes(active);
CREATE INDEX IF NOT EXISTS idx_spins_spun_at ON spins(spun_at);

-- Seed initial data
INSERT INTO prizes (name, color, probability, stock, stock_used, is_zonk, active)
VALUES
  ('iPhone 15 Pro Max', '#EF4444', 1.0, 1, 0, false, true),
  ('Gaming Laptop', '#F59E0B', 2.0, 3, 0, false, true),
  ('Smart Watch', '#10B981', 5.0, 5, 0, false, true),
  ('$50 Gift Card', '#3B82F6', 10.0, 10, 0, false, true),
  ('$10 Voucher', '#8B5CF6', 20.0, 50, 0, false, true),
  ('Good Luck!', '#6B7280', 62.0, NULL, 0, true, true)
ON CONFLICT DO NOTHING;

-- Function to atomically increment prize stock if available
CREATE OR REPLACE FUNCTION increment_prize_stock(target_prize_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE prizes
  SET stock_used = stock_used + 1
  WHERE id = target_prize_id
    AND active = true
    AND (stock IS NULL OR stock_used < stock);
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- View to calculate win counts per prize for analytics
CREATE OR REPLACE VIEW prize_win_stats AS
SELECT prize_name, COUNT(*)::INTEGER AS win_count
FROM spins
GROUP BY prize_name;

-- Create settings table for global stand controls
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed initial settings
INSERT INTO settings (key, value)
VALUES
  ('force_lose', 'false'),
  ('spin_pin', '')
ON CONFLICT (key) DO NOTHING;


