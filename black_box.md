# CloudTrucks Scout - Flight Recorder

## 2026-01-19: Multi-State Selector Issues

**Failure Signature #1:** "Could not find the 'destination_states' column of 'search_criteria' in the schema cache"

**Root Cause:** Added `origin_states` and `destination_states` fields to API code but never created the database columns.

**Fix:**
1. Created migration: `supabase/migrations/20260120044941_add_multi_state_columns.sql`
2. Applied via Supabase MCP: `ALTER TABLE search_criteria ADD COLUMN IF NOT EXISTS origin_states TEXT[], ADD COLUMN IF NOT EXISTS destination_states TEXT[];`
3. Added GIN indexes for array query performance

**Prevention:** Always create database migrations BEFORE adding new fields to API code.

---

**Failure Signature #2:** City autocomplete no longer fills in the state field

**Root Cause:** Replaced single-state `<Select>` with `<MultiStateSelect>` component but didn't wire up the `onStateChange` callback from `CityAutocomplete`.

**Fix:**
1. Created `OriginFieldGroup` and `DestinationFieldGroup` wrapper components
2. Added local state management: `const [selectedStates, setSelectedStates] = useState<string[]>([])`
3. Connected `CityAutocomplete`'s `onStateChange` to update the state array
4. Made `MultiStateSelect` a controlled component with `value` prop

**Pattern:**
```tsx
function OriginFieldGroup() {
    const [selectedStates, setSelectedStates] = React.useState<string[]>([]);
    
    const handleCityStateChange = (state: string) => {
        if (state && !selectedStates.includes(state)) {
            setSelectedStates([state]);
        }
    };
    
    return (
        <CityAutocomplete onStateChange={handleCityStateChange} />
        <MultiStateSelect value={selectedStates} onChange={setSelectedStates} />
    );
}
```

**Prevention:** When refactoring components, always check for callback props that need to be preserved.

---

**Failure Signature #3:** X buttons on individual states not working

**Root Cause:** Badge component was capturing click events. The event handlers had `e.stopPropagation()` but the parent Badge was still blocking.

**Fix:** Replaced `<Badge>` with native `<button>` elements with proper event handling:
```tsx
<button
    type="button"
    onClick={(e) => removeState(state, e)}
    className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-red-600 hover:to-red-500"
>
    <span>{state}</span>
    <X className="h-3 w-3" />
</button>
```

**Prevention:** Use native HTML elements for interactive UI when possible. Avoid wrapping clickable elements in components that may interfere with event propagation.

---

## 2026-01-25: Schema Drift Issue

**Failure Signature #4:** "Could not find the 'min_rpm' column of 'search_criteria' in the schema cache"

**Root Cause:** `min_rpm` field was added to the UI and API Handler (`edit-criteria-dialog.tsx`) but the corresponding column was missing from the `search_criteria` database table.

**Fix:**
1. Applied migration: `ALTER TABLE search_criteria ADD COLUMN min_rpm NUMERIC;`
2. Updated Supabase Types: Synced `src/types/supabase.ts` with the new schema.

**Prevention:** Ensure database migrations are created and applied when adding new fields to the schema. Run type generation to catch mismatches during development.

---

## 2026-01-27: Tailwind CSS v4 Build Failure

**Failure Signature #5:** "Cannot apply unknown utility class `border-border`" during production build.

**Root Cause:** In Tailwind CSS v4, custom CSS variables defined in `@layer base` (like `--border`) are not automatically available as utility classes (like `border-border`) for use with `@apply` unless they are explicitly registered in a `@theme` block.

**Fix:**
Added a `@theme` block to `src/app/globals.css` that maps CSS variable-based design tokens to Tailwind-compatible utilities:
```css
@theme {
  --color-border: hsl(var(--border));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  /* ... other mappings ... */
}
```

**Prevention:** When using Tailwind CSS v4, always register custom design tokens in a `@theme` block in your global CSS to ensure they are available for both JIT usage and `@apply` directives.

