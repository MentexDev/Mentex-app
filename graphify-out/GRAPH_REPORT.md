# Graph Report - .  (2026-05-02)

## Corpus Check
- Large corpus: 64 files · ~1,025,241 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 630 nodes · 732 edges · 59 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
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
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 29 edges
2. `AgendaSheet` - 19 edges
3. `IAScreen` - 15 edges
4. `MentexApp shell` - 14 edges
5. `Phase Home — GPU + UX audit` - 12 edges
6. `HomeRemindersCard` - 12 edges
7. `useVoiceTranscription()` - 10 edges
8. `__mtxIAAgenda store` - 10 edges
9. `Phase Runner — Lessons (audit C-A-R)` - 9 edges
10. `Phase 5 IA quick-access lessons` - 9 edges

## Surprising Connections (you probably didn't know these)
- `MtxTabBar` --calls--> `MentexApp shell`  [INFERRED]
  components/mentex-shared.jsx → Mentex Home.html
- `FollowerRow()` --calls--> `useToast()`  [INFERRED]
  screens/profile-stats-sheets.jsx → components/mtx-toast.jsx
- `HomeInactive()` --calls--> `useToast()`  [INFERRED]
  screens/home-inactive.jsx → components/mtx-toast.jsx
- `RoutinesEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/routines-editor.jsx → components/mtx-toast.jsx
- `AppsEditorSheet()` --calls--> `useToast()`  [INFERRED]
  screens/apps-editor.jsx → components/mtx-toast.jsx

## Hyperedges (group relationships)
- **Phase 5 audit cycle (1 CRIT + 6 IMP)** — phase_5_finding_crit_1, phase_5_finding_imp_1, phase_5_finding_imp_2, phase_5_finding_imp_3, phase_5_finding_imp_4, phase_5_finding_imp_5, phase_5_finding_imp_6, ia_flow_iascreen, ia_agenda_homereminderscard, ia_agenda_addremindersheet, mentex_home_mentexapp, mentex_shared_mtxsectionhead [EXTRACTED 1.00]
- **session-active conversation lifecycle (create in IAScreen, mutate from HomeActive button, cleanup in MentexApp wasActiveRef)** — ia_flow_iascreen, home_active_iaquickaccessbutton, mentex_home_wasactiveref_effect, ia_flow_store_mtxiachat, ia_flow_buildsessiongreeting [INFERRED 0.90]
- **HomeActive + IAScreen + MentexApp event-based coupling (mtx:ia-open-session-chat + mtx:ia-leave-session-chat)** — home_active_homeactive, home_active_iaquickaccessbutton, ia_flow_iascreen, mentex_home_mentexapp [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (79): Blind Spot #2 — keydown sin isTypingInEditable guard, Blind Spot #4 — non-button clickables sin keyboard, Blind Spot #6 — timestamp approximations, Blind Spot #7 — template-literal DOM IDs sin useId, Blind Spot #9 — useEffect deps con callbacks recreados, ExploreScreen, __mtxBookmarks, __mtxNav (+71 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (32): useToast(), useActiveQueue(), ActiveQueueSwitcherOverlay(), AddContentScreen(), AddContentToPlaylistSheet(), BookmarkNameSheet(), BookmarksSheet(), _calculateEarnedPoints() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (30): AchievementSheet, FollowerRow, FollowersSheet, HoursSheet, LevelSheet, _LEVEL_TIERS (Mente Curiosa..Mente Maestra), _resolveDirectoryAuthors, StatSheetShell (shared bottom-sheet wrapper) (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (6): _buildSessionGreeting(), IAHistorySheet(), IAScreen(), _mockAssistantReply(), _runMockResponse(), useIAChat()

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (9): _buildAchievements(), _buildAchievementsForUser(), _buildAreaPaths(), ProfileScreen(), ProfileStatsTab(), useProfile(), useUserReviews(), useFollow() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (10): HomeInactive(), RoutineIc(), RoutineIc(), _composeDur(), getColorById(), getIconById(), _getMetricType(), RoutineCreateSheet() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (7): ChannelsTab(), IntegrationsTab(), KnowledgeTab(), MemoryTab(), PersonalityTab(), PrivacyTab(), useIAConfig()

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (4): _buildRunnerPlaylist(), _resolveCopy(), _resolveSuggestions(), RunnerShell()

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (17): Phase Home — GPU + UX audit, screens/apps-editor.jsx, screens/auto-routines.jsx, screens/custom-time-modal.jsx, screens/home-active.jsx, screens/home-inactive.jsx, IMP-1 filter:blur halos sin compositing hint, IMP-2 Infinite animations sin GPU compositing (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (16): New blind spot #11 inner-component re-mount, CRIT-R1 Subcomponent defined inside parent (re-mount), CRIT-T1 span onClick missing keyboard a11y, CRIT-T2 setTimeout in useEffect without cleanup, Phase Comunidad audit lessons, IMP-T3 lookupAuthor O(n) -> Map memo, IMP-T4 force() re-render eager unfiltered, Pattern: useCommentCount filters by reviewId (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (6): CommunityReviewCard(), CommunityScreen(), ProfileReviewCard(), _formatRelative(), ThreadCommentRow(), useCommentCount()

### Community 13 - "Community 13"
Cohesion: 0.27
Nodes (12): _applySmartPunctuation(), _capitalize(), _detectAndFormatList(), _detectVoiceCommand(), IAVoiceOverlay(), _mergeSegments(), _normalizeNumbers(), _parseSpokenInt() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (5): AppsBreakPickerSheet(), AppsProtectionCard(), startInterval(), stopInterval(), useAppsBreak()

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (6): _findCurrentTier(), _findNextTier(), FollowerRow(), LevelSheet(), StatSheetShell(), useStatSheet()

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (8): AgendaSheet(), EventRow(), eventTypeStyle(), formatDayLabel(), formatDuration(), HomeRemindersCard(), ProposalCard(), useIAAgenda()

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (10): Phase Runner — Lessons (audit C-A-R), screens/activity-runner.jsx, Blind spot #11 — pointer-events:none hereda en cascada vía portal, CRIT-1 pointer-events:none en portal mount root rompe TODOS los hijos via portal, screens/explore-flow.jsx, screens/global-player.jsx, Meta-lesson: verificar suposiciones CSS empíricamente con getComputedStyle, screens/profile.jsx (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (1): AppsEditorSheet()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (4): formatParticipants(), isAvailableStatus(), MtxChallengeCard(), MtxChallengeDetail()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (3): getIc(), NotifCard(), NotificationsSheet()

### Community 26 - "Community 26"
Cohesion: 0.47
Nodes (4): compute(), recompute(), resolveItems(), _resolvePlaylistItems()

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (2): openRitualActivity(), _resolveActivityToExploreItem()

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (6): _formatRelative — ts → 'Ahora'/'Nm'/'Nh'/'Nd', _MOCK_COMMUNITY_REVIEWS (timeAgo seed), _timeAgoToMs — parses '2h'/'1d'/'Ahora' to ms epoch, Chronological feed pattern (merge own + mock, sort by _sortTs DESC, dynamic _formatRelative), CommunityScreen (unified feed), feed useMemo — chronological merge+sort

### Community 31 - "Community 31"
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

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): restoreReminder

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): IAChatHeader

## Knowledge Gaps
- **102 isolated node(s):** `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard`, `DynamicIsland (z=150)`, `frames/tweaks-panel.jsx` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (9 nodes): `AppRow()`, `AppsEditorSheet()`, `CategoryChip()`, `CategoryGroup()`, `Checkmark()`, `EmptyState()`, `FlatList()`, `apps-editor.jsx`, `SuggestedSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (6 nodes): `_buildRitualPlaylist()`, `GP()`, `ritual-player.jsx`, `openRitualActivity()`, `_resolveActivityToExploreItem()`, `useRitualPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (4 nodes): `_emit()`, `now-playing-bar.jsx`, `MtxNowPlayingBar()`, `useNowPlaying()`
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
- **Thin community `Community 67`** (1 nodes): `restoreReminder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `IAChatHeader`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 1` to `Community 5`, `Community 6`, `Community 7`, `Community 12`, `Community 16`, `Community 18`, `Community 20`, `Community 24`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `IAScreen()` connect `Community 5` to `Community 1`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `ProfileScreen()` connect `Community 6` to `Community 1`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `useToast()` (e.g. with `FollowerRow()` and `IAScreen()`) actually correct?**
  _`useToast()` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `AgendaSheet` (e.g. with `IAHistorySheet` and `AssistantConfigSheet`) actually correct?**
  _`AgendaSheet` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `MentexApp shell` (e.g. with `IOSDevice` and `MtxTabBar`) actually correct?**
  _`MentexApp shell` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IOSStatusBar`, `IOSGlassPill`, `IOSKeyboard` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._