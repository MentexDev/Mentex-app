# Graph Report - .  (2026-05-02)

## Corpus Check
- Large corpus: 63 files · ~1,019,933 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 603 nodes · 673 edges · 57 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Toast & Active Queue Shell|Toast & Active Queue Shell]]
- [[_COMMUNITY_C-A-R Blind Spots Catalog|C-A-R Blind Spots Catalog]]
- [[_COMMUNITY_Profile Sheets & Followers|Profile Sheets & Followers]]
- [[_COMMUNITY_IA Chat Core|IA Chat Core]]
- [[_COMMUNITY_Achievements System|Achievements System]]
- [[_COMMUNITY_Home Inactive (entry)|Home Inactive (entry)]]
- [[_COMMUNITY_IA Assistant Settings|IA Assistant Settings]]
- [[_COMMUNITY_Activity Runner Helpers|Activity Runner Helpers]]
- [[_COMMUNITY_Phase Home Audit Trail|Phase Home Audit Trail]]
- [[_COMMUNITY_Phase Comunidad Audit|Phase Comunidad Audit]]
- [[_COMMUNITY_Community Feed & Reviews|Community Feed & Reviews]]
- [[_COMMUNITY_Voice Transcription Overlay|Voice Transcription Overlay]]
- [[_COMMUNITY_Apps Protection & Break Picker|Apps Protection & Break Picker]]
- [[_COMMUNITY_Achievement Tier Math|Achievement Tier Math]]
- [[_COMMUNITY_Phase Runner Audit Trail|Phase Runner Audit Trail]]
- [[_COMMUNITY_IA Agenda (Phase 4)|IA Agenda (Phase 4)]]
- [[_COMMUNITY_Apps Editor Sheet|Apps Editor Sheet]]
- [[_COMMUNITY_Challenges All Screen|Challenges All Screen]]
- [[_COMMUNITY_Notifications Sheet|Notifications Sheet]]
- [[_COMMUNITY_Ritual Playlist Builder|Ritual Playlist Builder]]
- [[_COMMUNITY_Active Queue Compute|Active Queue Compute]]
- [[_COMMUNITY_Chronological Feed Pattern|Chronological Feed Pattern]]
- [[_COMMUNITY_Now Playing Bar|Now Playing Bar]]
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
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 29 edges
2. `AgendaSheet` - 14 edges
3. `Phase Home — GPU + UX audit` - 12 edges
4. `MentexApp` - 11 edges
5. `useVoiceTranscription()` - 10 edges
6. `Phase Runner — Lessons (audit C-A-R)` - 9 edges
7. `useIAConfig()` - 7 edges
8. `__mtxIAAgenda` - 7 edges
9. `ExploreScreen()` - 6 edges
10. `IOSDevice` - 6 edges

## Surprising Connections (you probably didn't know these)
- `MentexApp` --calls--> `MtxTabBar`  [INFERRED]
  Mentex Home.html → components/mentex-shared.jsx
- `FollowerRow()` --calls--> `useToast()`  [INFERRED]
  screens/profile-stats-sheets.jsx → components/mtx-toast.jsx
- `HomeInactive()` --calls--> `useToast()`  [INFERRED]
  screens/home-inactive.jsx → components/mtx-toast.jsx
- `RoutinesEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/routines-editor.jsx → components/mtx-toast.jsx
- `AppsEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/apps-editor.jsx → components/mtx-toast.jsx

## Hyperedges (group relationships)
- **Bottom-sheet drag-to-dismiss + ESC + backdrop-blur shell reused across LevelSheet/HoursSheet/FollowersSheet/AchievementSheet/EditProfileSheet/RankingFilterSheet** —  [INFERRED 0.88]
- **__mtx* reactive store pattern (subscribe + getSnapshot + custom event)** — ia_agenda_mtxiaagenda, ia_flow_mtxiachat, ia_settings_mtxiaconfig, explore_flow_mtxnav, now_playing_bar_mtxplayer, global_player_mtxglobalplayer, auto_routines_mtxautoroutines, home_active_mtxappsbreak, profile_mtxprofile, active_queue_mtxactivequeue, explore_flow_mtxritual [INFERRED 0.90]
- **Chronological feed pattern: _timeAgoToMs + _formatRelative + .sort by _sortTs in CommunityScreen.feed useMemo** — community_flow__timeagotoms, community_flow__formatrelative, community_flow_feed_usememo, community_flow_chronological_feed_pattern [INFERRED 0.92]
- **Sheets lifted to MentexApp shell (z-index over tab bar)** — ia_agenda_agendasheet, ia_flow_iahistorysheet, ia_settings_assistantconfigsheet, mentex_home_mentexapp [EXTRACTED 1.00]
- **Phase 4 audit cycle — 1 CRIT + 5 IMP findings on AgendaSheet** — phase_4_ia_agenda_lessons_doc, phase_4_crit_1_dialog_a11y, phase_4_imp_1_fade_in_token, phase_4_imp_2_dead_props, phase_4_imp_3_dismiss_feedback, phase_4_imp_4_id_collision, phase_4_imp_5_useeffect_deps, ia_agenda_agendasheet [EXTRACTED 1.00]
- **Phase 1 audit keyboard a11y enforcement (role/tabIndex/onKeyDown)** — phase_1_lessons_imp_4, notifications_sheet_notifcard, home_active_activityrow [EXTRACTED 0.90]
- **Portal consumers affected by mtx-overlay-root pointer-events regression** — mentex_home_mtxoverlayroot, phase_runner_lessons_globalplayerjsx, phase_runner_lessons_activityrunnerjsx, phase_runner_lessons_profilejsx, phase_runner_lessons_userprofileflowjsx, phase_runner_lessons_rankingflowjsx, phase_runner_lessons_exploreflowjsx [EXTRACTED 0.90]
- **Bottom-sheet modals (grabber+backdrop+slideup) requiring ESC handler** — mentex_home_customtimemodal, mentex_home_autoroutinecreatesheet, mentex_home_autoroutinecreatedsheet, mentex_home_appseditorsheet, mentex_home_routineseditorsheet [INFERRED 0.85]
- **GPU compositing fixes (filter:blur halos + infinite animations with willChange)** — phase_home_gpu_lessons_imp1, phase_home_gpu_lessons_imp2, phase_home_gpu_lessons_rule_willchange_blur [EXTRACTED 0.90]

## Communities

### Community 0 - "Toast & Active Queue Shell"
Cohesion: 0.04
Nodes (32): useToast(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints() (+24 more)

### Community 2 - "C-A-R Blind Spots Catalog"
Cohesion: 0.05
Nodes (57): Blind Spot #2 — keydown sin isTypingInEditable guard, Blind Spot #4 — non-button clickables sin keyboard, Blind Spot #6 — timestamp approximations, Blind Spot #7 — template-literal DOM IDs sin useId, Blind Spot #9 — useEffect deps con callbacks recreados, ExploreScreen, __mtxBookmarks, __mtxNav (+49 more)

### Community 3 - "Profile Sheets & Followers"
Cohesion: 0.07
Nodes (30): AchievementSheet, FollowerRow, FollowersSheet, HoursSheet, LevelSheet, _LEVEL_TIERS (Mente Curiosa..Mente Maestra), _resolveDirectoryAuthors, StatSheetShell (shared bottom-sheet wrapper) (+22 more)

### Community 5 - "IA Chat Core"
Cohesion: 0.1
Nodes (5): IAHistorySheet(), IAScreen(), _mockAssistantReply(), _runMockResponse(), useIAChat()

### Community 6 - "Achievements System"
Cohesion: 0.11
Nodes (9): _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths(), ProfileScreen(), ProfileStatsTab(), useProfile(), useUserReviews(), useFollow() (+1 more)

### Community 7 - "Home Inactive (entry)"
Cohesion: 0.14
Nodes (10): HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById(), _getMetricType(), RoutineCreateSheet() (+2 more)

### Community 8 - "IA Assistant Settings"
Cohesion: 0.16
Nodes (7): ChannelsTab(), IntegrationsTab(), KnowledgeTab(), MemoryTab(), PersonalityTab(), PrivacyTab(), useIAConfig()

### Community 9 - "Activity Runner Helpers"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 10 - "Phase Home Audit Trail"
Cohesion: 0.18
Nodes (17): Phase Home — GPU + UX audit, screens/apps-editor.jsx, screens/auto-routines.jsx, screens/custom-time-modal.jsx, screens/home-active.jsx, screens/home-inactive.jsx, IMP-1 filter:blur halos sin compositing hint, IMP-2 Infinite animations sin GPU compositing (+9 more)

### Community 11 - "Phase Comunidad Audit"
Cohesion: 0.13
Nodes (16): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered, Pattern: useCommentCount filters by reviewId (+8 more)

### Community 12 - "Community Feed & Reviews"
Cohesion: 0.15
Nodes (6): CommunityReviewCard(), CommunityScreen(), ProfileReviewCard(), _formatRelative(), ThreadCommentRow(), useCommentCount()

### Community 13 - "Voice Transcription Overlay"
Cohesion: 0.27
Nodes (12): _applySmartPunctuation(), _capitalize(), _detectAndFormatList(), _detectVoiceCommand(), IAVoiceOverlay(), _mergeSegments(), _normalizeNumbers(), _parseSpokenInt() (+4 more)

### Community 15 - "Apps Protection & Break Picker"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 16 - "Achievement Tier Math"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 18 - "Phase Runner Audit Trail"
Cohesion: 0.24
Nodes (10): Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx, screens/global-player.jsx, Meta-lesson: verificar suposiciones CSS empíricamente con getComputedStyle, screens/profile.jsx (+2 more)

### Community 19 - "IA Agenda (Phase 4)"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 20 - "Apps Editor Sheet"
Cohesion: 0.33
Nodes (7): AgendaSheet(), EventRow(), eventTypeStyle(), formatDayLabel(), formatDuration(), ProposalCard(), useIAAgenda()

### Community 22 - "Challenges All Screen"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 24 - "Notifications Sheet"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 26 - "Ritual Playlist Builder"
Cohesion: 0.47
Nodes (4): compute(), recompute(), resolveItems(), _resolvePlaylistItems()

### Community 27 - "Active Queue Compute"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 29 - "Chronological Feed Pattern"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 31 - "Now Playing Bar"
Cohesion: 0.67
Nodes (2): MtxNowPlayingBar(), useNowPlaying()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): AutoRoutineCreateSheet, __mtxAutoRoutines

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent, display:flex + transform + child position:absolute trap

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): frames/tweaks-panel.jsx

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): IAInputBar

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): HomeInactiveLegacy

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): screens/learning-views.jsx

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): HomeInactive

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): __mtxActiveQueue

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): SessionFlow

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): UserProfileFlow

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): RoutinesEditorSheet

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): screens/challenge-views.jsx

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): ActivityRunner

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): RitualPlayer

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): AppsEditorSheet

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): VoiceTranscriptionOverlay

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): CustomTimeModal

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): screens/notifications-sheet.jsx

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): MtxHeader

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): components/mtx-toast.jsx

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): components/app-icons.jsx

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): IMP-P2 unlockedAgoDays ternario tautológico

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): IMP-UP1 useCallback redundant on pure helper

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): IMP-C1 Dead code displayCommentCount/likesAdjust

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Portal pattern for overlays on scrollable content

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): Declarative navigation state machine (view + payload)

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Hardcoded taxonomies > inferred

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): Rewrite mobile-first instead of porting desktop reference

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): CRIT-1 Sheet clipped outside viewport when rendered in scroll container

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): IMP-1 Simulated progress tickers should not depend on real durations

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): IMP-2 setTimeout post-tick needs cleanup in useEffect

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): IMP-3 Stale closure of prop callbacks in useEffect with empty deps

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): IMP-4 Chained smoke tests fragile due to accumulated state

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): IMP-5 Silent Unsplash image 404s

## Knowledge Gaps
- **99 isolated node(s):** `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard`, `DynamicIsland (z=150)`, `frames/tweaks-panel.jsx` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `IA Agenda (Phase 4)`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Active Queue Compute`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Now Playing Bar`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `AutoRoutineCreateSheet`, `__mtxAutoRoutines`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `CRIT-2 PlaylistQueueSheet collapsed to height:0 in flex+transform parent`, `display:flex + transform + child position:absolute trap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `frames/tweaks-panel.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `IAInputBar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `HomeInactiveLegacy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `screens/learning-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `HomeInactive`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `__mtxActiveQueue`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `SessionFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `UserProfileFlow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `RoutinesEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `screens/challenge-views.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `ActivityRunner`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `RitualPlayer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `AppsEditorSheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `VoiceTranscriptionOverlay`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `CustomTimeModal`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `screens/notifications-sheet.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `MtxHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `components/mtx-toast.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `components/app-icons.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `IMP-P2 unlockedAgoDays ternario tautológico`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `IMP-UP1 useCallback redundant on pure helper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `IMP-C1 Dead code displayCommentCount/likesAdjust`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Portal pattern for overlays on scrollable content`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `Declarative navigation state machine (view + payload)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Hardcoded taxonomies > inferred`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `Rewrite mobile-first instead of porting desktop reference`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `CRIT-1 Sheet clipped outside viewport when rendered in scroll container`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `IMP-1 Simulated progress tickers should not depend on real durations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `IMP-2 setTimeout post-tick needs cleanup in useEffect`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `IMP-3 Stale closure of prop callbacks in useEffect with empty deps`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `IMP-4 Chained smoke tests fragile due to accumulated state`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `IMP-5 Silent Unsplash image 404s`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Toast & Active Queue Shell` to `IA Chat Core`, `Achievements System`, `Home Inactive (entry)`, `Community Feed & Reviews`, `Achievement Tier Math`, `IA Agenda (Phase 4)`, `Apps Editor Sheet`, `Notifications Sheet`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `IAScreen()` connect `IA Chat Core` to `Toast & Active Queue Shell`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `ProfileScreen()` connect `Achievements System` to `Toast & Active Queue Shell`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `IAScreen()`) actually correct?**
  _`useToast()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `MentexApp` (e.g. with `IOSDevice` and `MtxTabBar`) actually correct?**
  _`MentexApp` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Toast & Active Queue Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._