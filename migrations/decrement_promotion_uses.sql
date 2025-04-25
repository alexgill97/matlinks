-- Function to decrement the number of uses for a promotion
CREATE OR REPLACE FUNCTION decrement_promotion_uses(
  promotion_id INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE promotions
  SET current_uses = GREATEST(current_uses - 1, 0)
  WHERE id = promotion_id;
END;
$$ LANGUAGE plpgsql; 