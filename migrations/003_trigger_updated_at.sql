-- Shared Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rules
CREATE TRIGGER set_updated_at_rules
BEFORE UPDATE ON rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for breaches
CREATE TRIGGER set_updated_at_breaches
BEFORE UPDATE ON breaches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();