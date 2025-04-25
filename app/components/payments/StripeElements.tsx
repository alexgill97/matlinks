'use client';

// Import dynamically to avoid server-side errors
// We'll use proper types even without packages installed
type ElementsProps = {
  stripe: unknown;
  children: React.ReactNode;
};

// Simple wrapper component until real Stripe Elements is available
const Elements = ({ children }: ElementsProps) => (
  <div>{children}</div>
);

interface StripeElementsProps {
  customerId: string;
}

// Mock PaymentMethodManager until we have the proper implementation
function PaymentMethodManager({ customerId }: { customerId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Payment Methods</h3>
      <p className="text-gray-500 mt-2">
        Payment method management will be available once the Stripe packages are properly installed.
      </p>
      <p className="text-gray-500">Customer ID: {customerId}</p>
    </div>
  );
}

export default function StripeElements({ customerId }: StripeElementsProps) {
  // Create a simple placeholder object
  const stripePromise = {} as unknown;
  
  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodManager customerId={customerId} />
    </Elements>
  );
} 