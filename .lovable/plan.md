

# Plan: Prevent Decimal Points in Weight Input

## Overview
The weight input field on the Add Item page currently allows users to enter decimal points (`.`), but since all weights are in whole grams, we need to block this character.

## What Will Change

### File: `src/pages/AddItem.tsx`

**Modify the `handleWeightChange` function** (line 236) to filter out any `.` characters before updating the weight state:

**Current code:**
```typescript
const handleWeightChange = (value: string) => {
  setWeight(value);
  // Auto-calculate cost price...
};
```

**New code:**
```typescript
const handleWeightChange = (value: string) => {
  // Remove any decimal points - weight should be whole grams only
  const cleanedValue = value.replace(/\./g, '');
  setWeight(cleanedValue);
  // Auto-calculate cost price using cleaned value...
};
```

This approach:
- Strips out all `.` characters from the input
- Works even if someone pastes a decimal number
- Keeps the existing auto-calculation logic for BR category cost prices

---

## Technical Notes

- The input type remains `number` for mobile keyboard benefits (shows numeric keypad)
- The `replace(/\./g, '')` regex removes all occurrences of the period character
- The cost price calculation will still work correctly since `parseFloat("500")` works the same as before

