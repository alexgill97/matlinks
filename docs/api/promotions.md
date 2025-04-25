# Promotion API Endpoints

This document describes the API endpoints available for handling promotion codes in the system.

## Validate Promotion

Validates a promotion code for a given user.

**URL:** `/api/promotions/validate`  
**Method:** `POST`  
**Authentication:** Required

### Request Body

```json
{
  "code": "SUMMER2023"
}
```

### Response

**Success (200 OK)**

```json
{
  "valid": true,
  "message": "Promotion is valid",
  "promotion": {
    "id": 1,
    "discountType": "percentage",
    "discountValue": 15
  }
}
```

**Invalid Code (200 OK with failure details)**

```json
{
  "valid": false,
  "message": "Invalid promotion code"
}
```

**Error (401 Unauthorized)**

```json
{
  "error": "Unauthorized"
}
```

**Error (400 Bad Request)**

```json
{
  "error": "Promotion code is required"
}
```

**Error (500 Internal Server Error)**

```json
{
  "error": "Failed to validate promotion code"
}
```

## Apply Promotion

Applies a promotion code to an order.

**URL:** `/api/promotions/apply`  
**Method:** `POST`  
**Authentication:** Required

### Request Body

```json
{
  "code": "SUMMER2023",
  "orderId": 123
}
```

### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Promotion applied successfully",
  "discount": {
    "type": "percentage",
    "value": 15
  }
}
```

**Invalid Code (200 OK with failure details)**

```json
{
  "success": false,
  "message": "Invalid promotion code"
}
```

**Error (401 Unauthorized)**

```json
{
  "error": "Unauthorized"
}
```

**Error (400 Bad Request)**

```json
{
  "error": "Promotion code and order ID are required"
}
```

**Error (404 Not Found)**

```json
{
  "error": "Member profile not found"
}
```

**Error (500 Internal Server Error)**

```json
{
  "error": "Failed to apply promotion"
}
```

## Remove Promotion

Removes a promotion code from an order.

**URL:** `/api/promotions/remove`  
**Method:** `POST`  
**Authentication:** Required

### Request Body

```json
{
  "orderId": 123
}
```

### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Promotion removed successfully"
}
```

**Error (401 Unauthorized)**

```json
{
  "error": "Unauthorized"
}
```

**Error (400 Bad Request)**

```json
{
  "error": "Order ID is required"
}
```

**Error (404 Not Found)**

```json
{
  "error": "Order not found or you do not have permission to modify it"
}
```

**Error (500 Internal Server Error)**

```json
{
  "error": "Failed to remove promotion"
}
```

## Implementation Notes

- Promotion codes are case-insensitive.
- A promotion can only be applied by a user once.
- Promotions can have limits on total usage.
- Promotions can be configured with start and end dates.
- Two types of discounts are supported: percentage and fixed amount. 