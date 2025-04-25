-- SQL function for getting promotion redemption counts
CREATE OR REPLACE FUNCTION get_promotion_redemption_counts()
RETURNS TABLE (
  promotion_id BIGINT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.promotion_id,
    COUNT(pr.id)::BIGINT
  FROM
    promotion_redemptions pr
  GROUP BY
    pr.promotion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 