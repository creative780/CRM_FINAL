# Cursor Prompt: Enhance Product Configuration Modal

## Target File
`Frontend/app/components/modals/ProductConfigModal.tsx`

## Changes Required

### 1. Reduce Gap Between Product Name and Stock Available
**Current:** Line 255 has `mb-2`
**Change to:** `mb-1` to reduce the gap between product name and stock available text.

### 2. Make Quantity Field Empty Initially
**Current:** Line 34 has `useState(1)` and Line 300 has `value={quantity}`
**Changes needed:**
- Change `useState(1)` to `useState("")` on line 34
- Change input type from `type="number"` to `type="text"` on line 297
- Add `placeholder="Qty"` to the input on line 297
- Update onChange handler to handle string input and validate for positive integers only
- Remove `min="1"` attribute from input

### 3. Add Attribute-Based Price Calculation
**Requirements:**
- Some attributes will have default selected options with no price increment
- Some attributes will not have defaults
- Default selected attributes should have price increment = 0
- Non-default attributes can have positive (green) or negative (red) price increments
- Show price increment/decrement badges on attribute options
- Calculate final unit price based on base price + attribute increments
- Show final price in Configuration Summary

### 4. Update Configuration Summary
**Current:** Lines 321-335 show basic summary
**Changes needed:**
- Remove the manual Unit Price input field (lines 305-318)
- Update Configuration Summary to show:
  - Base price
  - Attribute adjustments (with increment/decrement)
  - Final unit price (base + adjustments)
  - Quantity
  - Final total price (final unit price × quantity)

### 5. Add Price Badge UI
**Requirements:**
- Add price increment/decrement badges to attribute option buttons
- Green badge for positive increments (e.g., "+AED 5")
- Red badge for negative increments (e.g., "-AED 3")
- Hide badges for zero increments (defaults)
- Position badges in top-right corner of option buttons

## Implementation Notes

1. **State Changes:**
   - Change quantity from number to string
   - Add state for calculated unit price
   - Add state for final total price

2. **Attribute Structure:**
   - Assume attributes can have `priceDelta` property (positive/negative number)
   - Assume attributes can have `isDefault` property (boolean)
   - Default options should have `priceDelta: 0`

3. **Price Calculation Logic:**
   ```typescript
   const basePrice = baseProduct?.defaultPrice || 0;
   const attributeAdjustments = selectedAttributes.reduce((sum, [attrId, optionId]) => {
     const attr = attributes.find(a => a.key === attrId);
     const option = attr?.options.find(o => o.value === optionId);
     return sum + (option?.priceDelta || 0);
   }, 0);
   const finalUnitPrice = Math.max(0, basePrice + attributeAdjustments);
   const finalTotalPrice = finalUnitPrice * (parseInt(quantity) || 0);
   ```

4. **Badge Component:**
   ```typescript
   {option.priceDelta && option.priceDelta !== 0 && (
     <span className={`absolute top-1 right-1 rounded px-1.5 py-0.5 text-xs font-medium ${
       option.priceDelta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
     }`}>
       {option.priceDelta > 0 ? `+AED ${option.priceDelta}` : `AED ${option.priceDelta}`}
     </span>
   )}
   ```

5. **Quantity Validation:**
   - Only allow positive integers
   - Strip non-numeric characters
   - Handle empty string as 0 for calculations

## Expected Outcome
- Tighter spacing between product name and stock
- Empty quantity field with placeholder
- Attribute options with price badges (green/red)
- Real-time final price calculation in Configuration Summary
- Automatic unit price calculation based on attribute selections
