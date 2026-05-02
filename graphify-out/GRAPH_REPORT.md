# Graph Report - .  (2026-05-02)

## Corpus Check
- 5 files · ~999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 740 nodes · 830 edges · 71 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Toast & Player Subsystem|Toast & Player Subsystem]]
- [[_COMMUNITY_C-A-R Audit Blind Spots|C-A-R Audit Blind Spots]]
- [[_COMMUNITY_Auth & Routing State Machine|Auth & Routing State Machine]]
- [[_COMMUNITY_Profile Sheets & Stats|Profile Sheets & Stats]]
- [[_COMMUNITY_Onboarding Shell & Primitives|Onboarding Shell & Primitives]]
- [[_COMMUNITY_IA Chat Coach Engine|IA Chat Coach Engine]]
- [[_COMMUNITY_Achievements & Awards|Achievements & Awards]]
- [[_COMMUNITY_HomeInactive Banner & Hero|HomeInactive Banner & Hero]]
- [[_COMMUNITY_Channels & Connect Modals|Channels & Connect Modals]]
- [[_COMMUNITY_Active Queue Player|Active Queue Player]]
- [[_COMMUNITY_Home GPU + UX Audit Notes|Home GPU + UX Audit Notes]]
- [[_COMMUNITY_Community Audit Lessons|Community Audit Lessons]]
- [[_COMMUNITY_Community Reviews & Avatars|Community Reviews & Avatars]]
- [[_COMMUNITY_IA Voice Smart Punctuation|IA Voice Smart Punctuation]]
- [[_COMMUNITY_Apps Protection Block Engine|Apps Protection Block Engine]]
- [[_COMMUNITY_Achievement Tier Resolution|Achievement Tier Resolution]]
- [[_COMMUNITY_Agenda Reminders Sheet|Agenda Reminders Sheet]]
- [[_COMMUNITY_Phase 1 Audit Lessons|Phase 1 Audit Lessons]]
- [[_COMMUNITY_Activity Runner Audit Lessons|Activity Runner Audit Lessons]]
- [[_COMMUNITY_Apps Editor Sheet|Apps Editor Sheet]]
- [[_COMMUNITY_Challenges All Screen|Challenges All Screen]]
- [[_COMMUNITY_Onboarding Data Constants|Onboarding Data Constants]]
- [[_COMMUNITY_Notifications Sheet Engine|Notifications Sheet Engine]]
- [[_COMMUNITY_Community 31 (6n)|Community 31 (6n)]]
- [[_COMMUNITY_Community 33 (6n)|Community 33 (6n)]]
- [[_COMMUNITY_Community 34 (6n)|Community 34 (6n)]]
- [[_COMMUNITY_Community 36 (5n)|Community 36 (5n)]]
- [[_COMMUNITY_Community 37 (4n)|Community 37 (4n)]]
- [[_COMMUNITY_Community 39 (3n)|Community 39 (3n)]]
- [[_COMMUNITY_Community 40 (2n)|Community 40 (2n)]]
- [[_COMMUNITY_Community 41 (2n)|Community 41 (2n)]]
- [[_COMMUNITY_Community 42 (2n)|Community 42 (2n)]]
- [[_COMMUNITY_Community 43 (1n)|Community 43 (1n)]]
- [[_COMMUNITY_Community 44 (1n)|Community 44 (1n)]]
- [[_COMMUNITY_Community 45 (1n)|Community 45 (1n)]]
- [[_COMMUNITY_Community 46 (1n)|Community 46 (1n)]]
- [[_COMMUNITY_Community 47 (1n)|Community 47 (1n)]]
- [[_COMMUNITY_Community 48 (1n)|Community 48 (1n)]]
- [[_COMMUNITY_Community 49 (1n)|Community 49 (1n)]]
- [[_COMMUNITY_Community 50 (1n)|Community 50 (1n)]]
- [[_COMMUNITY_Community 51 (1n)|Community 51 (1n)]]
- [[_COMMUNITY_Community 52 (1n)|Community 52 (1n)]]
- [[_COMMUNITY_Community 53 (1n)|Community 53 (1n)]]
- [[_COMMUNITY_Community 54 (1n)|Community 54 (1n)]]
- [[_COMMUNITY_Community 55 (1n)|Community 55 (1n)]]
- [[_COMMUNITY_Community 56 (1n)|Community 56 (1n)]]
- [[_COMMUNITY_Community 57 (1n)|Community 57 (1n)]]
- [[_COMMUNITY_Community 58 (1n)|Community 58 (1n)]]
- [[_COMMUNITY_Community 59 (1n)|Community 59 (1n)]]
- [[_COMMUNITY_Community 60 (1n)|Community 60 (1n)]]
- [[_COMMUNITY_Community 61 (1n)|Community 61 (1n)]]
- [[_COMMUNITY_Community 62 (1n)|Community 62 (1n)]]
- [[_COMMUNITY_Community 63 (1n)|Community 63 (1n)]]
- [[_COMMUNITY_Community 64 (1n)|Community 64 (1n)]]
- [[_COMMUNITY_Community 65 (1n)|Community 65 (1n)]]
- [[_COMMUNITY_Community 66 (1n)|Community 66 (1n)]]
- [[_COMMUNITY_Community 67 (1n)|Community 67 (1n)]]
- [[_COMMUNITY_Community 68 (1n)|Community 68 (1n)]]
- [[_COMMUNITY_Community 69 (1n)|Community 69 (1n)]]
- [[_COMMUNITY_Community 70 (1n)|Community 70 (1n)]]
- [[_COMMUNITY_Community 71 (1n)|Community 71 (1n)]]
- [[_COMMUNITY_Community 72 (1n)|Community 72 (1n)]]
- [[_COMMUNITY_Community 73 (1n)|Community 73 (1n)]]
- [[_COMMUNITY_Community 74 (1n)|Community 74 (1n)]]
- [[_COMMUNITY_Community 75 (1n)|Community 75 (1n)]]
- [[_COMMUNITY_Community 76 (1n)|Community 76 (1n)]]
- [[_COMMUNITY_Community 77 (1n)|Community 77 (1n)]]
- [[_COMMUNITY_Community 78 (1n)|Community 78 (1n)]]
- [[_COMMUNITY_Community 79 (1n)|Community 79 (1n)]]
- [[_COMMUNITY_Community 80 (1n)|Community 80 (1n)]]
- [[_COMMUNITY_Community 81 (1n)|Community 81 (1n)]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 29 edges
2. `AgendaSheet` - 18 edges
3. `IAScreen` - 14 edges
4. `Phase Home — GPU + UX audit` - 12 edges
5. `HomeRemindersCard` - 11 edges
6. `useVoiceTranscription()` - 10 edges
7. `__mtxIAAgenda store` - 10 edges
8. `Phase Runner — Lessons (audit C-A-R)` - 9 edges
9. `Phase 5 IA quick-access lessons` - 9 edges
10. `useIAConfig()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `FollowerRow()` --calls--> `useToast()`  [INFERRED]
  screens/profile-stats-sheets.jsx → components/mtx-toast.jsx
- `HomeInactive()` --calls--> `useToast()`  [INFERRED]
  screens/home-inactive.jsx → components/mtx-toast.jsx
- `RoutinesEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/routines-editor.jsx → components/mtx-toast.jsx
- `AppsEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/apps-editor.jsx → components/mtx-toast.jsx
- `ProposalCard()` --calls--> `useToast()`  [INFERRED]
  screens/ia-agenda.jsx → components/mtx-toast.jsx

## Hyperedges (group relationships)
- **Auth → Onboarding → App routing pipeline** — auth_flow_mtxauth_store, onboarding_flow_mtxonboarding_store, onboarding_flow_getinitialauthview, auth_flow_auth_views_state_machine, mentex_home_html_mentexapp_shell [EXTRACTED 0.90]
- **Onboarding complete() fans out to profile + auth** — onboarding_flow_complete, external_mtxprofile_store, auth_flow_completeonboarding, onboarding_flow_ob_defaults [EXTRACTED 0.95]
- **Phase 3+4 audit findings mapped to onboarding fixes** — phase_3_4_lessons_crit1_step9_locknav_loop, phase_3_4_lessons_imp4_goto_upper_bound, phase_3_4_lessons_imp7_id_namespace_collision, onboarding_flow_locknav_frontier, onboarding_flow_goto, onboarding_flow_content_options [EXTRACTED 0.90]

## Communities

### Community 0 - "Toast & Player Subsystem"
Cohesion: 0.04
Nodes (36): useToast(), compute(), recompute(), resolveItems(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet() (+28 more)

### Community 2 - "C-A-R Audit Blind Spots"
Cohesion: 0.06
Nodes (54): Blind Spot #2 — keydown sin isTypingInEditable guard, Blind Spot #4 — non-button clickables sin keyboard, Blind Spot #6 — timestamp approximations, Blind Spot #7 — template-literal DOM IDs sin useId, Blind Spot #9 — useEffect deps con callbacks recreados, ExploreScreen, __mtxBookmarks, __mtxNav (+46 more)

### Community 3 - "Auth & Routing State Machine"
Cohesion: 0.06
Nodes (36): AUTH_VIEWS state machine constants, _devCreateOnboardingUser dev helper, Forgot password 3-step flow, Auth localStorage persistence (__mtx_auth_v1), Mock user types (existing/demo/new), __mtxAuth store, useAuth hook, Tweaks → CSS vars (--neon, --ff-sans) (+28 more)

### Community 5 - "Profile Sheets & Stats"
Cohesion: 0.07
Nodes (30): AchievementSheet, FollowerRow, FollowersSheet, HoursSheet, LevelSheet, _LEVEL_TIERS (Mente Curiosa..Mente Maestra), _resolveDirectoryAuthors, StatSheetShell (shared bottom-sheet wrapper) (+22 more)

### Community 7 - "Onboarding Shell & Primitives"
Cohesion: 0.09
Nodes (8): useOnboarding(), _bgForState(), CompactOptionCard(), OnboardingScreen(), OptionCard(), StepBlockedApps(), StepCoachVoice(), StepRoutineDuration()

### Community 8 - "IA Chat Coach Engine"
Cohesion: 0.1
Nodes (6): _buildSessionGreeting(), IAHistorySheet(), IAScreen(), _mockAssistantReply(), _runMockResponse(), useIAChat()

### Community 9 - "Achievements & Awards"
Cohesion: 0.11
Nodes (9): _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths(), ProfileScreen(), ProfileStatsTab(), useProfile(), useUserReviews(), useFollow() (+1 more)

### Community 10 - "HomeInactive Banner & Hero"
Cohesion: 0.14
Nodes (10): HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById(), _getMetricType(), RoutineCreateSheet() (+2 more)

### Community 11 - "Channels & Connect Modals"
Cohesion: 0.16
Nodes (7): ChannelsTab(), IntegrationsTab(), KnowledgeTab(), MemoryTab(), PersonalityTab(), PrivacyTab(), useIAConfig()

### Community 12 - "Active Queue Player"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 13 - "Home GPU + UX Audit Notes"
Cohesion: 0.18
Nodes (17): Phase Home — GPU + UX audit, screens/apps-editor.jsx, screens/auto-routines.jsx, screens/custom-time-modal.jsx, screens/home-active.jsx, screens/home-inactive.jsx, IMP-1 filter:blur halos sin compositing hint, IMP-2 Infinite animations sin GPU compositing (+9 more)

### Community 14 - "Community Audit Lessons"
Cohesion: 0.13
Nodes (16): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered, Pattern: useCommentCount filters by reviewId (+8 more)

### Community 15 - "Community Reviews & Avatars"
Cohesion: 0.15
Nodes (6): CommunityReviewCard(), CommunityScreen(), ProfileReviewCard(), _formatRelative(), ThreadCommentRow(), useCommentCount()

### Community 16 - "IA Voice Smart Punctuation"
Cohesion: 0.27
Nodes (12): _applySmartPunctuation(), _capitalize(), _detectAndFormatList(), _detectVoiceCommand(), IAVoiceOverlay(), _mergeSegments(), _normalizeNumbers(), _parseSpokenInt() (+4 more)

### Community 17 - "Apps Protection Block Engine"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 19 - "Achievement Tier Resolution"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 21 - "Agenda Reminders Sheet"
Cohesion: 0.27
Nodes (8): AgendaSheet(), EventRow(), eventTypeStyle(), formatDayLabel(), formatDuration(), HomeRemindersCard(), ProposalCard(), useIAAgenda()

### Community 22 - "Phase 1 Audit Lessons"
Cohesion: 0.2
Nodes (10): __mtxReviews, CRIT-1 setTab community dead screen, Phase 1 — Audit Lessons, IMP-1 setTimeout cleanup leak, IMP-2 breakCount reset to 0, IMP-3 keydown stale closure + input guard, IMP-4 div onClick keyboard a11y, IMP-5 ACHIEVEMENTS unused window export (+2 more)

### Community 23 - "Activity Runner Audit Lessons"
Cohesion: 0.24
Nodes (10): Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx, screens/global-player.jsx, Meta-lesson: verificar suposiciones CSS empíricamente con getComputedStyle, screens/profile.jsx (+2 more)

### Community 24 - "Apps Editor Sheet"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 26 - "Challenges All Screen"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 27 - "Onboarding Data Constants"
Cohesion: 0.29
Nodes (8): COACH_VOICES data (4 voices), CompactOptionCard 2-col grid, CONTENT_OPTIONS data (8 content prefs), FOCUS_TIME_OPTIONS data, GOAL_OPTIONS data (10 multi-select goals), OptionCard horizontal card, ROUTINE_DURATIONS data (1/2/3/6/12h), IMP-7 ID namespace collision (sleep_content)

### Community 29 - "Notifications Sheet Engine"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 31 - "Community 31 (6n)"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 33 - "Community 33 (6n)"
Cohesion: 0.33
Nodes (6): DynamicIsland (z=150), IOSDevice, IOSGlassPill, IOSKeyboard, IOSNavBar, IOSStatusBar

### Community 34 - "Community 34 (6n)"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 36 - "Community 36 (5n)"
Cohesion: 0.4
Nodes (5): GlobalPlayerOverlay, __mtxGlobalPlayer, MtxNowPlayingBar, __mtxPlayer, useNowPlaying

### Community 37 - "Community 37 (4n)"
Cohesion: 0.67
Nodes (2): MtxNowPlayingBar(), useNowPlaying()

### Community 39 - "Community 39 (3n)"
Cohesion: 0.67
Nodes (2): __mtxProfile store (external), __mtxOnboarding.complete() lifecycle

### Community 40 - "Community 40 (2n)"
Cohesion: 1.0
Nodes (2): AutoRoutineCreateSheet, __mtxAutoRoutines

### Community 41 - "Community 41 (2n)"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 42 - "Community 42 (2n)"
Cohesion: 1.0
Nodes (2): __mtxIAChat store (external), Session-active chat purge effect

### Community 43 - "Community 43 (1n)"
Cohesion: 1.0
Nodes (1): IAInputBar

### Community 44 - "Community 44 (1n)"
Cohesion: 1.0
Nodes (1): HomeInactiveLegacy

### Community 45 - "Community 45 (1n)"
Cohesion: 1.0
Nodes (1): screens/learning-views.jsx

### Community 46 - "Community 46 (1n)"
Cohesion: 1.0
Nodes (1): HomeInactive

### Community 47 - "Community 47 (1n)"
Cohesion: 1.0
Nodes (1): __mtxActiveQueue

### Community 48 - "Community 48 (1n)"
Cohesion: 1.0
Nodes (1): SessionFlow

### Community 49 - "Community 49 (1n)"
Cohesion: 1.0
Nodes (1): UserProfileFlow

### Community 50 - "Community 50 (1n)"
Cohesion: 1.0
Nodes (1): RoutinesEditorSheet

### Community 51 - "Community 51 (1n)"
Cohesion: 1.0
Nodes (1): screens/challenge-views.jsx

### Community 52 - "Community 52 (1n)"
Cohesion: 1.0
Nodes (1): ActivityRunner

### Community 53 - "Community 53 (1n)"
Cohesion: 1.0
Nodes (1): RitualPlayer

### Community 54 - "Community 54 (1n)"
Cohesion: 1.0
Nodes (1): AppsEditorSheet

### Community 55 - "Community 55 (1n)"
Cohesion: 1.0
Nodes (1): VoiceTranscriptionOverlay

### Community 56 - "Community 56 (1n)"
Cohesion: 1.0
Nodes (1): CustomTimeModal

### Community 57 - "Community 57 (1n)"
Cohesion: 1.0
Nodes (1): screens/notifications-sheet.jsx

### Community 58 - "Community 58 (1n)"
Cohesion: 1.0
Nodes (1): MtxHeader

### Community 59 - "Community 59 (1n)"
Cohesion: 1.0
Nodes (1): MtxTabBar

### Community 60 - "Community 60 (1n)"
Cohesion: 1.0
Nodes (1): components/mtx-toast.jsx

### Community 61 - "Community 61 (1n)"
Cohesion: 1.0
Nodes (1): components/app-icons.jsx

### Community 62 - "Community 62 (1n)"
Cohesion: 1.0
Nodes (1): IMP-P2 unlockedAgoDays ternario tautológico

### Community 63 - "Community 63 (1n)"
Cohesion: 1.0
Nodes (1): IMP-UP1 useCallback redundant on pure helper

### Community 64 - "Community 64 (1n)"
Cohesion: 1.0
Nodes (1): IMP-C1 Dead code displayCommentCount/likesAdjust

### Community 65 - "Community 65 (1n)"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 66 - "Community 66 (1n)"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 67 - "Community 67 (1n)"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 68 - "Community 68 (1n)"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 69 - "Community 69 (1n)"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 70 - "Community 70 (1n)"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 71 - "Community 71 (1n)"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 72 - "Community 72 (1n)"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 73 - "Community 73 (1n)"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 74 - "Community 74 (1n)"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

### Community 75 - "Community 75 (1n)"
Cohesion: 1.0
Nodes (1): restoreReminder

### Community 76 - "Community 76 (1n)"
Cohesion: 1.0
Nodes (1): IAChatHeader

### Community 77 - "Community 77 (1n)"
Cohesion: 1.0
Nodes (1): TweakRadio segmented control

### Community 78 - "Community 78 (1n)"
Cohesion: 1.0
Nodes (1): MentexTipBox neon-glow contextual box

### Community 79 - "Community 79 (1n)"
Cohesion: 1.0
Nodes (1): APP_DISTRACTOR_IDS (9 distraction apps)

### Community 80 - "Community 80 (1n)"
Cohesion: 1.0
Nodes (1): mtx:open-user-profile listener

### Community 81 - "Community 81 (1n)"
Cohesion: 1.0
Nodes (1): __mtxPlayer subscription via mtx:player-changed

## Knowledge Gaps
- **130 isolated node(s):** `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard`, `DynamicIsland (z=150)`, `HoursSheet` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Apps Editor Sheet`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31 (6n)`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37 (4n)`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39 (3n)`** (3 nodes): `__mtxAuth.completeOnboarding()`, `__mtxProfile store (external)`, `__mtxOnboarding.complete() lifecycle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40 (2n)`** (2 nodes): `AutoRoutineCreateSheet`, `__mtxAutoRoutines`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41 (2n)`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42 (2n)`** (2 nodes): `__mtxIAChat store (external)`, `Session-active chat purge effect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43 (1n)`** (1 nodes): `IAInputBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44 (1n)`** (1 nodes): `HomeInactiveLegacy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45 (1n)`** (1 nodes): `screens/learning-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46 (1n)`** (1 nodes): `HomeInactive`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47 (1n)`** (1 nodes): `__mtxActiveQueue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48 (1n)`** (1 nodes): `SessionFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49 (1n)`** (1 nodes): `UserProfileFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50 (1n)`** (1 nodes): `RoutinesEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51 (1n)`** (1 nodes): `screens/challenge-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52 (1n)`** (1 nodes): `ActivityRunner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53 (1n)`** (1 nodes): `RitualPlayer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54 (1n)`** (1 nodes): `AppsEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55 (1n)`** (1 nodes): `VoiceTranscriptionOverlay`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56 (1n)`** (1 nodes): `CustomTimeModal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57 (1n)`** (1 nodes): `screens/notifications-sheet.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58 (1n)`** (1 nodes): `MtxHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59 (1n)`** (1 nodes): `MtxTabBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60 (1n)`** (1 nodes): `components/mtx-toast.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61 (1n)`** (1 nodes): `components/app-icons.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62 (1n)`** (1 nodes): `IMP-P2 unlockedAgoDays ternario tautológico`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63 (1n)`** (1 nodes): `IMP-UP1 useCallback redundant on pure helper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64 (1n)`** (1 nodes): `IMP-C1 Dead code displayCommentCount/likesAdjust`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65 (1n)`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66 (1n)`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67 (1n)`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68 (1n)`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69 (1n)`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70 (1n)`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71 (1n)`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72 (1n)`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73 (1n)`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74 (1n)`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75 (1n)`** (1 nodes): `restoreReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76 (1n)`** (1 nodes): `IAChatHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77 (1n)`** (1 nodes): `TweakRadio segmented control`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78 (1n)`** (1 nodes): `MentexTipBox neon-glow contextual box`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79 (1n)`** (1 nodes): `APP_DISTRACTOR_IDS (9 distraction apps)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80 (1n)`** (1 nodes): `mtx:open-user-profile listener`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81 (1n)`** (1 nodes): `__mtxPlayer subscription via mtx:player-changed`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Toast & Player Subsystem` to `IA Chat Coach Engine`, `Achievements & Awards`, `HomeInactive Banner & Hero`, `Community Reviews & Avatars`, `Achievement Tier Resolution`, `Agenda Reminders Sheet`, `Apps Editor Sheet`, `Notifications Sheet Engine`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `IAScreen()` connect `IA Chat Coach Engine` to `Toast & Player Subsystem`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `ProfileScreen()` connect `Achievements & Awards` to `Toast & Player Subsystem`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `IAScreen()`) actually correct?**
  _`useToast()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `AgendaSheet` (e.g. with `IAHistorySheet` and `AssistantConfigSheet`) actually correct?**
  _`AgendaSheet` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Toast & Player Subsystem` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._