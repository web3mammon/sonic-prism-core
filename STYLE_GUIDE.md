# Klariqo Core UI Style Guide

**Last Updated:** 2025-01-19
**Reference Implementation:** `/src/pages/Billing.tsx`

## Design Philosophy

Clean, minimal, and professional interface with reduced visual clutter. Emphasis on content over decoration.

---

## Layout Principles

### 1. Minimal Card Usage
- **DO:** Use cards sparingly, only for primary content blocks that need visual separation
- **DON'T:** Wrap every section in a card - leads to boxy, cluttered appearance
- **Example:** Only "Available Calls" uses a card in the billing page; other sections are flat

### 2. Flat Backgrounds
- Most sections should be on flat background (no card wrapper)
- Use horizontal dividers (`<hr className="border-border">`) to separate sections
- Creates cleaner, more modern appearance

### 3. Grid Layouts
```tsx
// 50-50 two-column layout
<div className="grid gap-6 md:grid-cols-2">
  <Card>...</Card>
  <div>...</div> {/* Can be card or flat section */}
</div>
```

---

## Color System

### Card Backgrounds
```tsx
// Primary card background - darker, bluish grey
className="bg-muted/50"

// DON'T use gradient backgrounds unless absolutely necessary
// ❌ className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
```

### Badges
```tsx
// Active status
<Badge className="bg-green-500">
  <CheckCircle className="h-3 w-3 mr-1" />
  Active
</Badge>

// Inactive status
<Badge className="bg-gray-500">Inactive</Badge>
```

### Dividers
```tsx
<hr className="border-border" />
```

---

## Typography

### Page Title
```tsx
<div className="space-y-2">
  <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
  <p className="text-muted-foreground">
    Brief description of the page
  </p>
</div>
```

### Section Headings
```tsx
// Main section (h2)
<div className="space-y-2">
  <h2 className="text-2xl font-bold">Section Title</h2>
  <p className="text-muted-foreground">
    Section description
  </p>
</div>

// With icon
<h2 className="text-2xl font-bold flex items-center gap-2">
  <CreditCard className="h-5 w-5 text-primary" />
  Section Title
</h2>

// Subsection (h3)
<h3 className="font-semibold text-sm">Subsection Title</h3>
```

---

## Spacing

### Page Container
```tsx
<div className="space-y-6 p-6">
  {/* All page content */}
</div>
```

### Between Sections
- Use `space-y-6` for vertical spacing between major sections
- Use `gap-6` for grid gaps

### Within Cards
```tsx
<CardContent className="space-y-4">
  {/* Card content with consistent spacing */}
</CardContent>
```

---

## Component Patterns

### 1. Primary Content Card
```tsx
<Card className="bg-muted/50">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-2xl">Card Title</CardTitle>
        <CardDescription>Card description</CardDescription>
      </div>
      <Badge className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Status
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>
```

### 2. Flat Section (No Card)
```tsx
<div className="space-y-6 pt-6"> {/* pt-6 for alignment */}
  <div className="space-y-2">
    <h2 className="text-2xl font-bold">Section Title</h2>
    <p className="text-muted-foreground">
      Section description
    </p>
  </div>
  <div className="space-y-4">
    {/* Section content */}
  </div>
</div>
```

### 3. Info Boxes
```tsx
// Use muted background for highlighted info
<div className="p-4 rounded-lg bg-muted/50 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">Label</span>
    <span className="font-medium">Value</span>
  </div>
</div>
```

### 4. List Items with Indicators
```tsx
<div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-primary"></div>
    <span className="text-sm font-medium">Item label</span>
  </div>
  <span className="text-sm text-muted-foreground">Item detail</span>
</div>
```

---

## Buttons

### Primary Actions
```tsx
// Main CTA - use solid primary button (purple/white theme)
<Button
  className="w-full"
  size="lg"
  onClick={handleAction}
>
  <Plus className="h-4 w-4 mr-2" />
  Primary Action
</Button>
```

### Secondary Actions
```tsx
// Secondary actions - use outline variant sparingly
<Button variant="outline" size="sm" onClick={handleAction}>
  <Download className="h-4 w-4 mr-2" />
  Secondary Action
</Button>
```

### Preset Buttons
```tsx
// Small preset buttons
<div className="grid grid-cols-3 gap-2">
  {presets.map((preset) => (
    <Button
      key={preset}
      variant="outline"
      size="sm"
      className="text-xs"
    >
      {preset}
    </Button>
  ))}
</div>
```

---

## Forms & Inputs

### Slider with Input
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium">Label</label>
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={value}
        onChange={handleChange}
        className="w-20 text-right"
      />
      <span className="text-sm text-muted-foreground">unit</span>
    </div>
  </div>

  <Slider
    value={value}
    onValueChange={setValue}
    min={1}
    max={500}
    step={5}
  />

  <div className="flex items-center justify-between text-sm text-muted-foreground">
    <span>Min label</span>
    <span>Max label</span>
  </div>
</div>
```

---

## Common Patterns

### Empty States
```tsx
<div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
  <p>No items yet</p>
  <p className="text-sm">Description of what will appear here</p>
</div>
```

### Section with Header Action
```tsx
<div className="flex items-center justify-between">
  <div className="space-y-2">
    <h2 className="text-2xl font-bold">Section Title</h2>
    <p className="text-muted-foreground">Description</p>
  </div>
  <Button variant="outline" size="sm">
    <Icon className="h-4 w-4 mr-2" />
    Action
  </Button>
</div>
```

### Merged Sections
```tsx
<div className="space-y-6">
  {/* Section 1 */}
  <div className="space-y-4">
    <h3 className="font-semibold text-sm">Subsection Title</h3>
    {/* Content */}
  </div>

  {/* Section 2 */}
  <div className="space-y-4">
    <h3 className="font-semibold text-sm">Another Subsection</h3>
    {/* Content */}
  </div>
</div>
```

---

## Do's and Don'ts

### ✅ DO
- Use `bg-muted/50` for card backgrounds
- Keep sections flat on page background when possible
- Use horizontal dividers between major sections
- Use primary buttons for main CTAs
- Maintain consistent spacing (`space-y-6`, `gap-6`)
- Add `pt-6` to align flat sections with card headers

### ❌ DON'T
- Don't wrap every section in a card
- Don't use gradient backgrounds unless absolutely necessary
- Don't use outline buttons for primary CTAs
- Don't stack multiple cards vertically without dividers
- Don't mix spacing patterns (stick to 6-unit increments)

---

## Migration Checklist

When updating existing pages to match this style guide:

1. [ ] Remove unnecessary card wrappers
2. [ ] Add horizontal dividers between sections
3. [ ] Update card backgrounds to `bg-muted/50`
4. [ ] Change primary CTAs from outline to solid buttons
5. [ ] Ensure consistent spacing (`space-y-6`)
6. [ ] Update typography to match hierarchy
7. [ ] Add `pt-6` to flat sections for alignment
8. [ ] Review and simplify layout structure

---

## Reference Files

- `/src/pages/Billing.tsx` - Primary reference implementation
- `/src/components/ui/*` - shadcn/ui components
- `/src/components/dashboard/*` - Dashboard-specific components

---

**Note:** This style guide is a living document. Update it as design patterns evolve.
