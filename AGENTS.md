# AI Agent Guidelines for Remix Icon Extension

> **Source of Truth**: This document is the authoritative reference for AI agents working on the Remix Icon Raycast extension. Symbolic links (CLAUDE.md, COPILOT.md, etc.) point to this file for tool-specific compatibility.

## 📋 Project Overview

**What**: A Raycast extension providing searchable access to the Remix Icon library
**Purpose**: Quick icon search, browse, and copy in multiple formats (SVG, React, Vue, Data URI, Webfont)  
**Stack**: TypeScript, React, Raycast API, @remixicon/react  
**Platform**: macOS only

## 🏗️ Architecture

### Core Components

1. **[src/search.tsx](src/search.tsx)** - Main command (Grid view, search, category filtering, recent icons cache)
2. **[src/CategorySection.tsx](src/CategorySection.tsx)** - Renders icon grid sections by category
3. **[src/IconActionPanel.tsx](src/IconActionPanel.tsx)** - Action panel with copy actions (SVG, React, Data URI, HTML, CDN, NPM)
4. **[src/utils.ts](src/utils.ts)** - Helper functions (SVG loading, name transformations, Data URI conversion)
5. **[src/types.ts](src/types.ts)** - TypeScript type definitions (Icon, IconCategory, Catalog)

### Data Structure

```
assets/
├── catalogue.json          # Generated icon catalog (DO NOT EDIT MANUALLY)
├── metadata.json          # Version tracking for CDN links
└── icons-compressed/      # Compressed SVGs by category (*.json)
    ├── Arrows.json
    ├── Buildings.json
    └── ... (19 categories)
```

### Type System

```typescript
Icon = { name: string, category: string }        // e.g., { name: "heart-fill", category: "System" }
IconCategory = { name: string, icons: Icon[] }   // e.g., { name: "System", icons: [...] }
Catalog = { categories: IconCategory[] }         // Full icon catalog
```

## 🎯 Key Workflows

### 1. Icon Search & Display
- User types → filters icons by name (case-insensitive)
- Dropdown → filters by category (All, Recent, or specific category)
- Recent icons tracked in Cache (max 8, LRU)
- Grid layout with icon previews

### 2. Icon Export Formats
- **SVG**: Raw SVG code from compressed JSON
- **React Component**: `<RiHeartFill size={24} color="currentColor" />`
- **Data URI**: Base64-encoded for inline CSS/HTML
- **Webfont HTML**: `<i class="ri-heart-fill"></i>`
- **CDN Link**: Versioned webfont CSS link
- **NPM Install**: `npm install @remixicon/react`
- **React Import**: `import { RiHeartFill } from "@remixicon/react";`

### 3. Icon Updates
Run `npm run update-icons` or `./scripts/update-icons.sh`:
- Fetches latest release from GitHub API
- Downloads `RemixIcon_Svg_*.zip` asset
- Compresses SVGs by category
- Regenerates `catalogue.json`
- Updates `metadata.json` with version

**⚠️ Critical**: After updating, sync `@remixicon/react` version in package.json and run `npm run validate`

## 🛠️ Development Commands

```bash
npm run dev          # Development mode (hot reload)
npm run build        # Production build
npm run lint         # ESLint check
npm run fix-lint     # Auto-fix linting issues
npm run update-icons # Fetch latest Remix Icon release
npm run validate     # Verify React component names
```

## 📝 Code Conventions

### Naming
- **React Components**: PascalCase (`CategorySection`, `IconActionPanel`)
- **Icon names**: kebab-case (`heart-fill`, `arrow-left-line`)
- **React icon component names**: PascalCase with `Ri` prefix (`RiHeartFill`)
- **Files**: camelCase for utilities, PascalCase for components

### TypeScript
- Use `readonly` for immutable data structures
- Prefer `type` over `interface` for simple types
- Use `React.FC` or explicit props typing with `Readonly<>`
- Strict mode enabled

### React Patterns
- Functional components only
- Hooks: `useState`, `useEffect`, `useMemo`, `useCallback`
- Memoize expensive computations (filtering, searching)
- Cache API for persistent storage (recent icons)

### State Management
- Local state with `useState`
- Memoization with `useMemo` for derived data
- Cache API for persistence (no external state management)

## 🚨 Critical Rules

### DO
✅ Use `catalogue.json` as the source of truth for available icons  
✅ Validate icon names exist before operations  
✅ Keep Recent icons cache ≤ 8 items  
✅ Compress SVGs when adding new icons  
✅ Update `metadata.json` when version changes  
✅ Test all export formats after icon updates  
✅ Run `npm run validate` after updating `@remixicon/react`  
✅ Use absolute imports for assets (`../assets/...`)  
✅ Handle errors gracefully with `showToast`  

### DON'T
❌ Manually edit `catalogue.json` (generated file)  
❌ Commit `.local/` directory (temporary files)  
❌ Hardcode icon lists (use dynamic loading)  
❌ Break the icon name → React component name mapping  
❌ Forget to update CDN version in metadata  
❌ Add SVGs without compressing them first  
❌ Use inline styles (prefer Raycast components)  
❌ Ignore TypeScript errors (strict mode)  

## 🧪 Testing Checklist

When making changes, verify:
- [ ] Search filters icons correctly (case-insensitive)
- [ ] Category dropdown works (All, Recent, specific categories)
- [ ] Recent icons persist across sessions
- [ ] All 7 export formats copy correctly
- [ ] SVG previews render in Grid
- [ ] React component names match `@remixicon/react` package
- [ ] No console errors
- [ ] Extension builds successfully (`npm run build`)
- [ ] Lint passes (`npm run lint`)

## 📂 File Edit Guidelines

### Modifying Icon Data
**Never** manually edit `catalogue.json`. To update icons:
1. Run `npm run update-icons`
2. Verify `assets/metadata.json` version
3. Update `@remixicon/react` in package.json to match
4. Run `npm run validate`

### Adding Features
1. **New export format**: Add action in [src/IconActionPanel.tsx](src/IconActionPanel.tsx)
2. **New utility**: Add to [src/utils.ts](src/utils.ts) with JSDoc comments
3. **New type**: Add to [src/types.ts](src/types.ts) with `readonly` modifiers
4. **UI changes**: Modify [src/search.tsx](src/search.tsx) or [src/CategorySection.tsx](src/CategorySection.tsx)

### Updating Scripts
- **Update script**: [scripts/update-icons.sh](scripts/update-icons.sh) (requires `jq`, `curl`, `unzip`)
- **Validation**: [scripts/validate-react-names.mjs](scripts/validate-react-names.mjs)
- **Utilities**: [scripts/utils.mjs](scripts/utils.mjs)

## 🔍 Common Tasks

### Adding a New Export Format
```typescript
// In IconActionPanel.tsx
<Action.CopyToClipboard
  title="Copy New Format"
  content={formatIcon(iconName)}
  shortcut={{ modifiers: ["cmd"], key: "n" }}
  onCopy={() => updateRecentIcons(category, iconName)}
/>
```

### Changing Icon Compression
```javascript
// In scripts/utils.mjs
export function compressSvg(svgContent) {
  // Modify compression logic
}
```

### Updating Search Algorithm
```typescript
// In src/search.tsx
function matchesSearch(iconName: string, search: string): boolean {
  // Modify search logic (fuzzy matching, etc.)
}
```

## 🐛 Debugging Tips

### Icons Not Showing
1. Check if `catalogue.json` exists
2. Verify category names match compressed JSON files
3. Check browser console for import errors
4. Ensure `assets/icons-compressed/*.json` files are valid JSON

### React Component Names Wrong
1. Run `npm run validate`
2. Check `@remixicon/react` version matches `metadata.json`
3. Verify name transformation in [src/utils.ts](src/utils.ts) `toReactComponentName()`

### Recent Icons Not Persisting
1. Check Cache API usage in [src/search.tsx](src/search.tsx)
2. Verify JSON serialization in `loadRecentIcons()` and `updateRecentIcons()`
3. Clear cache: Delete `~/Library/Caches/com.raycast.macos/`

## 📚 External Resources

- **Raycast API**: https://developers.raycast.com/api-reference
- **Remix Icon**: https://remixicon.com/
- **Remix Icon GitHub**: https://github.com/Remix-Design/RemixIcon
- **@remixicon/react**: https://www.npmjs.com/package/@remixicon/react

## 🔄 Version Synchronization

**Critical**: Keep these versions in sync:
1. `assets/metadata.json` → `version` (e.g., "4.8.0")
2. `package.json` → `@remixicon/react` (e.g., "~4.8.0")
3. CDN links in [src/IconActionPanel.tsx](src/IconActionPanel.tsx) use `metadata.version`

After updating:
```bash
npm run update-icons           # Updates metadata.json
npm install -D @remixicon/react@4.8.0  # Match version
npm run validate               # Verify component names
```

## 💡 Best Practices

1. **Performance**: Memoize filtered results, use `useMemo` for expensive operations
2. **UX**: Show loading states, handle errors gracefully with toasts
3. **Caching**: Use Raycast Cache API for persistence (recent icons)
4. **Type Safety**: Leverage TypeScript strict mode, avoid `any`
5. **Code Quality**: Run `npm run lint` before commits
6. **Documentation**: Update this file when adding major features
7. **Testing**: Test all export formats manually after changes

## 🎓 Learning Resources

New to Raycast extensions? Read:
1. [Raycast Extension Basics](https://developers.raycast.com/basics/getting-started)
2. [Grid API](https://developers.raycast.com/api-reference/user-interface/grid)
3. [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel)
4. [Cache API](https://developers.raycast.com/api-reference/cache)

---

**Last Updated**: 2026-02-03  
**Extension Version**: 1.0.0  
**Remix Icon Version**: 4.8.0  
