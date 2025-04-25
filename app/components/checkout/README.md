# Checkout Components

This directory contains components and utilities used in the checkout process.

## Promotion Code Input

The `PromotionCodeInput` component provides a user interface for entering, applying, and removing promotion codes during checkout.

### Usage

```tsx
import { PromotionCodeInput } from '@/app/components/checkout/promotion-code-input';

// Inside your checkout component
function CheckoutPage() {
  const [order, setOrder] = useState<Order>({
    // order data
  });

  const handleAppliedPromotion = (discountType: string, discountValue: number) => {
    // Update order with discount information
    setOrder(prevOrder => ({
      ...prevOrder,
      discountType,
      discountValue,
      // Recalculate total
      total: calculateTotalWithDiscount(prevOrder.subtotal, discountType, discountValue)
    }));
  };

  const handleRemovedPromotion = () => {
    // Reset discount information
    setOrder(prevOrder => ({
      ...prevOrder,
      discountType: null,
      discountValue: null,
      // Restore original total
      total: prevOrder.subtotal
    }));
  };

  return (
    <div>
      {/* Other checkout fields */}
      
      <PromotionCodeInput 
        orderId={order.id}
        onApplied={handleAppliedPromotion}
        onRemoved={handleRemovedPromotion}
      />
      
      {/* Order summary */}
    </div>
  );
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `number` | The ID of the current order |
| `onApplied` | `(discountType: string, discountValue: number) => void` | Callback when a promotion is successfully applied |
| `onRemoved` | `() => void` | Callback when a promotion is removed |

## Promotion Hooks

The `usePromotion` hook provides functionality for validating, applying, and removing promotion codes.

### Usage

```tsx
import { usePromotion } from '@/app/hooks/usePromotion';

function CheckoutComponent() {
  const { 
    loading, 
    error, 
    result, 
    validatePromotion, 
    applyPromotion, 
    removePromotion 
  } = usePromotion({
    onSuccess: (data) => {
      console.log('Promotion operation successful', data);
    },
    onError: (errorMessage) => {
      console.error('Promotion operation failed', errorMessage);
    }
  });

  const handleValidateCode = async () => {
    const result = await validatePromotion('SUMMER2023');
    if (result) {
      console.log('Valid promotion:', result);
    }
  };

  const handleApplyCode = async () => {
    await applyPromotion('SUMMER2023', 123);
  };

  const handleRemoveCode = async () => {
    await removePromotion(123);
  };

  return (
    <div>
      {/* UI for handling promotions */}
    </div>
  );
}
```

## API Endpoints

The promotion functionality uses the following API endpoints:

- `POST /api/promotions/validate` - Validates a promotion code
- `POST /api/promotions/apply` - Applies a promotion code to an order
- `POST /api/promotions/remove` - Removes a promotion code from an order

See the API documentation in `/docs/api/promotions.md` for more details. 