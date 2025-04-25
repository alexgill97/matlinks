'use client';

import { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type PaymentMethod = {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name: string | null;
  };
};

type PaymentMethodManagerProps = {
  customerId: string;
  onPaymentMethodAdded?: () => void;
  onPaymentMethodRemoved?: () => void;
};

export default function PaymentMethodManager({ 
  customerId,
  onPaymentMethodAdded,
  onPaymentMethodRemoved 
}: PaymentMethodManagerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch customer's payment methods
  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`/api/payment-methods?customerId=${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      setError('Could not load payment methods. Please try again later.');
      console.error('Error fetching payment methods:', err);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchPaymentMethods();
    }
  }, [customerId]);

  // Handle adding a new payment method
  const handleAddPaymentMethod = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe has not been initialized yet.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      setError('Card element not found.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentMethod) {
        // Attach payment method to customer
        const response = await fetch('/api/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            paymentMethodId: paymentMethod.id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to attach payment method');
        }

        // Reset the card input
        cardElement.clear();
        setSuccess('Card added successfully');
        setIsAddingCard(false);
        
        // Refresh the list of payment methods
        fetchPaymentMethods();
        
        // Notify parent component if needed
        if (onPaymentMethodAdded) onPaymentMethodAdded();
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred while adding your card.');
      console.error('Error adding payment method:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle removing a payment method
  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove payment method');
      }

      setSuccess('Card removed successfully');
      
      // Refresh the list of payment methods
      fetchPaymentMethods();
      
      // Notify parent component if needed
      if (onPaymentMethodRemoved) onPaymentMethodRemoved();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An error occurred while removing your card.');
      console.error('Error removing payment method:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format card brand
  const formatCardBrand = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      jcb: 'JCB',
      diners: 'Diners Club',
      unionpay: 'UnionPay',
    };
    
    return brands[brand.toLowerCase()] || brand;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Payment Methods</h3>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Display existing payment methods */}
      {paymentMethods.length > 0 ? (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex justify-between items-center p-3 border rounded-md">
              <div>
                <p className="font-medium">
                  {formatCardBrand(method.card.brand)} •••• {method.card.last4}
                </p>
                <p className="text-sm text-gray-500">
                  Expires {method.card.exp_month}/{method.card.exp_year % 100}
                  {method.billing_details.name && ` - ${method.billing_details.name}`}
                </p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleRemovePaymentMethod(method.id)}
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No payment methods found.</p>
      )}
      
      {/* Add new payment method form */}
      {isAddingCard ? (
        <form onSubmit={handleAddPaymentMethod} className="mt-4 space-y-4 border rounded-md p-4">
          <h4 className="font-medium">Add New Card</h4>
          <div className="border rounded-md p-3">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button 
              type="submit" 
              disabled={!stripe || isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Card'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setIsAddingCard(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button 
          onClick={() => setIsAddingCard(true)}
          className="mt-2"
        >
          Add New Card
        </Button>
      )}
    </div>
  );
} 