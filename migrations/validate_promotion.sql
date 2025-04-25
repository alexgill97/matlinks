-- Function to validate if a promotion is valid
CREATE OR REPLACE FUNCTION validate_promotion(
  p_code TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  message TEXT,
  promotion_id INT,
  discount_type TEXT,
  discount_value NUMERIC
) AS $$
DECLARE
  promotion_record RECORD;
  redemption_count INT;
BEGIN
  -- Check if promotion exists and is active
  SELECT * INTO promotion_record
  FROM promotions
  WHERE code = p_code AND is_active = TRUE;
  
  -- If promotion doesn't exist or is not active
  IF promotion_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid promotion code', NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Check if promotion has expired
  IF promotion_record.end_date IS NOT NULL AND promotion_record.end_date < CURRENT_DATE THEN
    RETURN QUERY SELECT FALSE, 'Promotion has expired', NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Check if promotion has not started yet
  IF promotion_record.start_date IS NOT NULL AND promotion_record.start_date > CURRENT_DATE THEN
    RETURN QUERY SELECT FALSE, 'Promotion has not started yet', NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Check if promotion has reached max uses
  IF promotion_record.max_uses IS NOT NULL AND promotion_record.current_uses >= promotion_record.max_uses THEN
    RETURN QUERY SELECT FALSE, 'Promotion has reached maximum usage limit', NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Check if user has already used this promotion
  SELECT COUNT(*) INTO redemption_count
  FROM promotion_redemptions
  WHERE promotion_id = promotion_record.id AND user_id = p_user_id;
  
  IF redemption_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'You have already used this promotion', NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Promotion is valid
  RETURN QUERY SELECT 
    TRUE, 
    'Promotion is valid', 
    promotion_record.id, 
    promotion_record.discount_type, 
    promotion_record.discount_value;
  
  RETURN;
END;
$$ LANGUAGE plpgsql; 