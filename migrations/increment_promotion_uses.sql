-- Function to increment promotion uses
CREATE OR REPLACE FUNCTION increment_promotion_uses(promotion_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE promotions
  SET current_uses = current_uses + 1
  WHERE id = promotion_id;
END;
$$ LANGUAGE plpgsql; 