# GymBrAIn Frontend Style Guide

## Overview

GymBrAIn uses a refined, warm aesthetic that combines modern minimalism with natural, earthy tones. The design emphasizes clarity, focus, and a calming workout experience. This guide documents all design tokens, patterns, and implementation details for consistent UI development.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Typography](#typography)
3. [Color System](#color-system)
4. [Spacing System](#spacing-system)
5. [Layout & Grid](#layout--grid)
6. [Components](#components)
7. [Icons](#icons)
8. [Shadows & Elevation](#shadows--elevation)
9. [Animations & Transitions](#animations--transitions)
10. [Desktop Adaptations](#desktop-adaptations)

---

## Design Philosophy

**Aesthetic Direction**: Warm, organic minimalism with refined typography and intentional use of space. Inspired by editorial design and wellness apps.

**Key Characteristics**:
- Natural, earthy color palette (sage greens, warm grays, browns)
- Serif headings for elegance, sans-serif body for readability
- Generous spacing and breathing room
- Subtle borders and shadows (not flat, not dramatic)
- Consistent rounded corners (12-16px for cards, 6-10px for buttons/inputs)

**Differentiation**: The combination of Libre Baskerville serif headings with the warm olive accent color creates a distinctive, sophisticated feel that stands apart from typical fitness apps.

---

## Typography

### Font Families

```css
/* Import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');

--font-display: 'Libre Baskerville', Georgia, 'Times New Roman', serif;
--font-body: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Fallback Strategy**: If custom fonts fail to load, gracefully degrade to system serif (Georgia) for headings and system sans-serif for body text.

### Type Scale (Mobile)

| Element | Size | Weight | Font | Line Height | Letter Spacing |
|---------|------|--------|------|-------------|----------------|
| Hero Heading | 24px | 600 | Display | 1.2 | -0.5px |
| H1 | 22px | 600 | Display | 1.3 | normal |
| H2 | 18px | 600 | Display | 1.3 | normal |
| H3 | 16px | 600 | Display | 1.4 | normal |
| H4 | 15px | 600 | Body | 1.4 | normal |
| Body Large | 15px | 400-500 | Body | 1.6 | normal |
| Body | 14px | 400 | Body | 1.6 | normal |
| Body Small | 13px | 400 | Body | 1.5 | normal |
| Caption | 12px | 400-500 | Body | 1.4 | normal |
| Label | 11px | 500-600 | Body | 1.3 | 0.5px |
| Micro | 10px | 400-600 | Body | 1.3 | 0.5px |

### Type Scale (Desktop)

| Element | Size | Weight | Font | Line Height |
|---------|------|--------|------|-------------|
| Hero Heading | 32px | 600 | Display | 1.2 |
| H1 | 28px | 600 | Display | 1.3 |
| H2 | 22px | 600 | Display | 1.3 |
| H3 | 18px | 600 | Display | 1.4 |
| Body Large | 16px | 400-500 | Body | 1.6 |
| Body | 15px | 400 | Body | 1.6 |

### Typography Utilities

**Uppercase Labels** (for small UI elements):
```css
font-size: 10-12px;
font-weight: 500-600;
text-transform: uppercase;
letter-spacing: 0.5px;
```

**Number Display** (stats, metrics):
```css
font-family: var(--font-display);
font-weight: 700;
font-size: 20px;
```

---

## Color System

### Theme Structure

GymBrAIn supports two themes: **Light Mode** and **Dark Warm Mode**. All colors should be referenced through CSS variables for easy theme switching.

### Light Mode Palette

```css
/* Backgrounds */
--bg: #f5f2ed;           /* Main background - warm off-white */
--bg-alt: #ebe7e0;       /* Alternate background - slightly darker */
--surface: #ffffff;       /* Card/component surface */
--surface-hover: #fafaf8; /* Surface hover state */

/* Text */
--text: #2d2a26;          /* Primary text - dark brown */
--text-muted: #6b6560;    /* Secondary text - medium gray-brown */
--text-light: #9a948c;    /* Tertiary text - light gray */

/* Accent (Primary Brand Color) */
--accent: #6b7c3f;        /* Olive green - primary actions */
--accent-hover: #5a6935;  /* Darker olive - hover state */
--accent-light: #e8ebdf;  /* Very light olive - subtle backgrounds */

/* Secondary */
--secondary: #8b7355;         /* Brown - secondary actions */
--secondary-light: #c4b5a5;   /* Light brown */

/* Borders */
--border: #d9d4cc;        /* Standard borders */
--border-light: #e8e4dc;  /* Subtle borders */

/* Semantic Colors */
--success: #5a7c40;       /* Green - completed states */
--success-bg: #f0f4eb;    /* Success background */
--success-border: #d4e0c8; /* Success border */
--warning: #b8860b;       /* Gold - warnings */
--error: #a65d57;         /* Red - errors */
```

### Dark Warm Mode Palette

```css
/* Backgrounds */
--bg: #1a1816;            /* Main background - very dark brown */
--bg-alt: #121110;        /* Alternate background - nearly black */
--surface: #252220;       /* Card/component surface - dark gray-brown */
--surface-hover: #2e2a27; /* Surface hover state */

/* Text */
--text: #e8e4df;          /* Primary text - warm off-white */
--text-muted: #a09a92;    /* Secondary text - medium gray */
--text-light: #6b665f;    /* Tertiary text - dark gray */

/* Accent (Primary Brand Color) */
--accent: #8fa558;        /* Sage green - primary actions */
--accent-hover: #a3b86c;  /* Lighter sage - hover state */
--accent-light: #2a2e22;  /* Very dark olive - subtle backgrounds */

/* Secondary */
--secondary: #c4a77d;         /* Tan - secondary actions */
--secondary-light: #3d352a;   /* Dark brown */

/* Borders */
--border: #3a3632;        /* Standard borders */
--border-light: #2e2a27;  /* Subtle borders */

/* Semantic Colors */
--success: #7a9c5a;       /* Green - completed states */
--success-bg: #1e2219;    /* Success background */
--success-border: #3a4a2e; /* Success border */
--warning: #d4a84b;       /* Gold - warnings */
--error: #c47a74;         /* Red - errors */
```

### Color Usage Guidelines

**Hierarchy**:
1. `--accent` for primary actions, active states, key highlights
2. `--text` for all primary content
3. `--text-muted` for secondary information
4. `--text-light` for tertiary/metadata
5. `--border` for standard dividers
6. `--border-light` for subtle separations

**Semantic Colors**:
- Use `--success` for completed workouts, achieved PRs, positive metrics
- Use `--warning` sparingly for alerts that need attention
- Use `--error` for failed inputs, critical warnings

**Backgrounds**:
- Main pages use `--bg`
- Cards/surfaces use `--surface`
- Alternating sections can use `--bg-alt`
- Accent backgrounds use `--accent-light` (10-15% opacity of accent)

---

## Spacing System

### Mobile Spacing Scale

Use a 4px base unit with the following scale:

```css
--space-1: 4px;    /* Tight spacing between related items */
--space-2: 6px;    /* Small gaps in compact layouts */
--space-3: 8px;    /* Standard small spacing */
--space-4: 10px;   /* Medium-small spacing */
--space-5: 12px;   /* Standard spacing */
--space-6: 14px;   /* Medium spacing */
--space-7: 16px;   /* Standard large spacing */
--space-8: 18px;   /* Large spacing */
--space-9: 20px;   /* Extra large spacing */
--space-10: 24px;  /* Section spacing */
--space-11: 32px;  /* Major section spacing */
--space-12: 40px;  /* Page-level spacing */
```

### Desktop Spacing Scale

Desktop uses larger spacing for better visual comfort:

```css
--space-1: 6px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-9: 40px;
--space-10: 48px;
--space-11: 64px;
--space-12: 80px;
```

### Common Spacing Patterns

**Card Padding**:
- Mobile: `14-16px`
- Desktop: `20-24px`

**Section Gaps**:
- Mobile: `12-16px` between cards
- Desktop: `20-24px` between cards

**Container Padding**:
- Mobile: `16px` horizontal padding
- Desktop: `24-32px` horizontal padding

**Form Element Spacing**:
- Gap between form rows: `8-10px`
- Label to input: `4-6px`
- Form group spacing: `12-16px`

---

## Layout & Grid

### Mobile Layout (280px - 428px)

**Container**:
```css
width: 100%;
max-width: 428px;
padding: 0 16px;
margin: 0 auto;
```

**Safe Areas**:
- Top: `52px` (accounts for phone notch/status bar)
- Bottom: `90px` (accounts for bottom navigation when present)
- Bottom (no nav): `16px`

**Screen Structure**:
```
┌─────────────────┐
│   Status Bar    │ 52px safe area
├─────────────────┤
│                 │
│   Content Area  │ Scrollable
│                 │
├─────────────────┤
│  Bottom Nav     │ 90px (when present)
└─────────────────┘
```

### Desktop Layout (768px+)

**Main Container**:
```css
width: 100%;
max-width: 1200px;
padding: 0 40px;
margin: 0 auto;
```

**Multi-Column Layouts**:
- 2-column split for workout tracking (exercise list + detail view)
- 3-column grid for statistics/cards
- Sidebar navigation (240px width) + main content area

**Responsive Breakpoints**:
```css
/* Mobile */
@media (max-width: 767px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large Desktop */
@media (min-width: 1440px) { }
```

---

## Components

### Buttons

#### Primary Button
```jsx
<button className="
  w-full px-4 py-3
  bg-accent text-white
  rounded-xl
  text-[15px] font-semibold
  hover:bg-accent-hover
  active:scale-[0.98]
  transition-all duration-200
  shadow-sm
">
  Start Workout
</button>
```

**States**:
- Default: `bg-accent`, no shadow or subtle `shadow-sm`
- Hover: `bg-accent-hover`, slightly darker
- Active/Pressed: `scale-[0.98]` (slight press effect)
- Disabled: `opacity-50 cursor-not-allowed`
- Loading: Show spinner, `opacity-75`

#### Secondary Button
```jsx
<button className="
  px-4 py-3
  bg-surface border border-border
  text-text
  rounded-xl
  text-[14px] font-medium
  hover:bg-surface-hover
  transition-colors duration-200
">
  Cancel
</button>
```

#### Tertiary/Ghost Button
```jsx
<button className="
  px-4 py-2
  bg-transparent
  text-accent
  text-[14px] font-medium
  hover:bg-accent-light
  rounded-lg
  transition-colors duration-200
">
  Skip
</button>
```

#### Icon Button
```jsx
<button className="
  w-10 h-10
  bg-surface border border-border
  rounded-xl
  flex items-center justify-center
  hover:bg-surface-hover
  transition-colors duration-200
">
  <UserIcon className="w-5 h-5 text-text-muted" />
</button>
```

#### Button with Icon
```jsx
<button className="
  px-3 py-2
  bg-accent-light
  text-accent
  rounded-lg
  text-[12px] font-semibold
  flex items-center gap-1
  hover:bg-accent hover:text-white
  transition-all duration-200
">
  <AIIcon className="w-3.5 h-3.5" />
  Ask AI
</button>
```

### Cards

#### Standard Card
```jsx
<div className="
  bg-surface
  border border-border-light
  rounded-2xl
  p-4
  shadow-sm
">
  {/* Card content */}
</div>
```

#### Elevated Card (hover state)
```jsx
<div className="
  bg-surface
  border border-border-light
  rounded-2xl
  p-4
  shadow-sm
  hover:shadow-md hover:border-border
  transition-all duration-300
  cursor-pointer
">
  {/* Card content */}
</div>
```

#### Active/Selected Card
```jsx
<div className="
  bg-surface
  border-2 border-accent
  rounded-2xl
  p-4
  shadow-md
">
  {/* Current exercise being tracked */}
</div>
```

#### Success Card (completed state)
```jsx
<div className="
  bg-surface
  border border-success-border
  rounded-2xl
  p-4
  shadow-sm
">
  {/* Completed exercise */}
</div>
```

#### Accent Background Card
```jsx
<div className="
  bg-accent-light
  border border-accent/40
  rounded-xl
  p-4
">
  {/* PR notification, special highlight */}
</div>
```

### Form Inputs

#### Text Input
```jsx
<input
  type="text"
  placeholder="—"
  className="
    w-full h-8 px-2
    bg-bg
    border border-border
    rounded-lg
    text-[13px] text-text text-center
    placeholder:text-text-light
    focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
  "
/>
```

**States**:
- Default: `border-border`
- Focus: `border-accent ring-2 ring-accent/20`
- Error: `border-error ring-2 ring-error/20`
- Disabled: `opacity-50 cursor-not-allowed`
- Filled: Maintain default styling

#### Search Input
```jsx
<div className="
  flex items-center gap-2.5
  bg-surface border border-border
  rounded-xl px-3.5 py-2.5
  focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20
  transition-all duration-200
">
  <SearchIcon className="w-4.5 h-4.5 text-text-muted" />
  <input
    type="text"
    placeholder="Search workouts..."
    className="
      flex-1 bg-transparent
      text-[14px] text-text
      placeholder:text-text-muted
      outline-none
    "
  />
</div>
```

#### Select/Dropdown Button
```jsx
<button className="
  flex items-center justify-between
  w-full px-4 py-4
  bg-surface border border-border
  rounded-xl
  text-[15px] font-medium text-text
  hover:border-accent
  transition-all duration-200
">
  <span>Build Muscle</span>
  <ChevronRightIcon className="w-4.5 h-4.5 text-text-light" />
</button>
```

**Selected State**:
```jsx
<button className="
  flex items-center justify-between
  w-full px-4 py-4
  bg-surface border-2 border-accent
  rounded-xl
  text-[15px] font-semibold text-text
">
  <span>Build Muscle</span>
  <div className="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
    <CheckIcon className="w-2.5 h-2.5 text-white" />
  </div>
</button>
```

### Checkbox/Toggle States

#### Unchecked Set
```jsx
<div className="
  w-7 h-7
  bg-bg-alt
  border-1.5 border-border
  rounded-lg
  flex items-center justify-center
  text-[11px] font-semibold text-text-muted
">
  3
</div>
```

#### Checked Set
```jsx
<div className="
  w-7 h-7
  bg-success
  rounded-lg
  flex items-center justify-center
">
  <CheckIcon className="w-3 h-3 text-white" />
</div>
```

### Badge/Tag

#### Status Badge
```jsx
<span className="
  inline-block
  px-2.5 py-1
  bg-accent-light
  text-accent
  text-[11px] font-semibold
  rounded-md
">
  5 exercises
</span>
```

#### Muscle Tag
```jsx
<span className="
  inline-block
  px-2.5 py-1.5
  bg-bg-alt
  text-text
  text-[12px]
  rounded-lg
">
  Chest
</span>
```

### Progress Bar

```jsx
<div className="flex items-center gap-2.5">
  <span className="text-[12px] text-text-muted w-16">Chest</span>
  <div className="flex-1 h-1.5 bg-bg-alt rounded-full overflow-hidden">
    <div
      className="h-full bg-accent rounded-full transition-all duration-500"
      style={{ width: '75%' }}
    />
  </div>
  <span className="text-[11px] text-text-light w-10 text-right">12/16</span>
</div>
```

**Success State** (when complete):
```jsx
<div className="h-full bg-success rounded-full" />
```

### Set Row (Exercise Tracking)

```jsx
<div className="
  flex items-center gap-1.5
  p-1.5 -mx-1.5
  rounded-lg
  bg-success-bg border border-success-border  // When completed
  // OR bg-transparent border border-transparent  // When not completed
  transition-all duration-200
">
  {/* Status checkbox */}
  <div className="w-7 h-7 shrink-0">
    {/* Checkbox component */}
  </div>
  
  {/* Weight input */}
  <input className="w-14 h-8 shrink-0" />
  
  {/* Reps input */}
  <input className="w-12 h-8 shrink-0" />
  
  {/* RIR input */}
  <input className="w-10 h-8 shrink-0" />
  
  {/* Note icon */}
  <div className="w-6 shrink-0 flex justify-center opacity-50 hover:opacity-100">
    <NoteIcon className="w-3.5 h-3.5 text-text-muted cursor-pointer" />
  </div>
</div>
```

### Bottom Navigation

```jsx
<nav className="
  fixed bottom-0 left-0 right-0
  pt-3 pb-5 px-5
  bg-bg
  border-t border-border-light
  flex justify-around items-center
">
  {navItems.map(item => (
    <button
      key={item.key}
      className={`
        flex flex-col items-center gap-1
        transition-opacity duration-200
        ${isActive ? 'opacity-100' : 'opacity-50'}
      `}
    >
      <item.icon
        className={`w-5.5 h-5.5 ${isActive ? 'text-accent' : 'text-text-muted'}`}
      />
      <span className={`
        text-[10px]
        ${isActive ? 'text-accent font-semibold' : 'text-text-muted font-normal'}
      `}>
        {item.label}
      </span>
    </button>
  ))}
</nav>
```

### Stats Display

#### Large Stat (Hero Number)
```jsx
<div className="text-center">
  <p className="
    text-[11px] font-medium
    text-text-muted
    uppercase tracking-wide
    mb-1
  ">
    Duration
  </p>
  <p className="
    text-5 font-bold
    text-text
    font-display
  ">
    1:01:43
  </p>
</div>
```

#### Small Stat (Card Metric)
```jsx
<div>
  <div className="flex items-center gap-2 mb-1.5">
    <WeightIcon className="w-4 h-4 text-accent" />
    <span className="
      text-[11px] font-medium
      text-text-muted
      uppercase tracking-wide
    ">
      This Week
    </span>
  </div>
  <p className="
    text-5 font-bold
    text-text
    font-display
  ">
    42,850
  </p>
  <p className="text-[11px] text-text-muted mt-0.5">
    lbs lifted
  </p>
</div>
```

### History Card (Workout Summary)

```jsx
<div className="
  bg-surface
  border border-border-light
  rounded-2xl
  p-3.5
  hover:border-border hover:shadow-md
  transition-all duration-300
  cursor-pointer
">
  <div className="flex justify-between items-start mb-2">
    <div>
      <p className="text-[11px] text-text-muted mb-0.5">Jan 15, 2026</p>
      <h3 className="text-base font-semibold text-text font-display">
        Push Day
      </h3>
    </div>
    <ChevronRightIcon className="w-4.5 h-4.5 text-text-light" />
  </div>
  
  <p className="text-[12px] text-text-muted mb-2">
    Bench Press, Incline DB Press, Cable Flies +3 more
  </p>
  
  <div className="flex gap-4">
    <span className="text-[12px] text-text-light">22 sets</span>
    <span className="text-[12px] text-text-light">1:01:43</span>
  </div>
</div>
```

### Segmented Control (Tab Switcher)

```jsx
<div className="
  flex
  bg-bg-alt
  rounded-xl
  p-1
  gap-0
">
  <button className={`
    flex-1 py-2.5
    rounded-lg
    text-[13px] font-medium
    transition-all duration-200
    ${isActive 
      ? 'bg-surface text-text font-semibold shadow-sm' 
      : 'bg-transparent text-text-muted'
    }
  `}>
    By Date
  </button>
  <button className={`
    flex-1 py-2.5
    rounded-lg
    text-[13px] font-medium
    transition-all duration-200
    ${isActive 
      ? 'bg-surface text-text font-semibold shadow-sm' 
      : 'bg-transparent text-text-muted'
    }
  `}>
    By Exercise
  </button>
</div>
```

### Pagination Dots

```jsx
<div className="flex gap-1.5 justify-center">
  {[1, 2, 3, 4, 5].map(i => (
    <div
      key={i}
      className={`
        h-2 rounded-full
        transition-all duration-300
        ${isActive 
          ? 'w-6 bg-accent' 
          : 'w-2 bg-border'
        }
      `}
    />
  ))}
</div>
```

---

## Icons

### Icon System

All icons are custom SVG components with the following pattern:

```jsx
const IconName = ({ color, size = 18, strokeWidth = 1.5 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* SVG paths */}
  </svg>
);
```

### Icon Sizes

Use these standard sizes across the app:

```css
--icon-xs: 12px;   /* Checkmarks, micro icons */
--icon-sm: 14px;   /* Note icon, AI icon, small UI elements */
--icon-md: 16px;   /* Trophy, history, standard inline icons */
--icon-base: 18px; /* Search, weight, default icon size */
--icon-lg: 20px;   /* User icon, back button */
--icon-xl: 22px;   /* Bottom nav icons */
```

### Icon Color Usage

- Primary icons: `text-text` or `text-text-muted`
- Accent icons: `text-accent`
- Success icons: `text-success`
- Muted/inactive: `text-text-light`

### Creating New Icons

1. Use 24x24 viewBox for consistency
2. Default stroke width: `1.5`
3. Use `round` linecaps and linejoins
4. Keep paths simple and clean
5. Ensure icon reads clearly at `14px` minimum

**Example Icon Component**:
```jsx
const DumbbellIcon = ({ color, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 18V6M18 18V6M3 8v8a1 1 0 001 1h2V7H4a1 1 0 00-1 1zM21 8v8a1 1 0 01-1 1h-2V7h2a1 1 0 011 1zM6 12h12" />
  </svg>
);
```

---

## Shadows & Elevation

### Shadow Scale

```css
/* Subtle - Cards at rest */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);

/* Default - Standard elevation */
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);

/* Medium - Hover states, dropdowns */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);

/* Large - Modals, important elements */
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);

/* Extra Large - Dialogs, popovers */
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);

/* Phone Frame - Device mockup */
--shadow-phone: 0 25px 50px rgba(0, 0, 0, 0.4);
```

### Dark Mode Adjustments

In dark mode, shadows should be slightly more pronounced:

```css
/* Dark mode shadow overrides */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-base: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
```

### Usage Guidelines

- Most cards: `shadow-sm` at rest, `shadow-md` on hover
- Bottom navigation: `shadow-md` (fixed element)
- Modals/dialogs: `shadow-lg` or `shadow-xl`
- Buttons: Typically no shadow or `shadow-sm`
- Active/focused cards: `shadow-md`

---

## Animations & Transitions

### Transition Durations

```css
--duration-fast: 150ms;      /* Quick feedback (hover, active) */
--duration-base: 200ms;      /* Standard transitions (colors, opacity) */
--duration-slow: 300ms;      /* Smooth transitions (shadows, transforms) */
--duration-slower: 500ms;    /* Progress bars, page transitions */
```

### Easing Functions

```css
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);          /* Snappy exits */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);       /* Smooth both ways */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);    /* Bouncy spring */
```

### Common Transitions

#### Button Interactions
```css
.button {
  transition: all 200ms cubic-bezier(0.33, 1, 0.68, 1);
}

.button:hover {
  /* Color change: 200ms */
}

.button:active {
  transform: scale(0.98);
  /* Scale: 150ms for immediate feedback */
  transition: transform 150ms cubic-bezier(0.33, 1, 0.68, 1);
}
```

#### Card Hover
```css
.card {
  transition: all 300ms cubic-bezier(0.33, 1, 0.68, 1);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border);
}
```

#### Input Focus
```css
.input {
  transition: all 200ms cubic-bezier(0.33, 1, 0.68, 1);
}

.input:focus {
  border-color: var(--accent);
  ring: 2px solid rgba(accent, 0.2);
}
```

#### Progress Bar Fill
```css
.progress-bar {
  transition: width 500ms cubic-bezier(0.65, 0, 0.35, 1);
}
```

#### Page Transitions (Fade In)
```css
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 300ms cubic-bezier(0.33, 1, 0.68, 1);
}
```

#### Staggered List Items
```jsx
{items.map((item, i) => (
  <div
    key={item.id}
    style={{
      animation: `fadeInUp 300ms cubic-bezier(0.33, 1, 0.68, 1) ${i * 50}ms both`
    }}
  >
    {item.content}
  </div>
))}
```

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### Micro-interactions

**Checkbox completion**:
```css
.checkbox-check {
  animation: checkPop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes checkPop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

**Success celebration** (workout complete):
```css
.success-icon {
  animation: successPulse 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes successPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

### Animation Best Practices

1. **Performance**: Use `transform` and `opacity` when possible (GPU-accelerated)
2. **Reduce Motion**: Respect user preferences:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
3. **Loading States**: Use skeleton screens with subtle pulse animations
4. **Error States**: Quick shake animation for invalid inputs:
   ```css
   @keyframes shake {
     0%, 100% { transform: translateX(0); }
     25% { transform: translateX(-4px); }
     75% { transform: translateX(4px); }
   }
   ```

---

## Desktop Adaptations

### Layout Changes

#### Responsive Container
```jsx
<div className="
  w-full max-w-[428px] mx-auto
  md:max-w-3xl
  lg:max-w-5xl
  px-4
  md:px-6
  lg:px-8
">
  {/* Content */}
</div>
```

#### Multi-Column Layouts

**Workout Tracking** (Desktop):
```
┌────────────────────────────────┬──────────────────────┐
│                                │                      │
│   Exercise List                │   Active Exercise    │
│   (Sidebar)                    │   (Detail View)      │
│                                │                      │
│   - Incline DB Press ✓         │   Bench Press        │
│   - Bench Press (active)       │   [Set tracking UI]  │
│   - Cable Flies                │                      │
│   - Tricep Pushdowns           │   [History]          │
│                                │   [Notes]            │
│                                │                      │
└────────────────────────────────┴──────────────────────┘
     240px                              flex-1
```

```jsx
<div className="flex gap-6 lg:gap-8">
  {/* Exercise List Sidebar */}
  <aside className="hidden lg:block w-60 xl:w-72 shrink-0">
    {/* Scrollable exercise list */}
  </aside>
  
  {/* Main Content */}
  <main className="flex-1 min-w-0">
    {/* Active exercise detail */}
  </main>
</div>
```

**Dashboard Grid** (Desktop):
```jsx
<div className="
  grid grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-4
  md:gap-5
  lg:gap-6
">
  {cards.map(card => (
    <Card key={card.id} {...card} />
  ))}
</div>
```

### Navigation Changes

**Desktop Sidebar Navigation** (instead of bottom nav):
```jsx
<nav className="
  hidden lg:flex
  flex-col
  w-60
  h-screen
  bg-surface
  border-r border-border-light
  p-6
  sticky top-0
">
  <div className="mb-8">
    <h1 className="text-2xl font-bold text-accent font-display">
      Gym<span className="text-text">BrAI</span>n
    </h1>
  </div>
  
  {navItems.map(item => (
    <button
      key={item.key}
      className={`
        flex items-center gap-3
        px-4 py-3
        rounded-xl
        text-[15px] font-medium
        transition-all duration-200
        ${isActive 
          ? 'bg-accent-light text-accent' 
          : 'text-text-muted hover:bg-surface-hover hover:text-text'
        }
      `}
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </button>
  ))}
</nav>
```

### Desktop-Specific Improvements

1. **Hover States**: More pronounced on desktop (cards lift, borders change)
2. **Tooltips**: Add tooltips for icon-only buttons
3. **Keyboard Navigation**: Ensure tab order and shortcuts work
4. **Larger Click Targets**: Increase to 44x44px minimum
5. **Multi-select**: Hold Shift/Cmd for batch operations
6. **Drag & Drop**: Reorder exercises, sets
7. **Right-click Menus**: Context menus for quick actions

### Responsive Typography

Headings scale up on larger screens:

```jsx
<h1 className="
  text-[22px] font-semibold
  md:text-2xl
  lg:text-[28px]
  font-display
">
  Push Day
</h1>
```

### Responsive Spacing

Use Tailwind's responsive modifiers:

```jsx
<div className="
  p-4
  md:p-5
  lg:p-6
  gap-3
  md:gap-4
  lg:gap-5
">
  {/* Content */}
</div>
```

### Desktop Modal/Dialog

Instead of full-screen mobile views, use centered modals:

```jsx
<div className="
  fixed inset-0
  bg-black/50
  flex items-center justify-center
  p-4
  z-50
">
  <div className="
    bg-surface
    rounded-2xl
    shadow-xl
    w-full max-w-md
    p-6
    max-h-[90vh]
    overflow-y-auto
  ">
    {/* Modal content */}
  </div>
</div>
```

---

## Implementation Notes

### Tailwind Configuration

Add custom values to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-light': 'var(--text-light)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        secondary: 'var(--secondary)',
        'secondary-light': 'var(--secondary-light)',
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        success: 'var(--success)',
        'success-bg': 'var(--success-bg)',
        'success-border': 'var(--success-border)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      fontFamily: {
        display: ['Libre Baskerville', 'Georgia', 'serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Add custom spacing if needed beyond Tailwind defaults
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
    },
  },
};
```

### CSS Variables Setup

In your global CSS file:

```css
:root {
  /* Light theme colors */
  --bg: #f5f2ed;
  --bg-alt: #ebe7e0;
  --surface: #ffffff;
  --surface-hover: #fafaf8;
  --text: #2d2a26;
  --text-muted: #6b6560;
  --text-light: #9a948c;
  --accent: #6b7c3f;
  --accent-hover: #5a6935;
  --accent-light: #e8ebdf;
  --secondary: #8b7355;
  --secondary-light: #c4b5a5;
  --border: #d9d4cc;
  --border-light: #e8e4dc;
  --success: #5a7c40;
  --success-bg: #f0f4eb;
  --success-border: #d4e0c8;
  --warning: #b8860b;
  --error: #a65d57;
}

[data-theme="dark"] {
  /* Dark warm theme colors */
  --bg: #1a1816;
  --bg-alt: #121110;
  --surface: #252220;
  --surface-hover: #2e2a27;
  --text: #e8e4df;
  --text-muted: #a09a92;
  --text-light: #6b665f;
  --accent: #8fa558;
  --accent-hover: #a3b86c;
  --accent-light: #2a2e22;
  --secondary: #c4a77d;
  --secondary-light: #3d352a;
  --border: #3a3632;
  --border-light: #2e2a27;
  --success: #7a9c5a;
  --success-bg: #1e2219;
  --success-border: #3a4a2e;
  --warning: #d4a84b;
  --error: #c47a74;
}

/* Smooth theme transitions */
* {
  transition-property: background-color, border-color, color;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
}
```

### Accessibility Checklist

- [ ] All interactive elements have minimum 44x44px touch targets (mobile)
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)
- [ ] Focus states are clearly visible (accent-colored ring)
- [ ] Keyboard navigation works for all interactions
- [ ] Screen reader labels for icon-only buttons
- [ ] Reduced motion respected via `prefers-reduced-motion`
- [ ] Forms have proper labels and error messages
- [ ] Loading states communicated to screen readers

---

## Quick Reference

### Mobile Screen Safe Areas
- Top: 52px
- Bottom (with nav): 90px
- Bottom (no nav): 16px
- Horizontal: 16px padding

### Most Common Colors
- Primary action: `accent` (#6b7c3f light / #8fa558 dark)
- Text: `text` (#2d2a26 light / #e8e4df dark)
- Muted text: `text-muted` (#6b6560 light / #a09a92 dark)
- Card background: `surface` (#ffffff light / #252220 dark)
- Border: `border-light` (#e8e4dc light / #2e2a27 dark)

### Most Common Spacing
- Card padding: 14-16px (mobile), 20-24px (desktop)
- Gap between cards: 12-16px (mobile), 20-24px (desktop)
- Section spacing: 16-20px

### Most Common Border Radius
- Cards: 14-16px (`rounded-2xl`)
- Buttons: 10-12px (`rounded-xl`)
- Inputs: 8-10px (`rounded-lg`)
- Small elements: 6-8px (`rounded-lg`)

### Most Common Transitions
- Standard: `200ms ease-out` (colors, opacity)
- Hover: `300ms ease-out` (shadows, borders)
- Press: `150ms ease-out` (scale transforms)

---

## Version History

- **v1.0** (2026-01-22): Initial comprehensive style guide based on UI preview v4
