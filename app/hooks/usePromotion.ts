import { useState } from 'react';

interface PromotionApplyResult {
  success: boolean;
  message: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
}

interface UsePromotionProps {
  onSuccess?: (data: PromotionApplyResult) => void;
  onError?: (error: string) => void;
}

export function usePromotion(props?: UsePromotionProps) {
  const { onSuccess, onError } = props || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromotionApplyResult | null>(null);

  const validatePromotion = async (code: string) => {
    if (!code) {
      const errorMsg = 'Please enter a promotion code';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/promotions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate promotion');
      }

      if (!data.valid) {
        setError(data.message);
        onError?.(data.message);
        return null;
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const applyPromotion = async (code: string, orderId: number) => {
    if (!code || !orderId) {
      const errorMsg = 'Promotion code and order ID are required';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/promotions/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, orderId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply promotion');
      }

      if (!data.success) {
        setError(data.message);
        onError?.(data.message);
        return;
      }

      setResult(data);
      onSuccess?.(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const removePromotion = async (orderId: number) => {
    if (!orderId) {
      const errorMsg = 'Order ID is required';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/promotions/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove promotion');
      }

      if (!data.success) {
        setError(data.message);
        onError?.(data.message);
        return;
      }

      setResult(null);
      onSuccess?.(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    result,
    validatePromotion,
    applyPromotion,
    removePromotion,
  };
} 