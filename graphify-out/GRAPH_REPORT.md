# Graph Report - /Users/juandiego/Projects/Mentex app  (2026-04-28)

## Corpus Check
- Large corpus: 37 files · ~892,034 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 174 nodes · 190 edges · 6 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.81)
- Token cost: 2,800 input · 1,950 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Toast + Apps Editor|Toast + Apps Editor]]
- [[_COMMUNITY_Estado Global (App Shell)|Estado Global (App Shell)]]
- [[_COMMUNITY_Home Inactivo + Rutinas|Home Inactivo + Rutinas]]
- [[_COMMUNITY_Sistema Visual (Tokens)|Sistema Visual (Tokens)]]
- [[_COMMUNITY_Desafíos|Desafíos]]
- [[_COMMUNITY_Debug + Frame Visual|Debug + Frame Visual]]

## God Nodes (most connected - your core abstractions)
1. `MentexApp React Component` - 20 edges
2. `Mentex Home HTML` - 5 edges
3. `HomeInactive Screen` - 5 edges
4. `getIconById()` - 4 edges
5. `RoutineRow()` - 4 edges
6. `useToast()` - 4 edges
7. `TweaksPanel Design Config Panel` - 4 edges
8. `Challenge Views Screen` - 4 edges
9. `TWEAK_DEFAULTS Design Config` - 4 edges
10. `Accent Color (#3dffcf neon)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Dark / Empty Screen State (debug)` --debug_state_of--> `Challenge Views Screen`  [INFERRED]
  /Users/juandiego/Projects/Mentex app/debug-challenges.png → /Users/juandiego/Projects/Mentex app/Mentex Home.html
- `Dark / Empty Screen State (debug)` --consistent_with--> `Dark Theme Design (#0a0d0a background)`  [INFERRED]
  /Users/juandiego/Projects/Mentex app/debug-challenges.png → /Users/juandiego/Projects/Mentex app/Mentex Home.html
- `RoutinesEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/routines-editor.jsx → components/mtx-toast.jsx
- `AppsEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/apps-editor.jsx → components/mtx-toast.jsx
- `NotificationsSheet()` --calls--> `useToast()`  [INFERRED]
  screens/notifications-sheet.jsx → components/mtx-toast.jsx

## Communities

### Community 2 - "Toast + Apps Editor"
Cohesion: 0.11
Nodes (6): useToast(), AppsEditorSheet(), getIc(), NotifCard(), NotificationsSheet(), RoutinesEditorSheet()

### Community 3 - "Estado Global (App Shell)"
Cohesion: 0.18
Nodes (18): Apps Editor Sheet, Blocked Apps State, Challenge Views Screen, Challenges State, Floating CTA Button (Iniciar enfoque), Custom Time Modal, Focus Session (Enfoque), HomeActive Screen (+10 more)

### Community 5 - "Home Inactivo + Rutinas"
Cohesion: 0.27
Nodes (6): RoutineIc(), getColorById(), getIconById(), menuItemStyle(), RoutineCreateSheet(), RoutineRow()

### Community 6 - "Sistema Visual (Tokens)"
Cohesion: 0.29
Nodes (10): Accent Color (#3dffcf neon), Babel Standalone 7.29.0, Dark Theme Design (#0a0d0a background), Font System (Geist/Inter/Manrope), Glass Card Style, Mentex Home HTML, mentex-tokens.css Design Tokens, React 18.3.1 (+2 more)

### Community 8 - "Desafíos"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 11 - "Debug + Frame Visual"
Cohesion: 0.33
Nodes (6): Dark / Empty Screen State (debug), debug-challenges.png – iOS Frame Debug Screenshot, Dynamic Island / Notch UI Element, IOSDevice Frame Component, iOS Device Frame UI Pattern, iOS Status Bar (9:41, signal, wifi, battery)

## Knowledge Gaps
- **10 isolated node(s):** `HomeActive Screen`, `Notifications Sheet`, `Custom Time Modal`, `Challenges State`, `Learning State` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MentexApp React Component` connect `Estado Global (App Shell)` to `Debug + Frame Visual`, `Sistema Visual (Tokens)`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `RoutinesEditorSheet()` connect `Toast + Apps Editor` to `Home Inactivo + Rutinas`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `HomeActive Screen`, `Notifications Sheet`, `Custom Time Modal` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Iconos UI (Mentex)` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Iconos Apps Bloqueables` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Toast + Apps Editor` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._