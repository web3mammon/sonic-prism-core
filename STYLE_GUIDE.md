# Klariqo Core UI Style Guide

**Last Updated:** 2025-01-20
**Reference Implementations:**
- `/src/pages/TenantDashboard.tsx` - Primary dashboard with color-coded metrics
- `/src/pages/Billing.tsx` - Flat layout patterns
- `/src/components/dashboard/MetricsCard.tsx` - Reusable metric cards

## Design Philosophy

Modern, elegant, and minimal interface with ultralight typography. Emphasis on breathing room, subtle visual interest through background patterns, and consistent spacing. Large, lightweight numbers create a sophisticated, data-forward aesthetic.

---

## Layout Principles

### 1. Background Pattern
All pages now have a subtle dot pattern for visual interest without distraction:

```tsx
<div className="space-y-6 font-manrope relative">
  {/* Subtle background pattern */}
  <div className="fixed inset-0 -z-10 opacity-[0.08] dark:opacity-[0.05]" style={{
    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
    backgroundSize: '24px 24px'
  }}></div>

  {/* Page content */}
</div>
```

### 2. Minimal Card Usage
- **DO:** Use cards for metric displays and primary content blocks
- **DON'T:** Wrap every section in a card - leads to boxy, cluttered appearance
- **NEW:** All metric cards use `bg-muted/50` for consistency

### 3. Grid Layouts
```tsx
// Dashboard 2x2 + sidebar layout
<div className="grid gap-6 lg:grid-cols-3">
  {/* Left: 2x2 grid takes 2 columns */}
  <div className="lg:col-span-2 grid gap-4 grid-cols-2">
    {/* 4 metric cards */}
  </div>

  {/* Right: Sidebar takes 1 column */}
  <Card className="bg-muted/50">...</Card>
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

**Font Philosophy:** All headings and large numbers use `font-extralight` (weight 200) for an elegant, modern aesthetic. This creates visual hierarchy through size rather than weight.

### Page Title
```tsx
// For dashboard pages WITHOUT subtitle (like TenantDashboard)
<h1 className="text-5xl font-extralight mb-6">
  {client.business_name} Dashboard
</h1>

// For pages WITH subtitle (all other pages)
<div className="space-y-2">
  <h1 className="text-5xl font-extralight mb-2">Page Title</h1>
  <p className="text-muted-foreground">
    Brief description of the page
  </p>
</div>
```

**Spacing Rules:**
- Use `mb-6` (24px) when headline has no subtitle below it
- Use `mb-2` (8px) when headline has a subtitle to maintain proper text grouping

### Section Headings
```tsx
// Main section (h2)
<div className="space-y-2">
  <h2 className="text-2xl font-extralight">Section Title</h2>
  <p className="text-muted-foreground">
    Section description
  </p>
</div>

// With icon
<h2 className="text-2xl font-extralight flex items-center gap-2">
  <CreditCard className="h-5 w-5 text-primary" />
  Section Title
</h2>

// Subsection (h3)
<h3 className="font-semibold text-sm">Subsection Title</h3>
```

### Card Titles
```tsx
// All card titles use ultralight font
<CardTitle className="text-sm font-extralight">Card Title</CardTitle>

// Larger card titles (for primary content)
<CardTitle className="text-2xl font-extralight flex items-center gap-2">
  <Icon className="h-5 w-5 text-primary" />
  Card Title
</CardTitle>
```

### Metric Values
```tsx
// Large metric numbers - ALWAYS use text-5xl font-extralight
<div className="text-5xl font-extralight text-blue-700 dark:text-blue-300">
  {value.toLocaleString()}
</div>

// Subtitle below metric - ALWAYS use mt-2 for consistency
<p className="text-xs text-muted-foreground mt-2">metric description</p>
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

### 1. Metric Card (Standard)
```tsx
// Used in Analytics, Call Logs - via MetricsCard component
<Card className="font-manrope border-l-4 border-l-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-muted/50">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-extralight text-muted-foreground">
      Metric Title
    </CardTitle>
    <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-5xl font-extralight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
      {value}
    </div>
    <div className="flex items-center space-x-2 mt-2">
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </CardContent>
</Card>
```

### 2. Color-Coded Metric Card (Dashboard)
```tsx
// Used in TenantDashboard for colored metric cards
// Available colors: blue, green, purple, amber
<Card className="font-manrope border-l-4 border-l-blue-500 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-blue-50/75 dark:bg-blue-950/30 flex flex-col justify-between min-h-[160px]">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Calls This Month
    </CardTitle>
    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
      <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-5xl font-extralight text-blue-700 dark:text-blue-300">
      {value.toLocaleString()}
    </div>
    <p className="text-xs text-muted-foreground mt-2">total calls</p>
  </CardContent>
</Card>
```

**Color System for Metric Cards:**
- **Blue:** Calls/Usage metrics (`border-l-blue-500`, `bg-blue-50/75`, `dark:bg-blue-950/30`)
- **Green:** Available/Remaining metrics (`border-l-green-500`, `bg-green-50/75`, `dark:bg-green-950/30`)
- **Purple:** Performance metrics (`border-l-purple-500`, `bg-purple-50/75`, `dark:bg-purple-950/30`)
- **Amber:** Time/Date metrics (`border-l-amber-500`, `bg-amber-50/75`, `dark:bg-amber-950/30`)

### 3. Primary Content Card
```tsx
<Card className="bg-muted/50">
  <CardHeader>
    <CardTitle className="text-2xl font-extralight flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      Card Title
    </CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Content - use p-6 for metric-style cards */}
  </CardContent>
</Card>
```

### 4. Simple Stat Card (Call Logs style)
```tsx
// Horizontal layout with icon - padding MUST be p-6
<Card className="bg-muted/50">
  <CardContent className="p-6">
    <div className="flex items-center space-x-3">
      <Phone className="h-5 w-5 text-blue-500" />
      <div>
        <p className="text-5xl font-extralight">{value}</p>
        <p className="text-sm text-muted-foreground mt-2">Total Calls</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### 5. Flat Section (No Card)
```tsx
<div className="space-y-6 pt-6"> {/* pt-6 for alignment */}
  <div className="space-y-2">
    <h2 className="text-2xl font-extralight">Section Title</h2>
    <p className="text-muted-foreground">
      Section description
    </p>
  </div>
  <div className="space-y-4">
    {/* Section content */}
  </div>
</div>
```

### 6. Info Boxes
```tsx
// Use muted background for highlighted info
<div className="p-4 rounded-lg bg-muted/50 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">Label</span>
    <span className="font-medium">Value</span>
  </div>
</div>
```

### 7. List Items with Indicators
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
- Use `text-5xl font-extralight` for all page headlines
- Use `text-5xl font-extralight` for all metric values
- Use `mb-6` for headlines without subtitles, `mb-2` for headlines with subtitles
- Use `mt-2` between metric values and their subtexts (ALWAYS)
- Use `p-6` for metric card content padding
- Add subtle dot pattern background to all pages
- Use `bg-muted/50` for all card backgrounds
- Use color-coded cards for dashboard metrics (blue, green, purple, amber)
- Keep sections flat on page background when possible
- Use horizontal dividers between major sections
- Maintain consistent spacing (`space-y-6`, `gap-6`)
- Add hover effects to metric cards (`hover:shadow-lg hover:-translate-y-1`)

### ❌ DON'T
- Don't use `font-bold` for headlines - use `font-extralight` instead
- Don't use `text-3xl` for headlines - use `text-5xl` instead
- Don't use inconsistent spacing between values and subtexts (ALWAYS mt-2)
- Don't use `p-4` for metric cards - use `p-6` for breathing room
- Don't skip the background pattern on new pages
- Don't wrap every section in a card
- Don't use gradient backgrounds for card backgrounds (solid colors only)
- Don't use outline buttons for primary CTAs
- Don't stack multiple cards vertically without dividers
- Don't mix spacing patterns (stick to 6-unit increments for major spacing)

---

## Migration Checklist

When updating existing pages to match this style guide:

1. [ ] Add subtle dot pattern background to page container
2. [ ] Update page headline to `text-5xl font-extralight`
3. [ ] Add proper spacing to headline (`mb-6` or `mb-2`)
4. [ ] Update all section headings to `font-extralight`
5. [ ] Update all card titles to `font-extralight`
6. [ ] Update all metric values to `text-5xl font-extralight`
7. [ ] Ensure `mt-2` spacing between all values and subtexts
8. [ ] Update card content padding to `p-6` for metric cards
9. [ ] Update card backgrounds to `bg-muted/50`
10. [ ] Add horizontal dividers between sections
11. [ ] Ensure consistent spacing (`space-y-6`, `gap-6`)
12. [ ] Add hover effects to metric cards
13. [ ] Review and simplify layout structure

---

## Reference Files

- `/src/pages/TenantDashboard.tsx` - **PRIMARY REFERENCE** - Complete implementation with:
  - Color-coded metric cards (Blue, Green, Purple, Amber)
  - Credit Balance card layout
  - Subtle dot pattern background
  - Text-5xl font-extralight throughout
  - Proper spacing and padding
- `/src/pages/Analytics.tsx` - MetricsCard component usage
- `/src/pages/Logs.tsx` - Simple stat cards with horizontal layout
- `/src/components/dashboard/MetricsCard.tsx` - Reusable metric card component
- `/src/pages/Billing.tsx` - Flat layout patterns (legacy)
- `/src/components/ui/*` - shadcn/ui components

---

## Key Design Decisions

### Why Font-Extralight?
Ultralight typography (weight 200) creates a modern, sophisticated aesthetic. Combined with larger sizes (text-5xl), it provides excellent readability while feeling elegant and uncluttered. The light weight prevents the interface from feeling heavy or overwhelming.

### Why Text-5xl for Metrics?
Large numbers (48px) draw immediate attention to key data points. When combined with ultralight weight, they become the focal point without dominating the interface.

### Why mt-2 Spacing?
8px (mt-2) provides just enough breathing room between values and labels without creating visual disconnection. Consistent spacing across all metrics creates rhythm and predictability.

### Why Dot Pattern Background?
The subtle dot pattern (8% light, 5% dark opacity) adds visual interest without distraction. It creates depth and texture while maintaining the clean, minimal aesthetic.

### Why Color-Coded Cards?
Color coding helps users quickly scan and categorize different metric types. The flat, tinted backgrounds (75% opacity light, 30% opacity dark) provide enough contrast to be noticeable without overwhelming the interface.

---

**Note:** This style guide is a living document. Update it as design patterns evolve.
