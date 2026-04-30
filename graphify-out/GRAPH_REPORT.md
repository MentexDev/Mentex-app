# Graph Report - /Users/juandiego/Projects/Mentex app  (2026-04-30)

## Corpus Check
- 4 files · ~30,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 528 nodes · 620 edges · 45 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]

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
- **Dual-mode props parity: ProfileStatsTab + AwardsTab + AchievementSheet reused across own and other profile via {profile, isOwn}** — profile_profilestatstab, profile_awardstab, profile_achievementsheet, profile_profilescreen, user_profile_flow_userprofilescreen [INFERRED 0.90]
- **Mock data derivation pattern: seed = userId.charCodeAt(0) drives _deriveStatsFor + _buildAchievementsForUser** — profile__derivestatsfor, profile__buildachievementsforuser, profile_seed_derivation_pattern [INFERRED 0.90]
- **Chronological feed pattern: _timeAgoToMs + _formatRelative + .sort by _sortTs in CommunityScreen.feed useMemo** — community_flow__timeagotoms, community_flow__formatrelative, community_flow_feed_usememo, community_flow_chronological_feed_pattern [INFERRED 0.92]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (69): CommunityAvatar, mtx:follows-changed event, _MOCK_COMMUNITY_AUTHORS, _MOCK_COMMUNITY_REVIEWS (cr-1..cr-7), window.__mtxFollows (follow/unfollow store), CommunityRating (5-star row), CommunityReviewCard, CommunityScreen (+61 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (26): useToast(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints(), ComingSoonSheet(), CreatePlaylistSheet() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (50): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-C1 Dead code displayCommentCount/likesAdjust, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered (+42 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (16): AchievementBadge(), AchievementBadgeV2(), AchievementCard(), AchievementCardFull(), AwardsTab(), _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (19): CategorySection, ContentTypeFilters, CreatePlaylistSheet, EXPLORE_CATEGORIES, ExploreHero carousel, ExploreHeroCard, ExploreScreen, HistoryRow (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (8): CommunityAvatar(), CommunityRating(), CommunityReviewCard(), CommunityScreen(), ProfileReviewCard(), _formatRelative(), ThreadCommentRow(), useCommentCount()

### Community 9 - "Community 9"
Cohesion: 0.24
Nodes (13): _buildAchievements() — own-profile achievements, _buildAchievementsForUser(profile) — seed-derived achievements, _deriveStatsFor(profile, isOwn) — dual-path stats deriver, window.AchievementSheet (portal sheet), AwardsTab (dual-mode: own/other), ProfileScreen (own profile entry), ProfileStatsTab (dual-mode: own/other), Seed-derived mock pattern (seed = userId.charCodeAt(0)) (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (7): RoutineIc(), getColorById(), getIconById(), menuItemStyle(), RoutineCreateSheet(), RoutineRow(), RoutinesEditorSheet()

### Community 11 - "Community 11"
Cohesion: 0.32
Nodes (12): CONTENT_TYPES constant, _extraToActivity helper, NowPlayingScreen, IcBook, IcCompass, IcLeaf, IcMic, Icon base wrapper (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (10): BookmarkNameSheet, BookmarksSheet, PlayerWaveform, ReviewSheet, ReviewSuccessSheet, SkipDurationSheet, SleepTimerSheet, VideoCompletionSheet (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 17 - "Community 17"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (7): CRIT-1 setTab community dead screen, Phase 1 — Audit Lessons, IMP-1 setTimeout cleanup leak, IMP-2 breakCount reset to 0, IMP-3 keydown stale closure + input guard, IMP-4 div onClick keyboard a11y, IMP-5 ACHIEVEMENTS unused window export

### Community 22 - "Community 22"
Cohesion: 0.53
Nodes (3): resolveUserProfile(), useFollow(), UserProfileScreen()

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (5): Dark / Empty Screen State (debug), debug-challenges.png – iOS Frame Debug Screenshot, Dynamic Island / Notch UI Element, iOS Device Frame UI Pattern, iOS Status Bar (9:41, signal, wifi, battery)

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (5): PlaylistItemRow, PlaylistOptionsSheet, PlaylistOverviewScreen, PlaylistQueueSheet, SwipeableQueueRow

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (4): ALL_CATEGORIES taxonomy, CategoryFullView, FilterPanel, SortFilters

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): ContentRow, EXPLORE_CONTENT mock data, ExploreContentCard

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): TopTenCard, TopTenRow

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): PlaylistCard, PlaylistsRow

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): AddContentScreen, SelectableContentCard

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): CATEGORIES_BY_TYPE map

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): EXPLORE_PLAYLISTS mock

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): ComingSoonSheet

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): PlaylistAccessCard

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): AddContentToPlaylistSheet

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): EditPlaylistSheet

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): DividerBanner

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): IcSkipBack

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): IcSkipForward

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)

## Knowledge Gaps
- **115 isolated node(s):** `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)`, `Dark / Empty Screen State (debug)`, `CRIT-1 setTab community dead screen` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `TopTenCard`, `TopTenRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `PlaylistCard`, `PlaylistsRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `AddContentScreen`, `SelectableContentCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `CATEGORIES_BY_TYPE map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `EXPLORE_PLAYLISTS mock`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `ComingSoonSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `PlaylistAccessCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `AddContentToPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `EditPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `DividerBanner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `IcSkipBack`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `IcSkipForward`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 2` to `Community 5`, `Community 7`, `Community 10`, `Community 12`, `Community 15`, `Community 18`, `Community 22`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `ProfileScreen()` connect `Community 5` to `Community 2`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `ProfileScreen()`) actually correct?**
  _`useToast()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ProfileScreen` (e.g. with `ProfileReviewCard` and `LevelSheet`) actually correct?**
  _`ProfileScreen` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._