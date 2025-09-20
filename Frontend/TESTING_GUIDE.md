# Multi-Product Selection Testing Guide

## 🎯 **Testing the Implementation**

### **Available Dummy Products (30 total)**

#### **Printing Products:**
1. **Business Cards** - Size & Finish options
2. **Flyers** - Size & Paper Type options  
3. **Brochures** - Format & Size options
4. **Posters** - Size & Material options
5. **Banners** - Size & Material options
6. **Letterheads** - Size & Paper Quality options
7. **Envelopes** - Size & Style options
8. **Stickers** - Material & Finish options
9. **Booklets** - Pages & Binding options
10. **Catalogs** - Size & Pages options

#### **Card Products:**
11. **Menus** - Size & Lamination options
12. **Invitation Cards** - Size & Style options
13. **Wedding Cards** - Size & Finish options
14. **Birthday Cards** - Size & Theme options
15. **Greeting Cards** - Occasion & Style options

#### **Business Products:**
16. **Business Forms** - Type & Color options
17. **Labels** - Material & Adhesive options
18. **Packaging Boxes** - Material & Finish options
19. **Shopping Bags** - Material & Size options

#### **Large Format:**
20. **Billboards** - Size & Location options
21. **Vehicle Wraps** - Vehicle Type & Coverage options
22. **Window Graphics** - Type & Size options

#### **Promotional Items:**
23. **T-Shirts** - Size & Color options
24. **Mugs** - Size & Type options
25. **Keychains** - Material & Shape options
26. **Notebooks** - Size & Pages options
27. **Pens** - Type & Ink Color options

---

## 🧪 **How to Test**

### **1. Access the Order Lifecycle Page**
- Navigate to `/admin/order-lifecycle`
- You should see the "Order Intake" tab selected by default

### **2. Test Product Search**
- Click the **"Add Product"** button
- The Product Search Modal should open
- Try searching for different products:
  - "Business" → Should show Business Cards, Business Forms
  - "Cards" → Should show Business Cards, Invitation Cards, Wedding Cards, etc.
  - "Banners" → Should show Banners
  - "T-Shirts" → Should show T-Shirts

### **3. Test Product Configuration**
- Click on any product card in the search results
- The Product Config Modal should open with:
  - Product image
  - Attribute selection (Size, Color, Material, etc.)
  - Quantity input
  - Configuration summary

### **4. Test Multi-Product Selection**
- Add multiple products with different configurations
- Each product should appear as a card below the "Add Product" button
- Test editing products by clicking the edit icon
- Test removing products by clicking the X icon

### **5. Test Validation**
- Try to proceed to the next stage without adding any products
- Should show validation error: "Please fill: products"
- Add at least one product and try again - should work

### **6. Test Search Features**
- **Debounced Search**: Type quickly and see results update after 400ms delay
- **Empty Search**: Clear search should show "Enter a search term" message
- **No Results**: Search for "xyz" should show "No products found" message
- **Loading State**: Search should show loading spinner

---

## 🎨 **UI/UX Features to Verify**

### **Visual Elements:**
- ✅ Maroon accent color (#891F1A) on buttons and focus states
- ✅ Rounded corners and subtle shadows
- ✅ Hover effects on product cards
- ✅ Responsive grid layout for product cards
- ✅ Loading spinners and error states

### **Accessibility:**
- ✅ Focus management in modals
- ✅ Keyboard navigation (Escape to close modals)
- ✅ ARIA labels and proper form structure
- ✅ Screen reader friendly content

### **Functionality:**
- ✅ Modal focus trapping
- ✅ Quantity input validation
- ✅ Attribute selection with pill buttons
- ✅ Configuration summary display
- ✅ Product removal and editing

---

## 🐛 **Common Issues to Check**

1. **Images not loading**: Check if image paths exist in `/public/images/`
2. **Search not working**: Verify debounce timing and search logic
3. **Modal not opening**: Check if modals are properly imported
4. **Validation failing**: Ensure at least one product is added before proceeding
5. **Attributes not loading**: Verify product ID mapping in attributes object

---

## 📝 **Test Scenarios**

### **Scenario 1: Simple Order**
1. Search for "Business Cards"
2. Select "Standard Size" and "Glossy Finish"
3. Set quantity to 100
4. Add product
5. Proceed to next stage

### **Scenario 2: Complex Order**
1. Add "Business Cards" with Standard/Glossy, qty: 50
2. Add "Flyers" with A4/Premium, qty: 200
3. Add "T-Shirts" with Medium/Blue, qty: 10
4. Edit the Flyers to change quantity to 300
5. Remove the T-Shirts
6. Proceed to next stage

### **Scenario 3: Search Testing**
1. Search for "card" → Should show multiple card types
2. Search for "large" → Should show large format products
3. Search for "promotional" → Should show promotional items
4. Clear search and search for "xyz" → Should show no results

---

## ✅ **Success Criteria**

The implementation is working correctly if:
- [ ] All 30 products are searchable and configurable
- [ ] Multiple products can be added to a single order
- [ ] Product attributes are properly displayed and selectable
- [ ] Validation prevents progression without products
- [ ] Modals open/close properly with keyboard navigation
- [ ] UI matches the existing design system (maroon accents, rounded corners)
- [ ] No console errors or TypeScript errors
- [ ] Responsive design works on different screen sizes
