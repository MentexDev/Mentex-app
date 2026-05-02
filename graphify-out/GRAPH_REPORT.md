# Graph Report - .  (2026-05-01)

## Corpus Check
- Large corpus: 59 files · ~1,010,063 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 676 nodes · 826 edges · 50 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Active Queue + Toast|Active Queue + Toast]]
- [[_COMMUNITY_Icon Library|Icon Library]]
- [[_COMMUNITY_Community Reviews|Community Reviews]]
- [[_COMMUNITY_Audit Findings|Audit Findings]]
- [[_COMMUNITY_App Brand Icons|App Brand Icons]]
- [[_COMMUNITY_Home + Banner|Home + Banner]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
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
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]

## God Nodes (most connected - your core abstractions)
1. `MentexApp` - 51 edges
2. `useToast()` - 27 edges
3. `Mentex Home.html (entry HTML)` - 22 edges
4. `Phase Home — GPU + UX audit` - 12 edges
5. `ProfileScreen` - 10 edges
6. `AutoRoutineCreateSheet` - 9 edges
7. `Phase Runner — Lessons (audit C-A-R)` - 9 edges
8. `UserProfileScreen (overlay perfil ajeno)` - 8 edges
9. `Icon base wrapper` - 8 edges
10. `FollowersSheet` - 7 edges

## Surprising Connections (you probably didn't know these)
- `window.__mtxRitual store` --semantically_similar_to--> `Pattern: mtx:follows-changed pubsub`  [INFERRED] [semantically similar]
  screens/explore-flow.jsx → docs/audits/phase-profile-lessons.md
- `ACTIVITIES seed data` --shares_data_with--> `MentexApp`  [EXTRACTED]
  screens/home-active.jsx → Mentex Home.html
- `mtx:open-user-profile event` --shares_data_with--> `screens/thread-flow.jsx`  [INFERRED]
  Mentex Home.html → screens/thread-flow.jsx
- `FollowerRow()` --calls--> `useToast()`  [INFERRED]
  screens/profile-stats-sheets.jsx → components/mtx-toast.jsx
- `HomeInactive()` --calls--> `useToast()`  [INFERRED]
  screens/home-inactive.jsx → components/mtx-toast.jsx

## Hyperedges (group relationships)
- **Bottom-sheet drag-to-dismiss + ESC + backdrop-blur shell reused across LevelSheet/HoursSheet/FollowersSheet/AchievementSheet/EditProfileSheet/RankingFilterSheet** —  [INFERRED 0.88]
- **Chronological feed pattern: _timeAgoToMs + _formatRelative + .sort by _sortTs in CommunityScreen.feed useMemo** — community_flow__timeagotoms, community_flow__formatrelative, community_flow_feed_usememo, community_flow_chronological_feed_pattern [INFERRED 0.92]
- **Phase 1 audit keyboard a11y enforcement (role/tabIndex/onKeyDown)** — phase_1_lessons_imp_4, notifications_sheet_notifcard, home_active_activityrow [EXTRACTED 0.90]
- **Portal consumers affected by mtx-overlay-root pointer-events regression** — mentex_home_mtxoverlayroot, phase_runner_lessons_globalplayerjsx, phase_runner_lessons_activityrunnerjsx, phase_runner_lessons_profilejsx, phase_runner_lessons_userprofileflowjsx, phase_runner_lessons_rankingflowjsx, phase_runner_lessons_exploreflowjsx [EXTRACTED 0.90]
- **Bottom-sheet modals (grabber+backdrop+slideup) requiring ESC handler** — mentex_home_customtimemodal, mentex_home_autoroutinecreatesheet, mentex_home_autoroutinecreatedsheet, mentex_home_appseditorsheet, mentex_home_routineseditorsheet [INFERRED 0.85]
- **GPU compositing fixes (filter:blur halos + infinite animations with willChange)** — phase_home_gpu_lessons_imp1, phase_home_gpu_lessons_imp2, phase_home_gpu_lessons_rule_willchange_blur [EXTRACTED 0.90]

## Communities

### Community 0 - "Active Queue + Toast"
Cohesion: 0.04
Nodes (32): useToast(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints() (+24 more)

### Community 2 - "Icon Library"
Cohesion: 0.04
Nodes (69): CommunityAvatar, mtx:follows-changed event, _MOCK_COMMUNITY_AUTHORS, _MOCK_COMMUNITY_REVIEWS (cr-1..cr-7), window.__mtxFollows (follow/unfollow store), CommunityRating (5-star row), CommunityReviewCard, CommunityScreen (+61 more)

### Community 3 - "Community Reviews"
Cohesion: 0.04
Nodes (67): ActiveQueueSwitcherOverlay, ActivityRunnerOverlay, AppsBreakPickerSheet, AppsEditorSheet, autoRoutineCreated (state slice), AutoRoutineCreatedSheet, AutoRoutineCreateSheet, autoRoutineCtx (state slice) (+59 more)

### Community 4 - "Audit Findings"
Cohesion: 0.05
Nodes (49): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-C1 Dead code displayCommentCount/likesAdjust, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered (+41 more)

### Community 5 - "App Brand Icons"
Cohesion: 0.11
Nodes (24): AchievementBadge(), AchievementBadgeV2(), AchievementCard(), AchievementCardFull(), AwardsTab(), _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths() (+16 more)

### Community 7 - "Home + Banner"
Cohesion: 0.14
Nodes (11): HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById(), _getMetricType(), menuItemStyle() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (19): CategorySection, ContentTypeFilters, CreatePlaylistSheet, EXPLORE_CATEGORIES, ExploreHero carousel, ExploreHeroCard, ExploreScreen, HistoryRow (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (13): _buildAchievements() — own-profile achievements, _buildAchievementsForUser(profile) — seed-derived achievements, _deriveStatsFor(profile, isOwn) — dual-path stats deriver, window.AchievementSheet (portal sheet), AwardsTab (dual-mode: own/other), ProfileScreen (own profile entry), ProfileStatsTab (dual-mode: own/other), Seed-derived mock pattern (seed = userId.charCodeAt(0)) (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (13): IOSDevice, mtx-overlay-root (portal mount), Rule: cada modal con open prop requiere ESC handler con guard isTypingInEditable, Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.32
Nodes (12): CONTENT_TYPES constant, _extraToActivity helper, NowPlayingScreen, IcBook, IcCompass, IcLeaf, IcMic, Icon base wrapper (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (10): BookmarkNameSheet, BookmarksSheet, PlayerWaveform, ReviewSheet, ReviewSuccessSheet, SkipDurationSheet, SleepTimerSheet, VideoCompletionSheet (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 20 - "Community 20"
Cohesion: 0.43
Nodes (6): CommunityAvatar(), CommunityRating(), CommunityReviewCard(), CommunityScreen(), _formatRelative(), _timeAgoToMs()

### Community 21 - "Community 21"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 25 - "Community 25"
Cohesion: 0.47
Nodes (4): compute(), recompute(), resolveItems(), _resolvePlaylistItems()

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (5): Dark / Empty Screen State (debug), debug-challenges.png – iOS Frame Debug Screenshot, Dynamic Island / Notch UI Element, iOS Device Frame UI Pattern, iOS Status Bar (9:41, signal, wifi, battery)

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (5): PlaylistItemRow, PlaylistOptionsSheet, PlaylistOverviewScreen, PlaylistQueueSheet, SwipeableQueueRow

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (4): ALL_CATEGORIES taxonomy, CategoryFullView, FilterPanel, SortFilters

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (2): MtxNowPlayingBar(), useNowPlaying()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (3): ContentRow, EXPLORE_CONTENT mock data, ExploreContentCard

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): TopTenCard, TopTenRow

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (2): PlaylistCard, PlaylistsRow

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): AddContentScreen, SelectableContentCard

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): CATEGORIES_BY_TYPE map

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): EXPLORE_PLAYLISTS mock

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): ComingSoonSheet

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): PlaylistAccessCard

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): AddContentToPlaylistSheet

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): EditPlaylistSheet

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): DividerBanner

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): IcSkipBack

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): IcSkipForward

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)

## Knowledge Gaps
- **150 isolated node(s):** `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)`, `Dark / Empty Screen State (debug)`, `IMP-1 setTimeout cleanup leak` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 18`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `TopTenCard`, `TopTenRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `PlaylistCard`, `PlaylistsRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `AddContentScreen`, `SelectableContentCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `CATEGORIES_BY_TYPE map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `EXPLORE_PLAYLISTS mock`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `ComingSoonSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `PlaylistAccessCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `AddContentToPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `EditPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `DividerBanner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `IcSkipBack`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `IcSkipForward`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MentexApp` connect `Community Reviews` to `Community 8`, `Audit Findings`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Active Queue + Toast` to `App Brand Icons`, `Home + Banner`, `Community 15`, `Community 18`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `ProfileScreen()`) actually correct?**
  _`useToast()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ProfileScreen` (e.g. with `ProfileReviewCard` and `LevelSheet`) actually correct?**
  _`ProfileScreen` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Active Queue + Toast` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Explore + Ritual` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._