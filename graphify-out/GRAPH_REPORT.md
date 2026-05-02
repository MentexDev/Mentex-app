# Graph Report - .  (2026-05-01)

## Corpus Check
- Large corpus: 58 files · ~994,165 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 675 nodes · 825 edges · 50 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Active Queue + Toast|Active Queue + Toast]]
- [[_COMMUNITY_Explore + Ritual Items|Explore + Ritual Items]]
- [[_COMMUNITY_Community Reviews + Follows|Community Reviews + Follows]]
- [[_COMMUNITY_Audit Findings + Lessons|Audit Findings + Lessons]]
- [[_COMMUNITY_Profile + Achievements|Profile + Achievements]]
- [[_COMMUNITY_Home Inactive + Banner|Home Inactive + Banner]]
- [[_COMMUNITY_ExploreScreen|ExploreScreen]]
- [[_COMMUNITY_activity-runner.jsx|activity-runner.jsx]]
- [[_COMMUNITY__buildAchievementsForUser(profil|_buildAchievementsForUser(profil]]
- [[_COMMUNITY_home-active.jsx|home-active.jsx]]
- [[_COMMUNITY_Phase Runner — Lessons (audit C-|Phase Runner — Lessons (audit C-]]
- [[_COMMUNITY_Icon base wrapper|Icon base wrapper]]
- [[_COMMUNITY_profile-stats-sheets.jsx|profile-stats-sheets.jsx]]
- [[_COMMUNITY_VideoPlayerFullscreen|VideoPlayerFullscreen]]
- [[_COMMUNITY_apps-editor.jsx|apps-editor.jsx]]
- [[_COMMUNITY_challenge-views.jsx|challenge-views.jsx]]
- [[_COMMUNITY_community-flow.jsx|community-flow.jsx]]
- [[_COMMUNITY_UserProfileScreen()|UserProfileScreen()]]
- [[_COMMUNITY_active-queue.jsx|active-queue.jsx]]
- [[_COMMUNITY_feed useMemo — chronological mer|feed useMemo — chronological mer]]
- [[_COMMUNITY_ritual-player.jsx|ritual-player.jsx]]
- [[_COMMUNITY_debug-challenges.png – iOS Frame|debug-challenges.png – iOS Frame]]
- [[_COMMUNITY_PlaylistOverviewScreen|PlaylistOverviewScreen]]
- [[_COMMUNITY_CategoryFullView|CategoryFullView]]
- [[_COMMUNITY_now-playing-bar.jsx|now-playing-bar.jsx]]
- [[_COMMUNITY_ExploreContentCard|ExploreContentCard]]
- [[_COMMUNITY_CRIT-2 PlaylistQueueSheet collap|CRIT-2 PlaylistQueueSheet collap]]
- [[_COMMUNITY_TopTenCard|TopTenCard]]
- [[_COMMUNITY_PlaylistCard|PlaylistCard]]
- [[_COMMUNITY_AddContentScreen|AddContentScreen]]
- [[_COMMUNITY_Portal pattern for overlays on s|Portal pattern for overlays on s]]
- [[_COMMUNITY_Declarative navigation state mac|Declarative navigation state mac]]
- [[_COMMUNITY_Hardcoded taxonomies  inferred|Hardcoded taxonomies > inferred]]
- [[_COMMUNITY_Rewrite mobile-first instead of|Rewrite mobile-first instead of ]]
- [[_COMMUNITY_CRIT-1 Sheet clipped outside vie|CRIT-1 Sheet clipped outside vie]]
- [[_COMMUNITY_IMP-1 Simulated progress tickers|IMP-1 Simulated progress tickers]]
- [[_COMMUNITY_IMP-2 setTimeout post-tick needs|IMP-2 setTimeout post-tick needs]]
- [[_COMMUNITY_IMP-3 Stale closure of prop call|IMP-3 Stale closure of prop call]]
- [[_COMMUNITY_IMP-4 Chained smoke tests fragil|IMP-4 Chained smoke tests fragil]]
- [[_COMMUNITY_IMP-5 Silent Unsplash image 404s|IMP-5 Silent Unsplash image 404s]]
- [[_COMMUNITY_CATEGORIES_BY_TYPE map|CATEGORIES_BY_TYPE map]]
- [[_COMMUNITY_EXPLORE_PLAYLISTS mock|EXPLORE_PLAYLISTS mock]]
- [[_COMMUNITY_ComingSoonSheet|ComingSoonSheet]]
- [[_COMMUNITY_PlaylistAccessCard|PlaylistAccessCard]]
- [[_COMMUNITY_AddContentToPlaylistSheet|AddContentToPlaylistSheet]]
- [[_COMMUNITY_EditPlaylistSheet|EditPlaylistSheet]]
- [[_COMMUNITY_DividerBanner|DividerBanner]]
- [[_COMMUNITY_IcSkipBack|IcSkipBack]]
- [[_COMMUNITY_IcSkipForward|IcSkipForward]]
- [[_COMMUNITY_Social brand icons (IcTikTokIcY|Social brand icons (IcTikTok/IcY]]

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
- `explore-flow.jsx (module)` --calls--> `Mentex Home.html (entry HTML)`  [EXTRACTED]
  screens/explore-flow.jsx → Mentex Home.html
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
- **Bottom-sheet modals (grabber+backdrop+slideup) requiring ESC handler** — mentex_home_customtimemodal, mentex_home_autoroutinecreatesheet, mentex_home_autoroutinecreatedsheet, mentex_home_appseditorsheet, mentex_home_routineseditorsheet [INFERRED 0.85]
- **GPU compositing fixes (filter:blur halos + infinite animations with willChange)** — phase_home_gpu_lessons_imp1, phase_home_gpu_lessons_imp2, phase_home_gpu_lessons_rule_willchange_blur [EXTRACTED 0.90]
- **Session lifecycle screens (start/finish/interrupt/complete)** — mentex_home_homeinactive, mentex_home_homeactive, mentex_home_reflectiondelayscreen, mentex_home_sessioninterruptedscreen, mentex_home_completionscreen [INFERRED 0.85]
- **Global player overlay set (mounted once at MentexApp)** — mentex_home_globalplayeroverlay, mentex_home_videooptionsoverlay, mentex_home_activequeueswitcheroverlay, mentex_home_mtxnowplayingbar [EXTRACTED 0.90]
- **Auto-routine creation flow: time → create-sheet → created-sheet (with sub-editor handoffs)** — mentex_home_customtimemodal, mentex_home_autoroutinecreatesheet, mentex_home_autoroutinecreatedsheet, mentex_home_appseditorsheet, mentex_home_routineseditorsheet, mentex_home_edittimectx, mentex_home_autoroutinectx, mentex_home_autoroutinecreated [EXTRACTED 0.90]
- **Portal consumers affected by mtx-overlay-root pointer-events regression** — mentex_home_mtxoverlayroot, phase_runner_lessons_globalplayerjsx, phase_runner_lessons_activityrunnerjsx, phase_runner_lessons_profilejsx, phase_runner_lessons_userprofileflowjsx, phase_runner_lessons_rankingflowjsx, phase_runner_lessons_exploreflowjsx [EXTRACTED 0.90]

## Communities

### Community 0 - "Active Queue + Toast"
Cohesion: 0.04
Nodes (35): useToast(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints() (+27 more)

### Community 1 - "Explore + Ritual Items"
Cohesion: 0.04
Nodes (75): explore-flow.jsx (module), window.__mtxRitual store, useIsScheduled hook, useRitualItems hook, ACTIVITIES seed data, ActivityRow, HomeActive screen, Waveform component (+67 more)

### Community 3 - "Community Reviews + Follows"
Cohesion: 0.04
Nodes (69): CommunityAvatar, mtx:follows-changed event, _MOCK_COMMUNITY_AUTHORS, _MOCK_COMMUNITY_REVIEWS (cr-1..cr-7), window.__mtxFollows (follow/unfollow store), CommunityRating (5-star row), CommunityReviewCard, CommunityScreen (+61 more)

### Community 4 - "Audit Findings + Lessons"
Cohesion: 0.06
Nodes (41): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-C1 Dead code displayCommentCount/likesAdjust, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered (+33 more)

### Community 6 - "Profile + Achievements"
Cohesion: 0.14
Nodes (21): AchievementBadge(), AchievementBadgeV2(), AchievementCard(), AchievementCardFull(), AwardsTab(), _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths() (+13 more)

### Community 7 - "Home Inactive + Banner"
Cohesion: 0.14
Nodes (11): HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById(), _getMetricType(), menuItemStyle() (+3 more)

### Community 8 - "ExploreScreen"
Cohesion: 0.11
Nodes (19): CategorySection, ContentTypeFilters, CreatePlaylistSheet, EXPLORE_CATEGORIES, ExploreHero carousel, ExploreHeroCard, ExploreScreen, HistoryRow (+11 more)

### Community 9 - "activity-runner.jsx"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 11 - "_buildAchievementsForUser(profil"
Cohesion: 0.24
Nodes (13): _buildAchievements() — own-profile achievements, _buildAchievementsForUser(profile) — seed-derived achievements, _deriveStatsFor(profile, isOwn) — dual-path stats deriver, window.AchievementSheet (portal sheet), AwardsTab (dual-mode: own/other), ProfileScreen (own profile entry), ProfileStatsTab (dual-mode: own/other), Seed-derived mock pattern (seed = userId.charCodeAt(0)) (+5 more)

### Community 12 - "home-active.jsx"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 13 - "Phase Runner — Lessons (audit C-"
Cohesion: 0.19
Nodes (13): IOSDevice, mtx-overlay-root (portal mount), Rule: cada modal con open prop requiere ESC handler con guard isTypingInEditable, Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx (+5 more)

### Community 14 - "Icon base wrapper"
Cohesion: 0.32
Nodes (12): CONTENT_TYPES constant, _extraToActivity helper, NowPlayingScreen, IcBook, IcCompass, IcLeaf, IcMic, Icon base wrapper (+4 more)

### Community 15 - "profile-stats-sheets.jsx"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 17 - "VideoPlayerFullscreen"
Cohesion: 0.2
Nodes (10): BookmarkNameSheet, BookmarksSheet, PlayerWaveform, ReviewSheet, ReviewSuccessSheet, SkipDurationSheet, SleepTimerSheet, VideoCompletionSheet (+2 more)

### Community 18 - "apps-editor.jsx"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 20 - "challenge-views.jsx"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 21 - "community-flow.jsx"
Cohesion: 0.43
Nodes (6): CommunityAvatar(), CommunityRating(), CommunityReviewCard(), CommunityScreen(), _formatRelative(), _timeAgoToMs()

### Community 24 - "UserProfileScreen()"
Cohesion: 0.53
Nodes (3): resolveUserProfile(), useFollow(), UserProfileScreen()

### Community 25 - "active-queue.jsx"
Cohesion: 0.47
Nodes (4): compute(), recompute(), resolveItems(), _resolvePlaylistItems()

### Community 27 - "feed useMemo — chronological mer"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 28 - "ritual-player.jsx"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 30 - "debug-challenges.png – iOS Frame"
Cohesion: 0.4
Nodes (5): Dark / Empty Screen State (debug), debug-challenges.png – iOS Frame Debug Screenshot, Dynamic Island / Notch UI Element, iOS Device Frame UI Pattern, iOS Status Bar (9:41, signal, wifi, battery)

### Community 31 - "PlaylistOverviewScreen"
Cohesion: 0.4
Nodes (5): PlaylistItemRow, PlaylistOptionsSheet, PlaylistOverviewScreen, PlaylistQueueSheet, SwipeableQueueRow

### Community 33 - "CategoryFullView"
Cohesion: 0.5
Nodes (4): ALL_CATEGORIES taxonomy, CategoryFullView, FilterPanel, SortFilters

### Community 34 - "now-playing-bar.jsx"
Cohesion: 0.67
Nodes (2): MtxNowPlayingBar(), useNowPlaying()

### Community 35 - "ExploreContentCard"
Cohesion: 0.67
Nodes (3): ContentRow, EXPLORE_CONTENT mock data, ExploreContentCard

### Community 36 - "CRIT-2 PlaylistQueueSheet collap"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 37 - "TopTenCard"
Cohesion: 1.0
Nodes (2): TopTenCard, TopTenRow

### Community 38 - "PlaylistCard"
Cohesion: 1.0
Nodes (2): PlaylistCard, PlaylistsRow

### Community 39 - "AddContentScreen"
Cohesion: 1.0
Nodes (2): AddContentScreen, SelectableContentCard

### Community 40 - "Portal pattern for overlays on s"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 41 - "Declarative navigation state mac"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 42 - "Hardcoded taxonomies > inferred"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 43 - "Rewrite mobile-first instead of "
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 44 - "CRIT-1 Sheet clipped outside vie"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 45 - "IMP-1 Simulated progress tickers"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 46 - "IMP-2 setTimeout post-tick needs"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 47 - "IMP-3 Stale closure of prop call"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 48 - "IMP-4 Chained smoke tests fragil"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 49 - "IMP-5 Silent Unsplash image 404s"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 50 - "CATEGORIES_BY_TYPE map"
Cohesion: 1.0
Nodes (1): CATEGORIES_BY_TYPE map

### Community 51 - "EXPLORE_PLAYLISTS mock"
Cohesion: 1.0
Nodes (1): EXPLORE_PLAYLISTS mock

### Community 52 - "ComingSoonSheet"
Cohesion: 1.0
Nodes (1): ComingSoonSheet

### Community 53 - "PlaylistAccessCard"
Cohesion: 1.0
Nodes (1): PlaylistAccessCard

### Community 54 - "AddContentToPlaylistSheet"
Cohesion: 1.0
Nodes (1): AddContentToPlaylistSheet

### Community 55 - "EditPlaylistSheet"
Cohesion: 1.0
Nodes (1): EditPlaylistSheet

### Community 56 - "DividerBanner"
Cohesion: 1.0
Nodes (1): DividerBanner

### Community 57 - "IcSkipBack"
Cohesion: 1.0
Nodes (1): IcSkipBack

### Community 58 - "IcSkipForward"
Cohesion: 1.0
Nodes (1): IcSkipForward

### Community 59 - "Social brand icons (IcTikTok/IcY"
Cohesion: 1.0
Nodes (1): Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)

## Knowledge Gaps
- **150 isolated node(s):** `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)`, `Dark / Empty Screen State (debug)`, `IMP-1 setTimeout cleanup leak` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `apps-editor.jsx`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ritual-player.jsx`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `now-playing-bar.jsx`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CRIT-2 PlaylistQueueSheet collap`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TopTenCard`** (2 nodes): `TopTenCard`, `TopTenRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PlaylistCard`** (2 nodes): `PlaylistCard`, `PlaylistsRow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AddContentScreen`** (2 nodes): `AddContentScreen`, `SelectableContentCard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Portal pattern for overlays on s`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Declarative navigation state mac`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hardcoded taxonomies > inferred`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rewrite mobile-first instead of `** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CRIT-1 Sheet clipped outside vie`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMP-1 Simulated progress tickers`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMP-2 setTimeout post-tick needs`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMP-3 Stale closure of prop call`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMP-4 Chained smoke tests fragil`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `IMP-5 Silent Unsplash image 404s`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CATEGORIES_BY_TYPE map`** (1 nodes): `CATEGORIES_BY_TYPE map`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `EXPLORE_PLAYLISTS mock`** (1 nodes): `EXPLORE_PLAYLISTS mock`
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
- **Thin community `Social brand icons (IcTikTok/IcY`** (1 nodes): `Social brand icons (IcTikTok/IcYoutube/IcLinkedIn/IcGithub/IcInstagramBrand/IcSpotifyBrand/IcXBrand)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MentexApp` connect `Explore + Ritual Items` to `ExploreScreen`, `Audit Findings + Lessons`, `Phase Runner — Lessons (audit C-`, `Icon base wrapper`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `useToast()` connect `Active Queue + Toast` to `Profile + Achievements`, `Home Inactive + Banner`, `profile-stats-sheets.jsx`, `apps-editor.jsx`, `community-flow.jsx`, `UserProfileScreen()`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Mentex Home.html (entry HTML)` connect `Audit Findings + Lessons` to `Explore + Ritual Items`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `ProfileScreen()`) actually correct?**
  _`useToast()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `ProfileScreen` (e.g. with `ProfileReviewCard` and `LevelSheet`) actually correct?**
  _`ProfileScreen` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `iOS Device Frame UI Pattern`, `Dynamic Island / Notch UI Element`, `iOS Status Bar (9:41, signal, wifi, battery)` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Active Queue + Toast` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._