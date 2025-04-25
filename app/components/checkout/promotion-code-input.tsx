'use client';

import { useState } from 'react';
import { usePromotion } from '@/app/hooks/usePromotion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface PromotionCodeInputProps {
  orderId: number;
  onApplied?: (discountType: string, discountValue: number) => void;
  onRemoved?: () => void;
}

export function PromotionCodeInput({ orderId, onApplied, onRemoved }: PromotionCodeInputProps) {
  const [code, setCode] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  const { loading, error, result, applyPromotion, removePromotion } = usePromotion({
    onSuccess: (data) => {
      if (data.success) {
        if (data.discount) {
          setIsApplied(true);
          onApplied?.(data.discount.type, data.discount.value);
        } else {
          setIsApplied(false);
          onRemoved?.();
        }
      }
    }
  });

  const handleApply = async () => {
    await applyPromotion(code, orderId);
  };

  const handleRemove = async () => {
    await removePromotion(orderId);
    setCode('');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-end space-x-2">
          <div className="flex-grow">
            <label htmlFor="promotion-code" className="block text-sm font-medium text-gray-700 mb-1">
              Promotion Code
            </label>
            <Input
              id="promotion-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              disabled={loading || isApplied}
              className="w-full"
            />
          </div>
          {!isApplied ? (
            <Button 
              onClick={handleApply} 
              disabled={!code || loading}
              className="mb-0"
            >
              {loading ? 'Applying...' : 'Apply'}
            </Button>
          ) : (
            <Button 
              onClick={handleRemove} 
              variant="destructive"
              disabled={loading}
              className="mb-0"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">{error}</AlertDescription>
        </Alert>
      )}

      {isApplied && result && (
        <Alert className="py-2 bg-green-50 border-green-200 text-green-800">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="ml-2">
            {result.message || 'Promotion applied successfully'}
            {result.discount && (
              <span className="font-semibold ml-1">
                ({result.discount.type === 'percentage' ? `${result.discount.value}% off` : `$${result.discount.value.toFixed(2)} off`})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 