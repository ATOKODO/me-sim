---
kind: technical
title: Contrats techniques du frontal
---

# Contrats du frontal

Les paramètres et types de retour ci-dessous reflètent les déclarations TypeScript ou leur type inféré. Les dépendances appelées peuvent échouer : sauf traitement indiqué, leurs erreurs suivent leur contrat propre. Les fonctions locales listées sont des détails d’implémentation, pas des API publiques. Les données affichées proviennent du profil actif ; l’application native reste responsable des validations et de la persistance.

## TECH-FRONTEND-CHART-101 — Courbes SVG

Implémente REQ-FRONTEND-HABITS-101. Source : `src/app/core/chart-path.ts`.

Entrée : un tableau de nombres et un indicateur de lissage. La sortie est un chemin SVG dans une grille 400 × 100 ; une liste vide produit une chaîne vide. Le lissage conserve les points et ne dépasse pas les valeurs voisines. Aucun stockage ni appel réseau ; les nombres doivent être utilisables par le calcul numérique.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `chartPath` | `values: readonly number[], smooth = false` | `string` |
| `chartPath.coordinate` | `value: number` | `number` |

## TECH-FRONTEND-CLOCK-101 — Horloge locale

Implémente REQ-FRONTEND-GHOST-101. Source : `src/app/core/clock.ts`.

Les rappels internes lisent l’heure système, mettent à jour le signal et programment le prochain rafraîchissement à la minute. La visibilité, le focus et pageshow forcent un rafraîchissement ; la destruction annule la minuterie et retire les écouteurs. Aucun retour métier ni persistance.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `LocalClock.refresh` | `aucune` | `void` |
| `LocalClock.visible` | `aucune` | `void` |

**Constructeur LocalClock** — Entrées : `aucun`. Le constructeur installe l’horloge, ses écouteurs et leur nettoyage à la destruction.

## TECH-FRONTEND-SUMMARY-101 — Résumé et trajectoire cible

Implémente REQ-FRONTEND-HABITS-101. Source : `src/app/core/daily-summary.ts`.

Entrées : observations, date locale, instant et objectifs selon la fonction. Les sessions traversant minuit sont réparties par jour ; les événements de la chronologie sont limités aux dernières 24 heures. Les résumés retournent null pour une mesure absente et évitent de compter deux fois le total d’activité. La trajectoire retourne sept écarts moyens et leur couverture ; elle ne produit pas de diagnostic. Aucun effet de stockage.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `rowsOnDay` | `observations: Observation[], date: string, now: number` | `Observation[]` |
| `timelineEvents` | `observations: Observation[], now: number` | `{ observation: Observation; time: Date; }[]` |
| `dailyRecap` | `observations: Observation[], date: string, now: number` | `{ events: number; activeMinutes: number \| null; sleepHours: number \| null; socialMinutes: number \| null; screenAndGamingMinutes: number \| null; alcohol: number \| null; tobaccoCigarettes: number \| null; vapingMinutes: number \| null; eveningScreenMinutes: number \| null; sedentaryMinutes: number \| null; }` |
| `dailyRecap.sum` | `...metrics: string[]` | `number \| null` |
| `targetTrajectory` | `observations: Observation[], target: TargetDay, today: string, now = Date.now()` | `{ date: string; deviation: number \| null; coverage: number; total: number; actual: number; hasData: boolean; }[]` |
| `targetTrajectory.latest` | `metric: string` | `number \| undefined` |
| `targetTrajectory.sum` | `metric: string` | `number \| undefined` |

## TECH-FRONTEND-DIALOG-101 — Focus et fermeture des dialogues

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/focus-dialog.ts`.

Entrées : élément hôte et événement clavier. Le focus initial est différé ; Tab et Maj-Tab restent entre les premiers et derniers contrôles disponibles, Échap émet dismissed. À la destruction, la minuterie est annulée et le focus précédent restauré. Ces fonctions manipulent le DOM et ne retournent pas de données métier.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `FocusDialog.elements` | `aucune` | `HTMLElement[]` |
| `FocusDialog.ngAfterViewInit` | `aucune` | `void` |
| `FocusDialog.onKey` | `e: KeyboardEvent` | `void` |
| `FocusDialog.ngOnDestroy` | `aucune` | `void` |

## TECH-FRONTEND-GHOST-101 — Événements et comparaisons horaires

Implémente REQ-FRONTEND-GHOST-101. Source : `src/app/core/ghost.ts`.

Les fonctions convertissent heures et dates locales, découpent les sessions par journée et discontinuité horaire, sélectionnent les versions de routine effectives et comparent observations et planning. Les fréquences distinguent données connues, correspondances et jours totaux ; une égalité ne choisit aucun événement dominant. recorded fusionne les intervalles pour éviter un double comptage. Les mutations de l’aperçu modifient le snapshot en mémoire et signalent notamment les profils introuvables, conflits de session, dates futures et doublons par exception ; la validation native reste autoritaire.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `minuteOf` | `date: Date` | `number` |
| `timeLabel` | `minute: number` | `string` |
| `localStamp` | `date = new Date()` | `string` |
| `defaultLabel` | `metric: Metric` | `string` |
| `eventLabel` | `o: Observation` | `string` |
| `eventsForDay` | `observations: Observation[], date: string, now: number, active?: ActivitySession \| null` | `GhostEvent[]` |
| `eventsForDay.include` | `id: string, metric: Metric, label: string, start: number, end: number, value: number, point: boolean, running = false, habitId: string \| null = null` | `void` |
| `routineForDay` | `plans: RoutineVersion[], date: string` | `RoutineVersion[]` |
| `plannedEvents` | `plans: RoutineVersion[], date: string` | `GhostEvent[]` |
| `eventsAt` | `events: GhostEvent[], minute: number` | `GhostEvent[]` |
| `referenceDates` | `today: string, days: number, kind: "all" \| "workdays" \| "weekend"` | `string[]` |
| `matches` | `e: GhostEvent, focus: Focus` | `boolean` |
| `unionLength` | `intervals: [number, number][]` | `number` |
| `recorded` | `events: GhostEvent[], minute: number, focus?: Focus` | `number` |
| `frequency` | `days: GhostEvent[][], minute: number, focus: Focus` | `{ known: number; matched: number; total: number; }` |
| `frequencyBins` | `days: GhostEvent[][], focus: Focus` | `GhostEvent[]` |
| `compareSchedule` | `actual: GhostEvent[], plans: GhostEvent[], minute: number` | `{ plan: GhostEvent; match: GhostEvent; status: string; delay: number \| null; durationDelta: number \| null; withinTolerance: boolean \| null; }[]` |
| `dominant` | `days: GhostEvent[][], minute: number` | `GhostEvent \| null` |
| `recordLinkedHabit` | `s: Snapshot, o: Observation` | `void` |
| `applyGhostMutation` | `s: Snapshot, op: Mutation` | `boolean` |
| `observationKey` | `o: Observation` | `string` |

## TECH-FRONTEND-TRACKING-101 — Dates et état des habitudes

Implémente REQ-FRONTEND-HABITS-101. Source : `src/app/core/habit-tracking.ts`.

Les entrées sont des dates locales, définitions et réponses. Les fonctions calculent les habitudes actives et un aperçu sur les seules réponses fournies. Le score est null tant que la journée n’est pas complète et validée ; aucune réponse n’est assimilée à non. Les fonctions retournent de nouvelles valeurs sans enregistrer de données.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `localDate` | `date: Date` | `string` |
| `shiftDate` | `key: string, days: number` | `string` |
| `activeHabits` | `habits: HabitDefinition[], date: string` | `HabitDefinition[]` |
| `evaluateHabitDay` | `habits: HabitDefinition[], day: HabitDay \| undefined, date: string` | `{ total: number; answered: number; matched: number; preview: number \| null; validated: boolean; score: number \| null; }` |

## TECH-FRONTEND-I18N-101 — Langue, thème et formatage

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/i18n.ts`.

Entrées : texte, langue, thème ou valeur à formater. La traduction conserve le texte source sans traduction connue, les valeurs nulles sont traitées explicitement, et les pipes utilisent la locale active. Les changements valides demandent une mutation des paramètres ; les autres valeurs sont ignorées. Les fonctions de formatage Angular peuvent signaler une valeur invalide.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `I18n.t` | `source: string \| null \| undefined` | `string` |
| `I18n.setLanguage` | `language: string` | `Promise<boolean \| undefined>` |
| `I18n.setTheme` | `theme: string` | `Promise<boolean \| undefined>` |
| `I18n.save` | `value: { language?: Language; theme?: Theme }` | `Promise<boolean \| undefined>` |
| `I18n.color` | `source: string` | `string` |
| `TranslatePipe.transform` | `value: string \| null \| undefined` | `string` |
| `LocalDatePipe.transform` | `value: string \| number \| Date \| null \| undefined, format = "mediumDate"` | `string \| null` |
| `LocalNumberPipe.transform` | `value: number \| string \| null \| undefined, digits = "1.0-3"` | `string \| null` |

**Constructeur I18n** — Entrées : `aucun`. Le constructeur synchronise la présentation et le titre du document avec les signaux.

## TECH-FRONTEND-ICON-101 — Chemins des icônes

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/icon.ts`.

Entrée : identifiant d’icône ; sortie : chemin destiné au rendu SVG ou valeur de repli définie par le code. Aucun effet sur les données personnelles.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Icon.path` | `aucune` | `string` |

## TECH-FRONTEND-MODELS-101 — Instantané et données de démonstration

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/models.ts`.

Les fabriques construisent dates, identifiants et snapshot initial ; addDemo ajoute des données fictives à l’instantané fourni. La génération dépend de l’horloge et des API disponibles. La démonstration ne lit pas de données personnelles.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `today` | `aucune` | `string` |
| `uid` | `aucune` | `'${string}-${string}-${string}-${string}-${string}'` |
| `emptySnapshot` | `aucune` | `Snapshot` |
| `addDemo` | `s: Snapshot` | `Profile` |

## TECH-FRONTEND-PRESENTATION-101 — Préférences de présentation

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/presentation.ts`.

readPresentation lit uniquement langue et thème depuis le stockage navigateur, avec français et sombre comme repli en cas d’absence ou de JSON invalide. applyPresentation met à jour langue, thème et color-scheme du document puis tente leur mise en cache ; une erreur de stockage est ignorée, les paramètres natifs restant autoritaires.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `readPresentation` | `aucune` | `{ language: Language; theme: Theme; }` |
| `applyPresentation` | `value: { language: Language; theme: Theme }` | `void` |

## TECH-FRONTEND-STORE-101 — État et mutations du frontal

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/core/store.ts`.

Le service expose des signaux filtrés sur le profil actif. init charge l’état natif ou crée l’aperçu fictif ; les rafraîchissements externes sont sérialisés et appliqués uniquement aux révisions plus récentes. task et mutate gèrent l’état occupé et les erreurs, et délèguent les écritures natives aux commandes Tauri ; previewMutation adapte uniquement l’aperçu mémoire. Les séries et dernières mesures retournent les observations disponibles sans inventer de valeur.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Store.init` | `aucune` | `Promise<void>` |
| `Store.refreshFromDisk` | `aucune` | `Promise<void>` |
| `Store.drainRefreshes` | `aucune` | `Promise<void>` |
| `Store.select` | `id: string` | `void` |
| `Store.fail` | `e: unknown` | `void` |
| `Store.task` | `fn: () => Promise<T>` | `Promise<T \| undefined>` |
| `Store.mutate` | `operation: Mutation` | `Promise<boolean \| undefined>` |
| `Store.saveTarget` | `target: TargetDay` | `Promise<boolean \| undefined>` |
| `Store.apply` | `current: VersionedSnapshot` | `void` |
| `Store.latest` | `metric: string` | `Observation \| undefined` |
| `Store.series` | `metric: string` | `Observation[]` |
| `Store.metric` | `id: string` | `{ id: Metric; label: string; unit: string; icon: string; color: string; max: number; event?: boolean \| undefined; positive?: boolean \| undefined; valueLabel?: string \| undefined; integer?: boolean \| undefined; }` |
| `Store.previewMutation` | `op: Mutation` | `Snapshot` |

## TECH-FRONTEND-DASHBOARD-101 — Tableau de bord

Implémente REQ-FRONTEND-HABITS-101. Source : `src/app/pages/dashboard.ts`.

Les méthodes préparent les mesures, les hauteurs visuelles et la sélection d’événements, enregistrent un objectif uniquement si son formulaire est valide et contrôlent la lecture séquentielle des activités. Les minuteries de lecture sont arrêtées lors de la destruction. Les mutations et erreurs passent par le service d’état.

La courbe de pas, ses dates et son compteur partagent les mêmes observations du profil actif, limitées aux 28 dernières mesures. Le compteur affiche leur nombre réel (y compris une mesure déclarée à zéro), avec un libellé singulier ou pluriel traduit ; un historique vide affiche zéro mesure.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Dashboard.values` | `metric: string` | `number[]` |
| `Dashboard.barHeight` | `value: number \| null` | `number` |
| `Dashboard.saveTarget` | `aucune` | `Promise<void>` |
| `Dashboard.selectEvent` | `o: Observation` | `void` |
| `Dashboard.showEvent` | `o: Observation` | `void` |
| `Dashboard.previewMode` | `mode: string` | `void` |
| `Dashboard.replay` | `aucune` | `Promise<void>` |
| `Dashboard.next` | `aucune` | `void` |
| `Dashboard.stopReplay` | `aucune` | `void` |
| `Dashboard.ngOnDestroy` | `aucune` | `void` |

**Constructeur Dashboard** — Entrées : `aucun`. Le constructeur synchronise l’objectif lorsque le profil change sans écraser un formulaire modifié, et arrête la lecture lors d’un changement de profil.

## TECH-FRONTEND-DATA-101 — Assistant d’échange de données

Implémente REQ-FRONTEND-JOURNAL-101. Source : `src/app/pages/data.ts`.

Les méthodes exposent colonnes, échantillons et pagination de l’aperçu, puis choisissent, prévisualisent et confirment un import natif. L’export accepte le format demandé et le profil actif ; la restauration exige d’abord un aperçu puis une confirmation. Les commandes et leurs erreurs passent par Store.task ; une sélection annulée ne déclenche pas d’écriture.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `DataPage.headers` | `aucune` | `string[]` |
| `DataPage.sample` | `aucune` | `string[][]` |
| `DataPage.count` | `status: string` | `number` |
| `DataPage.previewRows` | `aucune` | `{ row: number; observation: Observation \| null; status: string; message: string; }[]` |
| `DataPage.previewPages` | `aucune` | `number` |
| `DataPage.cancelImport` | `aucune` | `void` |
| `DataPage.choose` | `aucune` | `Promise<void>` |
| `DataPage.preview` | `aucune` | `Promise<void>` |
| `DataPage.commit` | `aucune` | `Promise<void>` |
| `DataPage.export` | `format: string` | `Promise<void>` |
| `DataPage.restorePreview` | `aucune` | `Promise<void>` |
| `DataPage.restoreCommit` | `aucune` | `Promise<void>` |

**Constructeur DataPage** — Entrées : `aucun`. Le constructeur réinitialise l’import quand le profil actif change.

## TECH-FRONTEND-FUTURES-101 — Gestion des scénarios

Implémente REQ-FRONTEND-FUTURES-101. Source : `src/app/pages/futures.ts`.

reset et edit préparent le formulaire ; save refuse un formulaire invalide et demande une mutation, remove demande la suppression du scénario. Les changements sont appliqués via le service d’état ; ces fonctions ne valident ni ne calculent elles-mêmes un modèle scientifique.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Futures.reset` | `aucune` | `void` |
| `Futures.edit` | `s: Scenario` | `void` |
| `Futures.save` | `aucune` | `Promise<void>` |
| `Futures.remove` | `s: Scenario` | `Promise<void>` |

**Constructeur Futures** — Entrées : `aucun`. Le constructeur réinitialise le formulaire au changement de profil.

## TECH-FRONTEND-GHOSTVIEW-101 — Écran de comparaison horaire

Implémente REQ-FRONTEND-GHOST-101. Source : `src/app/pages/ghost.ts`.

Les entrées sont les dates, minutes, sélections et champs de routine fournis par l’utilisateur. Les méthodes contrôlent navigation, lecture, session active, liaison à une habitude et édition de blocs ; une sauvegarde de routine dans le passé est refusée. Les mutations passent par le service d’état et les erreurs remontent dans son signal. La lecture et les calculs restent séparés des écritures.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `GhostPage.slotStatus` | `status: string` | `string` |
| `GhostPage.mode` | `events: GhostEvent[]` | `Metric \| "idle"` |
| `GhostPage.stateLabel` | `events: GhostEvent[]` | `string` |
| `GhostPage.frequencyAt` | `minute: number` | `{ known: number; matched: number; total: number; }` |
| `GhostPage.changeDate` | `value: string` | `void` |
| `GhostPage.goLive` | `aucune` | `void` |
| `GhostPage.scrub` | `minute: number` | `void` |
| `GhostPage.selectEvent` | `event: GhostEvent` | `void` |
| `GhostPage.stop` | `aucune` | `void` |
| `GhostPage.togglePlayback` | `aucune` | `void` |
| `GhostPage.linkSession` | `id: string` | `void` |
| `GhostPage.linkBlock` | `id: string` | `void` |
| `GhostPage.start` | `aucune` | `Promise<void>` |
| `GhostPage.finish` | `aucune` | `Promise<void>` |
| `GhostPage.cancel` | `aucune` | `Promise<void>` |
| `GhostPage.recordPoint` | `aucune` | `Promise<void>` |
| `GhostPage.prepareChange` | `event: GhostEvent` | `void` |
| `GhostPage.newRoutine` | `aucune` | `void` |
| `GhostPage.loadRoutine` | `id: string` | `void` |
| `GhostPage.toggleDay` | `day: number, on: boolean` | `void` |
| `GhostPage.addBlock` | `aucune` | `void` |
| `GhostPage.removeBlock` | `id: string` | `void` |
| `GhostPage.saveRoutine` | `aucune` | `Promise<void>` |

**Constructeur GhostPage** — Entrées : `aucun`. Le constructeur lit la date initiale dans la route et initialise les effets et le nettoyage de la lecture.

## TECH-FRONTEND-HABITSVIEW-101 — Calendrier et réponses

Implémente REQ-FRONTEND-HABITS-101. Source : `src/app/pages/habits.ts`.

Les méthodes construisent l’affichage du calendrier et de la courbe, naviguent entre les mois et gèrent sélection, ajout, archivage, réponse et validation d’habitudes. Les mutations passent par le service d’état ; une journée ne reçoit un score validé que selon les règles du suivi.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Habits.x` | `index: number` | `number` |
| `Habits.y` | `score: number` | `number` |
| `Habits.icon` | `habit: HabitDefinition` | `string` |
| `Habits.answerFor` | `habit: HabitDefinition` | `boolean \| null` |
| `Habits.calendarLabel` | `date: string, status: string` | `string` |
| `Habits.moveMonth` | `delta: number` | `void` |
| `Habits.choosePreset` | `metric: string` | `void` |
| `Habits.addHabit` | `aucune` | `Promise<void>` |
| `Habits.archive` | `habit: HabitDefinition` | `Promise<void>` |
| `Habits.setAnswer` | `habit: HabitDefinition, value: boolean \| null` | `Promise<void>` |
| `Habits.validateDay` | `aucune` | `Promise<void>` |

**Constructeur Habits** — Entrées : `aucun`. Le constructeur suit la date et le profil pour maintenir la sélection du calendrier.

## TECH-FRONTEND-JOURNAL-101 — Saisie et correction des observations

Implémente REQ-FRONTEND-JOURNAL-101. Source : `src/app/pages/journal.ts`.

Les méthodes filtrent et paginent les observations du profil actif, configurent les validateurs temporels et préparent une saisie ou correction. save n’envoie une mutation que lorsque le formulaire est valide ; remove délègue la suppression au service. Les valeurs et erreurs de validation restent visibles dans le formulaire.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Journal.updateTimeValidators` | `aucune` | `void` |
| `Journal.currentMetric` | `aucune` | `{ id: Metric; label: string; unit: string; icon: string; color: string; max: number; event?: boolean \| undefined; positive?: boolean \| undefined; valueLabel?: string \| undefined; integer?: boolean \| undefined; }` |
| `Journal.filtered` | `aucune` | `Observation[]` |
| `Journal.pages` | `aucune` | `number` |
| `Journal.paged` | `aucune` | `Observation[]` |
| `Journal.reset` | `aucune` | `void` |
| `Journal.nowTime` | `aucune` | `string` |
| `Journal.choose` | `metric: Metric` | `void` |
| `Journal.edit` | `o: Observation` | `void` |
| `Journal.save` | `aucune` | `Promise<void>` |
| `Journal.remove` | `o: Observation` | `Promise<void>` |

**Constructeur Journal** — Entrées : `aucun`. Le constructeur réinitialise la saisie et synchronise les validateurs quand le profil ou la mesure change.

## TECH-FRONTEND-PROFILES-101 — Gestion des profils

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/pages/profiles.ts`.

Les méthodes comptent les données, initialisent ou remplissent le formulaire et demandent création, modification ou suppression. save n’envoie rien si le formulaire est invalide ; la mutation et ses erreurs sont gérées par Store. Les données sélectionnées restent rattachées à leur profil.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Profiles.count` | `id: string` | `number` |
| `Profiles.reset` | `aucune` | `void` |
| `Profiles.edit` | `p: Profile` | `void` |
| `Profiles.save` | `aucune` | `Promise<void>` |
| `Profiles.remove` | `p: Profile` | `Promise<void>` |

## TECH-FRONTEND-SETTINGS-101 — Préférences et service compagnon

Implémente REQ-FRONTEND-COMPANION-101. Source : `src/app/pages/settings.ts`.

Les méthodes chargent l’état du service compagnon natif, commandent son démarrage, arrêt, code d’appairage et révocation, et modifient les préférences. companionCommand capture les erreurs dans le signal de l’écran ; les valeurs présentées reflètent la réponse du service, pas un accès cloud.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `SettingsPage.ngOnInit` | `aucune` | `Promise<void>` |
| `SettingsPage.companionCommand` | `command: string, args?: Record<string, string>` | `Promise<void>` |
| `SettingsPage.startCompanion` | `aucune` | `void` |
| `SettingsPage.newPairingCode` | `aucune` | `void` |
| `SettingsPage.stopCompanion` | `aucune` | `void` |
| `SettingsPage.revokeCompanion` | `deviceId: string` | `void` |
| `SettingsPage.profileName` | `id: string` | `string` |
| `SettingsPage.value` | `key: keyof Pick<Settings, "animations" \| "jitter">` | `boolean` |
| `SettingsPage.toggle` | `key: keyof Pick<Settings, "animations" \| "jitter">, v: boolean` | `void` |

## TECH-FRONTEND-ANIMATION-101 — Chargement et animations des modèles

Implémente REQ-FRONTEND-SCENE-101. Source : `src/app/scene/artist-animations.ts`.

Le contrôleur lit le manifeste d’assets, charge les modèles et variantes, sélectionne les animations, actualise leur temps et adapte la couleur lorsque c’est possible. Les fonctions de destruction libèrent géométries, matériaux et textures possédés. Un chargement ou manifeste invalide est traité par les chemins de repli et erreurs du contrôleur ; ces données ne sont pas des mesures cliniques.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `isRecord` | `value: unknown` | `boolean` |
| `materialsIn` | `root: T.Object3D` | `Set<Material>` |
| `disposeModel` | `root: T.Object3D` | `void` |
| `ArtistAnimations.preload` | `modes: string[]` | `Promise<void>` |
| `ArtistAnimations.setVariant` | `variant: AvatarVariant` | `void` |
| `ArtistAnimations.setColor` | `color: string` | `void` |
| `ArtistAnimations.play` | `mode: string, replayKey: number, animate: boolean` | `void` |
| `ArtistAnimations.tick` | `seconds: number` | `void` |
| `ArtistAnimations.dispose` | `aucune` | `void` |
| `ArtistAnimations.readManifest` | `aucune` | `Promise<void>` |
| `ArtistAnimations.key` | `mode: string, variant: AvatarVariant` | `string` |
| `ArtistAnimations.load` | `mode: string, variant: AvatarVariant` | `Promise<void>` |
| `ArtistAnimations.loadModel` | `file: string` | `Promise<LoadedModel \| null>` |
| `ArtistAnimations.activate` | `asset: LoadedAnimation, restart: boolean` | `void` |
| `ArtistAnimations.clearActive` | `source: "loading" \| "procedural"` | `void` |
| `ArtistAnimations.colorShirt` | `scene: T.Object3D` | `void` |

**Constructeur ArtistAnimations** — Entrées : `root: T.Group, private readonly onSourceChange: (source: AvatarSource) => void, private readonly ghost = false`. Le constructeur attache le contrôleur d’animation au groupe fourni et conserve ses callbacks.

## TECH-FRONTEND-AVATAR-101 — Cycle de vie de l’avatar

Implémente REQ-FRONTEND-SCENE-101. Source : `src/app/scene/avatar.ts`.

Les méthodes initialisent la pièce après création de la vue, réessayent le rendu et ajustent zoom, rotation et cadrage en réponse aux commandes utilisateur ou clavier. Elles préchargent les modes disponibles et détruisent la scène à la fermeture ; les défaillances de rendu sont présentées dans l’état de la vue.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `AvatarScene.zoomPercent` | `aucune` | `number` |
| `AvatarScene.ngAfterViewInit` | `aucune` | `void` |
| `AvatarScene.createRoom` | `aucune` | `Promise<void>` |
| `AvatarScene.retry` | `aucune` | `void` |
| `AvatarScene.focusCamera` | `aucune` | `void` |
| `AvatarScene.zoomCamera` | `direction: number` | `void` |
| `AvatarScene.resetCamera` | `aucune` | `void` |
| `AvatarScene.cameraKey` | `event: KeyboardEvent` | `void` |
| `AvatarScene.prepareModes` | `modes: string[]` | `Promise<void>` |
| `AvatarScene.ngOnDestroy` | `aucune` | `void` |

**Constructeur AvatarScene** — Entrées : `aucun`. Le constructeur synchronise les options de la scène avec les signaux de la vue.

## TECH-FRONTEND-GHOSTTIMELINE-101 — Présentation de la chronologie

Implémente REQ-FRONTEND-GHOST-101. Source : `src/app/scene/ghost-timeline.ts`.

Les méthodes calculent une largeur et une description à partir des données d’événement et des paramètres de la vue. La sortie sert à l’affichage et à son libellé accessible ; aucune mutation de l’historique.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `GhostTimeline.width` | `e: GhostEvent` | `number` |
| `GhostTimeline.description` | `e: GhostEvent` | `string` |

## TECH-FRONTEND-ROOM-101 — Rendu Three.js et ressources

Implémente REQ-FRONTEND-SCENE-101. Source : `src/app/scene/room.ts`.

Le contrôleur construit la pièce, les accessoires et l’avatar, anime les poses et met à jour les éléments fantômes. Les paramètres de caméra et les dimensions pilotent le rendu ; invalidation et visibilité déterminent les images à calculer. dispose annule le rendu et libère les ressources possédées ; la perte du contexte est signalée à la vue. Les opérations graphiques dépendent de WebGL.

| Déclaration | Entrées déclarées | Sortie TypeScript |
| --- | --- | --- |
| `Room.emitCameraState` | `aucune` | `void` |
| `Room.requestFrame` | `aucune` | `void` |
| `Room.invalidate` | `aucune` | `void` |
| `Room.cancelFrame` | `aucune` | `void` |
| `Room.onVisibility` | `aucune` | `void` |
| `Room.onLost` | `e: Event` | `void` |
| `Room.box` | `w: number, h: number, d: number, color: number \| string, x: number, y: number, z: number, parent: T.Object3D = this.root` | `Mesh<BoxGeometry, MeshLambertMaterial, Object3DEventMap>` |
| `Room.buildRoom` | `aucune` | `void` |
| `Room.buildPerson` | `aucune` | `void` |
| `Room.buildActivityProps` | `aucune` | `void` |
| `Room.addVapor` | `parent: T.Group, color: number, height: number` | `void` |
| `Room.setActivityProps` | `mode: string` | `void` |
| `Room.update` | `o: typeof this.options` | `void` |
| `Room.setGhost` | `mode: string \| null, variant: AvatarVariant, animations: boolean` | `void` |
| `Room.preloadModes` | `modes: string[]` | `Promise<void>` |
| `Room.zoomCamera` | `direction: number` | `void` |
| `Room.rotateCamera` | `horizontal: number, vertical: number` | `void` |
| `Room.resetCamera` | `aucune` | `void` |
| `Room.resize` | `aucune` | `void` |
| `Room.tick` | `ms: number` | `void` |
| `Room.armPose` | `i: number` | `number` |
| `Room.armZPose` | `_i: number` | `number` |
| `Room.legPose` | `_i: number` | `number` |
| `Room.dispose` | `aucune` | `void` |

**Constructeur Room** — Entrées : `private host: HTMLElement, private onUnavailable: () => void, private onAnimationSource?: (source: AvatarSource) => void, private onCameraState?: (state: CameraState) => void, private onGhostSource?: (source: AvatarSource) => void`. Le constructeur reçoit le conteneur et les callbacks de la scène, crée le rendu WebGL, installe les contrôles, observateurs et écouteurs. Il peut échouer lors de la création du contexte graphique.

## TECH-FRONTEND-APP-101 — Initialisation de l’interface

Implémente REQ-FRONTEND-PROFILE-101. Source : `src/app/app.ts`.

Le constructeur du composant racine déclenche `Store.init` ; le chargement et ses erreurs sont gérés par le service. Il ne reçoit aucun paramètre et ne retourne aucune valeur métier.
