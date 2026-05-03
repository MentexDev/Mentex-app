# Graph Report - /Users/juandiego/Projects/Mentex app  (2026-05-03)

## Corpus Check
- Large corpus: 139 files · ~1,407,761 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1210 nodes · 1479 edges · 97 communities detected
- Extraction: 80% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Global Hooks & Queue Management|Global Hooks & Queue Management]]
- [[_COMMUNITY_Settings — Components & Sub-screens|Settings — Components & Sub-screens]]
- [[_COMMUNITY_Explore — Navigation & Data Layer|Explore — Navigation & Data Layer]]
- [[_COMMUNITY_C-A-R Audit Lessons & Patterns|C-A-R Audit Lessons & Patterns]]
- [[_COMMUNITY_Auto-routines Screen|Auto-routines Screen]]
- [[_COMMUNITY_Challenge Cards & Filters|Challenge Cards & Filters]]
- [[_COMMUNITY_Settings Visual Audit (Screenshots)|Settings Visual Audit (Screenshots)]]
- [[_COMMUNITY_Auto-routines Store & Hooks|Auto-routines Store & Hooks]]
- [[_COMMUNITY_In-App Browser|In-App Browser]]
- [[_COMMUNITY_Cross-cutting Auth, Nav, Shared|Cross-cutting: Auth, Nav, Shared]]
- [[_COMMUNITY_Auth Flow State Machine|Auth Flow State Machine]]
- [[_COMMUNITY_Explore — Global Stores & Helpers|Explore — Global Stores & Helpers]]
- [[_COMMUNITY_Profile Stats Sheets|Profile Stats Sheets]]
- [[_COMMUNITY_Onboarding Flow|Onboarding Flow]]
- [[_COMMUNITY_IA Coach Flow|IA Coach Flow]]
- [[_COMMUNITY_Settings Design System (Screenshots)|Settings Design System (Screenshots)]]
- [[_COMMUNITY_Home Inactive Screen|Home Inactive Screen]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
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
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 31 edges
2. `SettingsScreen` - 23 edges
3. `MentexApp Root Component` - 21 edges
4. `AgendaSheet` - 18 edges
5. `SubScreen` - 16 edges
6. `IAScreen` - 14 edges
7. `window.useToast` - 14 edges
8. `SectionLabel` - 13 edges
9. `Phase Home — GPU + UX audit` - 12 edges
10. `HomeRemindersCard` - 11 edges

## Surprising Connections (you probably didn't know these)
- `HomeInactive Screen` --references--> `Debug Screenshot: Challenges Screen (blank/loading)`  [AMBIGUOUS]
  screens/home-inactive.jsx → debug-challenges.png
- `ExploreFlow Screen` --references--> `Smoke Test 3: Explore Screen with Free/Locked Content`  [INFERRED]
  screens/explore-flow.jsx → smoke-test-3-explore-free.png
- `ExploreFlow Screen` --references--> `Smoke Test 5: Free Item VideoSheet (Hábitos Atómicos)`  [INFERRED]
  screens/explore-flow.jsx → smoke-test-5-freeitem.png
- `Premium Gating System (data-driven)` --conceptually_related_to--> `ExploreContentCard Component`  [INFERRED]
  docs/audits/phase-5-lessons.md → screens/explore-flow.jsx
- `Premium Gating System (data-driven)` --references--> `Smoke Test 3: Explore Screen with Free/Locked Content`  [INFERRED]
  docs/audits/phase-5-lessons.md → smoke-test-3-explore-free.png

## Hyperedges (group relationships)
- **Phase 3+4 audit findings mapped to onboarding fixes** — phase_3_4_lessons_crit1_step9_locknav_loop, phase_3_4_lessons_imp4_goto_upper_bound, phase_3_4_lessons_imp7_id_namespace_collision, onboarding_flow_locknav_frontier, onboarding_flow_goto, onboarding_flow_content_options [EXTRACTED 0.90]
- **SettingsScreen navigation router pattern** — settings_flow_settingsscreen, settings_flow_subscreen, settings_flow_categoryrow [EXTRACTED 1.00]
- **Security sub-system: 2FA + password + sessions** — settings_flow_seguridadsubscreen, settings_flow_twofasetupsubscreen, settings_flow_pwconfirmsheet, settings_flow_sessionrevokesheet, settings_flow_twofadisablesheet [EXTRACTED 1.00]
- **Global window store access pattern** — settings_flow_usesettingsdata, settings_flow_mtxprofile, settings_flow_mtxispremium, settings_flow_mtxonboarding, settings_flow_mtxauth [EXTRACTED 1.00]
- **Premium gating pattern** —  [1.0]
- **Ritual scheduling integration pattern** —  [1.0]
- **Player configuration cluster** —  [0.95]
- **Social profile open flow** — profile_opensocialurl, inappbrowser_open_global, inappbrowser_sheet [INFERRED 1.00]
- **Achievement render chain** — profile_all_achievements, profile_buildachievementsforuser, profile_achievementcardfull [INFERRED 1.00]
- **Own/foreign profile parity architecture** — profile_profilestatstab, profile_derivestatfor, userprofileflow_stats_donut [INFERRED 1.00]
- **Settings v7 Design System** —  [0.9]
- **Settings as Navigation Hub** —  [1.0]
- **Cancellation Flow Audit Smoke Test** —  [INFERRED 0.90]
- **Security Screen Audit Smoke Test** —  [INFERRED 0.90]
- **Cancellation Retention Funnel** —  [INFERRED 1.00]
- **Legal Documents Set** —  [INFERRED 1.00]

## Communities

### Community 0 - "Global Hooks & Queue Management"
Cohesion: 0.03
Nodes (46): useToast(), compute(), recompute(), resolveItems(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet() (+38 more)

### Community 2 - "Settings — Components & Sub-screens"
Cohesion: 0.06
Nodes (66): ACCENT_COLORS, ALL_INTERESTS, AparienciaSubScreen, AppsEditorSheet, AutoRoutineCreateSheet, CalificarSheet, CancelPlanSubScreen, CardList (+58 more)

### Community 3 - "Explore — Navigation & Data Layer"
Cohesion: 0.04
Nodes (66): __mtxNav, _MOCK_RECENT_SEARCHES, _resolvePlaylistItems, _SAVED_TO_PLAYLISTS_KEY store, _TRENDING_TAGS, _USER_PLAYLISTS_KEY store, ActiveQueueSwitcherOverlay, AddContentScreen (+58 more)

### Community 4 - "C-A-R Audit Lessons & Patterns"
Cohesion: 0.06
Nodes (60): Blind Spot #2 — keydown sin isTypingInEditable guard, Blind Spot #4 — non-button clickables sin keyboard, Blind Spot #6 — timestamp approximations, Blind Spot #7 — template-literal DOM IDs sin useId, Blind Spot #9 — useEffect deps con callbacks recreados, ExploreScreen, __mtxBookmarks, __mtxNav (+52 more)

### Community 5 - "Auto-routines Screen"
Cohesion: 0.04
Nodes (9): useAutoRoutines(), _fmtDuration(), _isRoutineActiveNow(), RoutineEditSheet(), RutinasSubScreen(), SeguridadSubScreen(), SettingsScreen(), _stgPwStrength() (+1 more)

### Community 6 - "Challenge Cards & Filters"
Cohesion: 0.07
Nodes (49): Challenge Card — Enfoque Profundo 21 días, Challenge Card — Gratitud 14 días, Challenge Card — Lectura 30 días, Challenge Card — Meditación 7 días, Challenge Filter: Mindfulness, Challenge Filter: Productividad, Challenge Filter: Todos, Challenge Status: Disponible (+41 more)

### Community 7 - "Settings Visual Audit (Screenshots)"
Cohesion: 0.06
Nodes (47): Two-Factor Authentication Row, Active Sessions List, Cancellation Flow (Multi-step), Legal Document Renderer Component, Mentex Tweaks Dev Overlay, Password Strength Indicator, Plan Status Card Component, Progress Stats Card Component (+39 more)

### Community 8 - "Auto-routines Store & Hooks"
Cohesion: 0.06
Nodes (43): AutoRoutineCreateSheet, SetupTile, __mtxAutoRoutines store, TimeField, useAutoRoutines, mtx:auto-routines-changed event, mtx:follows-changed event, mtx:open-item-from-community event (+35 more)

### Community 9 - "In-App Browser"
Cohesion: 0.06
Nodes (20): _iabDomain(), _iabIcon(), _iabSocialLabel(), InAppBrowserSheet(), CommunityReviewCard(), CommunityScreen(), _buildAchievements(), _buildAchievementsForUser() (+12 more)

### Community 10 - "Cross-cutting: Auth, Nav, Shared"
Cohesion: 0.07
Nodes (42): Auth Flow Routing (authView state machine), CategorySection Component, Mentex Icons Component, Mentex Shared Components, Cross-Tab Item Navigation (mtx:open-item-from-community), Debug Screenshot: Challenges Screen (blank/loading), ExploreContentCard Component, iOS Frame Component (+34 more)

### Community 11 - "Auth Flow State Machine"
Cohesion: 0.06
Nodes (36): AUTH_VIEWS state machine constants, _devCreateOnboardingUser dev helper, Forgot password 3-step flow, Auth localStorage persistence (__mtx_auth_v1), Mock user types (existing/demo/new), __mtxAuth store, useAuth hook, Tweaks → CSS vars (--neon, --ff-sans) (+28 more)

### Community 13 - "Explore — Global Stores & Helpers"
Cohesion: 0.07
Nodes (32): __mtxBookmarks, __mtxReviews, __mtxRitual, __mtxSkipSec, _calculateEarnedPoints, _formatSpeed, _formatTime, _generateChapters (+24 more)

### Community 14 - "Profile Stats Sheets"
Cohesion: 0.07
Nodes (30): AchievementSheet, FollowerRow, FollowersSheet, HoursSheet, LevelSheet, _LEVEL_TIERS (Mente Curiosa..Mente Maestra), _resolveDirectoryAuthors, StatSheetShell (shared bottom-sheet wrapper) (+22 more)

### Community 16 - "Onboarding Flow"
Cohesion: 0.09
Nodes (8): useOnboarding(), _bgForState(), CompactOptionCard(), OnboardingScreen(), OptionCard(), StepBlockedApps(), StepCoachVoice(), StepRoutineDuration()

### Community 17 - "IA Coach Flow"
Cohesion: 0.1
Nodes (7): _buildSessionGreeting(), _coachOpeningByVoice(), IAHistorySheet(), IAScreen(), _mockAssistantReply(), _runMockResponse(), useIAChat()

### Community 18 - "Settings Design System (Screenshots)"
Cohesion: 0.11
Nodes (24): Accent Color System, Settings Apariencia Screen, Settings Apariencia Violeta Accent State, Settings App Section, Interest Chip UI Pattern, Settings Cuenta Screen, Settings Información Section, Mentex Tweaks Dev Panel (+16 more)

### Community 19 - "Home Inactive Screen"
Cohesion: 0.11
Nodes (12): CoachWhisperBubble(), _coachWhisperMessage(), HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.21
Nodes (20): App Blocker / Distracciones Feature, Bottom Navigation Bar (5 Tabs), Challenge Card UI Component, Challenge Status States (En Curso / Disponible / Completado), Desafíos Tab Screen, Category Filter Tabs (Todos / Mindfulness / Productividad), Focus Session Feature, Home Tab Screen (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (7): ChannelsTab(), IntegrationsTab(), KnowledgeTab(), MemoryTab(), PersonalityTab(), PrivacyTab(), useIAConfig()

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (17): Phase Home — GPU + UX audit, screens/apps-editor.jsx, screens/auto-routines.jsx, screens/custom-time-modal.jsx, screens/home-active.jsx, screens/home-inactive.jsx, IMP-1 filter:blur halos sin compositing hint, IMP-2 Infinite animations sin GPU compositing (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (4): AppsEditorSheet(), getIc(), NotifCard(), NotificationsSheet()

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (16): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered, Pattern: useCommentCount filters by reviewId (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.27
Nodes (12): _applySmartPunctuation(), _capitalize(), _detectAndFormatList(), _detectVoiceCommand(), IAVoiceOverlay(), _mergeSegments(), _normalizeNumbers(), _parseSpokenInt() (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 31 - "Community 31"
Cohesion: 0.2
Nodes (10): __mtxReviews, CRIT-1 setTab community dead screen, Phase 1 — Audit Lessons, IMP-1 setTimeout cleanup leak, IMP-2 breakCount reset to 0, IMP-3 keydown stale closure + input guard, IMP-4 div onClick keyboard a11y, IMP-5 ACHIEVEMENTS unused window export (+2 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (10): Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx, screens/global-player.jsx, Meta-lesson: verificar suposiciones CSS empíricamente con getComputedStyle, screens/profile.jsx (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (8): COACH_VOICES data (4 voices), CompactOptionCard 2-col grid, CONTENT_OPTIONS data (8 content prefs), FOCUS_TIME_OPTIONS data, GOAL_OPTIONS data (10 multi-select goals), OptionCard horizontal card, ROUTINE_DURATIONS data (1/2/3/6/12h), IMP-7 ID namespace collision (sleep_content)

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (5): GlobalPlayerOverlay, __mtxGlobalPlayer, MtxNowPlayingBar, __mtxPlayer, useNowPlaying

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): MtxNowPlayingBar(), useNowPlaying()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (2): __mtxProfile store (external), __mtxOnboarding.complete() lifecycle

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (3): CRIT-1: stale closure in EliminarCuentaSubScreen, CRIT-2: isPlanCancelled not reset on close, Always-mounted + open prop pattern

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): AutoRoutineCreateSheet, __mtxAutoRoutines

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): __mtxIAChat store (external), Session-active chat purge effect

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): IAInputBar

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): HomeInactiveLegacy

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): screens/learning-views.jsx

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): HomeInactive

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): __mtxActiveQueue

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): SessionFlow

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): UserProfileFlow

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): RoutinesEditorSheet

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): screens/challenge-views.jsx

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): ActivityRunner

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): RitualPlayer

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): AppsEditorSheet

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): VoiceTranscriptionOverlay

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): CustomTimeModal

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): screens/notifications-sheet.jsx

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): MtxHeader

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): MtxTabBar

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): components/mtx-toast.jsx

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): components/app-icons.jsx

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): IMP-P2 unlockedAgoDays ternario tautológico

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): IMP-UP1 useCallback redundant on pure helper

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): IMP-C1 Dead code displayCommentCount/likesAdjust

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (1): restoreReminder

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (1): IAChatHeader

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): TweakRadio segmented control

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): MentexTipBox neon-glow contextual box

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): APP_DISTRACTOR_IDS (9 distraction apps)

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): mtx:open-user-profile listener

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): __mtxPlayer subscription via mtx:player-changed

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): AddContentToPlaylistSheet

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): _MOCK_HISTORY

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): _MOCK_SAVED_ITEMS

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): _MOCK_SAVED_PLAYLISTS

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): _MOCK_COMMENTS

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): _playValue

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): mtx:videosheet-closed

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): _ACHIEVEMENT_TIERS

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): _ACHIEVEMENT_CATEGORIES

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): Icon base component

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Skip controls icons

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Script loading order

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Settings Audit Lessons

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): IMP-7: Bridge __mtxPlayContent Settings→Explorar

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Content Detail Bottom Sheet

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): User Profile Card (Settings)

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Settings Screen - Free Plan State

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): Brand Primary Color (Teal/Mint)

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Danger / Destructive Color (Pink-Red)

## Ambiguous Edges - Review These
- `HomeInactive Screen` → `Debug Screenshot: Challenges Screen (blank/loading)`  [AMBIGUOUS]
  debug-challenges.png · relation: references

## Knowledge Gaps
- **204 isolated node(s):** `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard`, `DynamicIsland (z=150)`, `HoursSheet` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 37`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `__mtxAuth.completeOnboarding()`, `__mtxProfile store (external)`, `__mtxOnboarding.complete() lifecycle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `AutoRoutineCreateSheet`, `__mtxAutoRoutines`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `__mtxIAChat store (external)`, `Session-active chat purge effect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `IAInputBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `HomeInactiveLegacy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `screens/learning-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `HomeInactive`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `__mtxActiveQueue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `SessionFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `UserProfileFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `RoutinesEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `screens/challenge-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `ActivityRunner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `RitualPlayer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `AppsEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `VoiceTranscriptionOverlay`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `CustomTimeModal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `screens/notifications-sheet.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `MtxHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `MtxTabBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `components/mtx-toast.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `components/app-icons.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `IMP-P2 unlockedAgoDays ternario tautológico`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `IMP-UP1 useCallback redundant on pure helper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `IMP-C1 Dead code displayCommentCount/likesAdjust`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `restoreReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `IAChatHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `TweakRadio segmented control`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `MentexTipBox neon-glow contextual box`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `APP_DISTRACTOR_IDS (9 distraction apps)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `mtx:open-user-profile listener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `__mtxPlayer subscription via mtx:player-changed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `AddContentToPlaylistSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `_MOCK_HISTORY`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `_MOCK_SAVED_ITEMS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `_MOCK_SAVED_PLAYLISTS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `_MOCK_COMMENTS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `_playValue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `mtx:videosheet-closed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `_ACHIEVEMENT_TIERS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `_ACHIEVEMENT_CATEGORIES`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `Icon base component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Skip controls icons`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Script loading order`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Settings Audit Lessons`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `IMP-7: Bridge __mtxPlayContent Settings→Explorar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Content Detail Bottom Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `User Profile Card (Settings)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Settings Screen - Free Plan State`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Brand Primary Color (Teal/Mint)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Danger / Destructive Color (Pink-Red)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `HomeInactive Screen` and `Debug Screenshot: Challenges Screen (blank/loading)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `useToast()` connect `Global Hooks & Queue Management` to `In-App Browser`, `IA Coach Flow`, `Home Inactive Screen`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `IAScreen()` connect `IA Coach Flow` to `Global Hooks & Queue Management`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `RoutinesEditorSheet()` connect `Home Inactive Screen` to `Global Hooks & Queue Management`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `IAScreen()`) actually correct?**
  _`useToast()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `AgendaSheet` (e.g. with `IAHistorySheet` and `AssistantConfigSheet`) actually correct?**
  _`AgendaSheet` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._