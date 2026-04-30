# Graph Report - /Users/juandiego/Projects/Mentex app  (2026-04-30)

## Corpus Check
- 12 files · ~50,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 502 nodes · 566 edges · 43 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Toast & content actions|Toast & content actions]]
- [[_COMMUNITY_Community mock data + follows store|Community mock data + follows store]]
- [[_COMMUNITY_Audit Comunidad findings|Audit Comunidad findings]]
- [[_COMMUNITY_Community feed UI|Community feed UI]]
- [[_COMMUNITY_Explore hero + categories|Explore: hero + categories]]
- [[_COMMUNITY_Home inactive screen|Home inactive screen]]
- [[_COMMUNITY_Ranking filter sheet|Ranking filter sheet]]
- [[_COMMUNITY_Content types + activity icons|Content types + activity icons]]
- [[_COMMUNITY_Achievement + Follower sheets|Achievement + Follower sheets]]
- [[_COMMUNITY_BookmarkReview sheets|Bookmark/Review sheets]]
- [[_COMMUNITY_Apps editor|Apps editor]]
- [[_COMMUNITY_Challenges screen|Challenges screen]]
- [[_COMMUNITY_Notifications sheet|Notifications sheet]]
- [[_COMMUNITY_Phase 1 audit lessons|Phase 1 audit lessons]]
- [[_COMMUNITY_User profile flow|User profile flow]]
- [[_COMMUNITY_iOS frame debug assets|iOS frame debug assets]]
- [[_COMMUNITY_Playlist sheets|Playlist sheets]]
- [[_COMMUNITY_Explore taxonomy + filters|Explore taxonomy + filters]]
- [[_COMMUNITY_Explore content row|Explore content row]]
- [[_COMMUNITY_Audit phase 2 layout fixes|Audit phase 2 layout fixes]]
- [[_COMMUNITY_Top 10 cards|Top 10 cards]]
- [[_COMMUNITY_Playlists row|Playlists row]]
- [[_COMMUNITY_Add content screen|Add content screen]]
- [[_COMMUNITY_Pattern portal overlays|Pattern: portal overlays]]
- [[_COMMUNITY_Pattern navigation state machine|Pattern: navigation state machine]]
- [[_COMMUNITY_Pattern taxonomies hardcoded|Pattern: taxonomies hardcoded]]
- [[_COMMUNITY_Pattern mobile-first rewrite|Pattern: mobile-first rewrite]]
- [[_COMMUNITY_Audit sheet viewport clipping|Audit: sheet viewport clipping]]
- [[_COMMUNITY_Audit progress tickers|Audit: progress tickers]]
- [[_COMMUNITY_Audit setTimeout cleanup|Audit: setTimeout cleanup]]
- [[_COMMUNITY_Audit stale closure|Audit: stale closure]]
- [[_COMMUNITY_Audit smoke test fragility|Audit: smoke test fragility]]
- [[_COMMUNITY_Audit image 404s|Audit: image 404s]]
- [[_COMMUNITY_Categories map|Categories map]]
- [[_COMMUNITY_Explore playlists mock|Explore playlists mock]]
- [[_COMMUNITY_ComingSoonSheet|ComingSoonSheet]]
- [[_COMMUNITY_PlaylistAccessCard|PlaylistAccessCard]]
- [[_COMMUNITY_AddContentToPlaylistSheet|AddContentToPlaylistSheet]]
- [[_COMMUNITY_EditPlaylistSheet|EditPlaylistSheet]]
- [[_COMMUNITY_DividerBanner|DividerBanner]]
- [[_COMMUNITY_IcSkipBack|IcSkipBack]]
- [[_COMMUNITY_IcSkipForward|IcSkipForward]]
- [[_COMMUNITY_Social brand icons|Social brand icons]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 24 edges
2. `Mentex Home.html (entry HTML)` - 22 edges
3. `ProfileScreen` - 10 edges
4. `UserProfileScreen (overlay perfil ajeno)` - 8 edges
5. `Icon base wrapper` - 8 edges
6. `FollowersSheet` - 7 edges
7. `RankingScreen` - 7 edges
8. `window.__mtxFollows (follow/unfollow store)` - 7 edges
9. `ExploreScreen` - 7 edges
10. `screens/thread-flow.jsx` - 7 edges

## Surprising Connections (you probably didn't know these)
- `window.__mtxRitual store` --semantically_similar_to--> `Pattern: mtx:follows-changed pubsub`  [INFERRED] [semantically similar]
  screens/explore-flow.jsx → docs/audits/phase-profile-lessons.md
- `mtx:open-user-profile event` --shares_data_with--> `screens/thread-flow.jsx`  [INFERRED]
  Mentex Home.html → screens/thread-flow.jsx
- `FollowerRow()` --calls--> `useToast()`  [INFERRED]
  screens/profile-stats-sheets.jsx → components/mtx-toast.jsx
- `RoutinesEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/routines-editor.jsx → components/mtx-toast.jsx
- `AppsEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/apps-editor.jsx → components/mtx-toast.jsx

## Hyperedges (group relationships)
- **Window-singleton store + CustomEvent + React hook reactivity pattern** —  [INFERRED 0.92]
- **Cross-screen author identity sharing (mariana/andres/lucia/tomas/isabella/rodrigo) seeded across community feed, ranking leaderboard, thread comments, and other-user profile** —  [INFERRED 0.90]
- **Bottom-sheet drag-to-dismiss + ESC + backdrop-blur shell reused across LevelSheet/HoursSheet/FollowersSheet/AchievementSheet/EditProfileSheet/RankingFilterSheet** —  [INFERRED 0.88]
- **Explore sheet family (modal sheets opened from VideoSheet/Player)** —  [INFERRED 0.85]
- **Mentex Home.html script load order (deps)** —  [EXTRACTED 1.00]
- **Ritual shared state pattern (Explore writes, Home reads)** —  [EXTRACTED 1.00]

## Communities

### Community 1 - "Toast & content actions"
Cohesion: 0.05
Nodes (26): useToast(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints(), ComingSoonSheet(), CreatePlaylistSheet() (+18 more)

### Community 2 - "Community mock data + follows store"
Cohesion: 0.06
Nodes (57): CommunityAvatar, mtx:follows-changed event, _MOCK_COMMUNITY_AUTHORS, _MOCK_COMMUNITY_REVIEWS (cr-1..cr-7), window.__mtxFollows (follow/unfollow store), CommunityRating (5-star row), CommunityReviewCard, CommunityScreen (+49 more)

### Community 3 - "Audit Comunidad findings"
Cohesion: 0.05
Nodes (50): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-C1 Dead code displayCommentCount/likesAdjust, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered (+42 more)

### Community 4 - "Community feed UI"
Cohesion: 0.08
Nodes (11): CommunityReviewCard(), CommunityScreen(), _buildAreaPaths(), ProfileReviewCard(), ProfileScreen(), ProfileStatsTab(), useProfile(), useUserReviews() (+3 more)

### Community 6 - "Explore: hero + categories"
Cohesion: 0.11
Nodes (19): CategorySection, ContentTypeFilters, CreatePlaylistSheet, EXPLORE_CATEGORIES, ExploreHero carousel, ExploreHeroCard, ExploreScreen, HistoryRow (+11 more)

### Community 8 - "Home inactive screen"
Cohesion: 0.24
Nodes (7): RoutineIc(), getColorById(), getIconById(), menuItemStyle(), RoutineCreateSheet(), RoutineRow(), RoutinesEditorSheet()

### Community 9 - "Ranking filter sheet"
Cohesion: 0.18
Nodes (12): _RANK_CATEGORIES (general/audiobook/meditation/series/talk/sound), _RankFilterSection, RankingFilterSheet, MovementIndicator, PodiumColumn, PodiumPedestal, PodiumStand, RankAvatar (+4 more)

### Community 10 - "Content types + activity icons"
Cohesion: 0.32
Nodes (12): CONTENT_TYPES constant, _extraToActivity helper, NowPlayingScreen, IcBook, IcCompass, IcLeaf, IcMic, Icon base wrapper (+4 more)

### Community 11 - "Achievement + Follower sheets"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 13 - "Bookmark/Review sheets"
Cohesion: 0.2
Nodes (10): BookmarkNameSheet, BookmarksSheet, PlayerWaveform, ReviewSheet, ReviewSuccessSheet, SkipDurationSheet, SleepTimerSheet, VideoCompletionSheet (+2 more)

### Community 14 - "Apps editor"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 16 - "Challenges screen"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 17 - "Notifications sheet"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 18 - "Phase 1 audit lessons"
Cohesion: 0.29
Nodes (7): CRIT-1 setTab community dead screen, Phase 1 — Audit Lessons, IMP-1 setTimeout cleanup leak, IMP-2 breakCount reset to 0, IMP-3 keydown stale closure + input guard, IMP-4 div onClick keyboard a11y, IMP-5 ACHIEVEMENTS unused window export

### Community 21 - "User profile flow"
Cohesion: 0.5
Nodes (2): useFollow(), UserProfileScreen()

### Community 22 - "iOS frame debug assets"
Cohesion: 0.4
Nodes (5): Dark / Empty Screen State (debug), debug-challenges.png – iOS Frame Debug Screenshot, Dynamic Island / Notch UI Element, iOS Device Frame UI Pattern, iOS Status Bar (9:41, signal, wifi, battery)

### Community 23 - "Playlist sheets"
Cohesion: 0.4
Nodes (5): PlaylistItemRow, PlaylistOptionsSheet, PlaylistOverviewScreen, PlaylistQueueSheet, SwipeableQueueRow

### Community 26 - "Explore taxonomy + filters"
Cohesion: 0.5
Nodes (4): ALL_CATEGORIES taxonomy, CategoryFullView, FilterPanel, SortFilters

### Community 27 - "Explore content row"
Cohesion: 0.67
Nodes (3): ContentRow, EXPLORE_CONTENT mock data, ExploreContentCard

### Community 29 - "Audit phase 2 layout fixes"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 30 - "Top 10 cards"
Cohesion: 1.0
Nodes (2): TopTenCard, TopTenRow

### Community 31 - "Playlists row"
Cohesion: 1.0
Nodes (2): PlaylistCard, PlaylistsRow

### Community 32 - "Add content screen"
Cohesion: 1.0
Nodes (2): AddContentScreen, SelectableContentCard

### Community 33 - "Pattern: portal overlays"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 34 - "Pattern: navigation state machine"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 35 - "Pattern: taxonomies hardcoded"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 36 - "Pattern: mobile-first rewrite"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 37 - "Audit: sheet viewport clipping"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 38 - "Audit: progress tickers"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 39 - "Audit: setTimeout cleanup"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 40 - "Audit: stale closure"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 41 - "Audit: smoke test fragility"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 42 - "Audit: image 404s"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 43 - "Categories map"
Cohesion: 1.0
Nodes (1): CATEGORIES_BY_TYPE map

### Community 44 - "Explore playlists mock"
Cohesion: 1.0
Nodes (1): EXPLORE_PLAYLISTS mock

### Community 45 - "ComingSoonSheet"
Cohesion: 1.0
Nodes (1): ComingSoonSheet

### Community 46 - "PlaylistAccessCard"
Cohesion: 1.0
Nodes (1): PlaylistAccessCard

### Community 47 - "AddContentToPlaylistSheet"
Cohesion: 1.0
Nodes (1): AddContentToPlaylistSheet

### Community 48 - "EditPlaylistSheet"
Cohesion: 1.0
Nodes (1): EditPlaylistSheet

### Community 49 - "DividerBanner"
Cohesion: 1.0
Nodes (1): DividerBanner

### Community 50 - "IcSkipBack"
Cohesion: 1.0
Nodes (1): IcSkipBack

### Community 51 - "IcSkipForward"
Cohesion: 1.0
Nodes (1): IcSkipForward

### Community 52 - "Social brand icons"
Cohesion: 1.0
Nodes (1): Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)

## Knowledge Gaps
- **108 isolated node(s):** `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)`, `Dark / Empty Screen State (debug)`, `CRIT-1 setTab community dead screen` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Apps editor`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User profile flow`** (5 nodes): `user-profile-flow.jsx`, `resolveUserProfile()`, `useFollow()`, `UserProfileScreen()`, `UserStatsTab()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit phase 2 layout fixes`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Top 10 cards`** (2 nodes): `TopTenCard`, `TopTenRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Playlists row`** (2 nodes): `PlaylistCard`, `PlaylistsRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add content screen`** (2 nodes): `AddContentScreen`, `SelectableContentCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pattern: portal overlays`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pattern: navigation state machine`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pattern: taxonomies hardcoded`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pattern: mobile-first rewrite`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: sheet viewport clipping`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: progress tickers`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: setTimeout cleanup`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: stale closure`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: smoke test fragility`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit: image 404s`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Categories map`** (1 nodes): `CATEGORIES_BY_TYPE map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Explore playlists mock`** (1 nodes): `EXPLORE_PLAYLISTS mock`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ComingSoonSheet`** (1 nodes): `ComingSoonSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PlaylistAccessCard`** (1 nodes): `PlaylistAccessCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AddContentToPlaylistSheet`** (1 nodes): `AddContentToPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EditPlaylistSheet`** (1 nodes): `EditPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DividerBanner`** (1 nodes): `DividerBanner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IcSkipBack`** (1 nodes): `IcSkipBack`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IcSkipForward`** (1 nodes): `IcSkipForward`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Social brand icons`** (1 nodes): `Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Toast & content actions` to `Community feed UI`, `Home inactive screen`, `Achievement + Follower sheets`, `Apps editor`, `Notifications sheet`, `User profile flow`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `ProfileScreen()` connect `Community feed UI` to `Toast & content actions`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `ProfileScreen()`) actually correct?**
  _`useToast()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ProfileScreen` (e.g. with `ProfileReviewCard` and `LevelSheet`) actually correct?**
  _`ProfileScreen` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sistema de iconos SVG` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Toast & content actions` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._