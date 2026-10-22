# Design système et régression visuelle

Storybook utilise les styles de l’application et ses composants Angular réels. Les stories ne sont pas empaquetées dans Tauri. Les dépendances sont verrouillées ; la télémétrie Storybook et les rapports de crash sont désactivés. Aucun compte Chromatic n’est requis. Les tests utilisent des données fictives ; la CI conserve uniquement leurs rapports et captures en cas d’échec.

## Utiliser le catalogue

- `npm run storybook` : serveur local sur http://127.0.0.1:6006, sans ouverture automatique du navigateur.
- `npm run build:storybook` : catalogue statique dans `storybook-static/` (ignoré par Git).
- Barres d’outils : thèmes sombre/clair, français/anglais et résolutions de référence. Les contrôles permettent de modifier les arguments des composants. Onglet Docs pour le contrat et les exemples ; onglet Accessibility pour l’audit local.

La palette est dans `src/design-system/tokens.css`, importée une seule fois par `src/styles.css`. Les valeurs existantes ont été conservées. Les alias sémantiques `--ds-background`, `--ds-text`, `--ds-surface` et les espacements évitent de recopier des valeurs dans les exemples. Les styles globaux servent au catalogue comme à l’application.

`UiButton` habille les boutons et liens natifs ; il est utilisé par le tableau de bord. `MetricCard` est le composant de dernière mesure du tableau de bord. Les icônes et courbes réutilisent les composants du dossier core. Les formulaires, messages et états vides illustrent les mêmes classes CSS que les pages.

Les stories ne chargent pas le Store réel : seul un fournisseur de préférences en mémoire alimente les traductions. Les valeurs, dates et historiques sont fictifs, et aucun appel Tauri n’est exécuté. Ne pas ajouter de sauvegarde personnelle aux fixtures ou aux captures.

## Résolutions de référence

Le sélecteur de viewport de Storybook propose les formats suivants pour les aperçus des composants. Les dimensions sont exprimées en pixels CSS, largeur × hauteur, et partagées avec Playwright dans `config/viewports.ts`.

| Format          | Largeur | Hauteur |
| --------------- | ------: | ------: |
| iPhone 16 Pro   |  402 px |  874 px |
| iPad Pro 11″    |  834 px | 1194 px |
| MacBook Pro 14″ | 1512 px |  982 px |
| Desktop         | 1920 px | 1080 px |

Choisir un format dans la barre d’outils de l’onglet Canvas ; « Reset viewport » revient à la taille disponible. Agrandir la fenêtre ou masquer le panneau des contrôles si le Canvas disponible limite la hauteur. Playwright applique ces dimensions de viewport indépendamment de la fenêtre Storybook. Les PNG de page entière peuvent être plus hauts que le viewport car ils comprennent le contenu sous la ligne de flottaison.

## Vérifier les images

Installer le navigateur une fois : `npx playwright install chromium`. Puis lancer `npm run test:visual` : compilation de la documentation, de l’application et de Storybook, serveurs statiques locaux sur les ports 4175, 1423 et 6107, comparaison des PNG. Les serveurs sont arrêtés par Playwright après le test. `--skip-build` permet de réutiliser les trois builds après une modification de test uniquement.

Les stories portant le tag `visual` sont découvertes depuis l’index construit : chaque nouvelle story est couverte automatiquement, dans les deux thèmes. La matrice couvre les huit routes en français/anglais, clair/sombre et aux quatre résolutions de référence : 128 combinaisons. Les références françaises à 960 et 1440 px, trois routes anglaises supplémentaires à 1440 px et le focus clavier restent conservés. L’accueil et le démarrage de la documentation ajoutent 32 combinaisons ; navigation, changement de langue et recherche locale sont vérifiés dans les deux langues. L’application est lancée en démonstration navigateur, avec une date fixe, animations arrêtées et canvas GPU masqué uniquement dans les captures ; aucune base native n’est ouverte. Les commandes de caméra et les légendes restent visibles dans les références. Le rendu 3D, ses clips, la perte de contexte et le réessai sont vérifiés par les tests fonctionnels sans masquage. Les tests des quatre formats refusent tout débordement horizontal global ; les tableaux peuvent défiler dans leur propre conteneur.

Les captures sont classées dans `tests/visual/__screenshots__/win32/chromium/` par catégorie, viewport, langue et thème : `application/<viewport>/<langue>/<thème>/<page>.png`, `storybook/<viewport>/<langue>/<thème>/<story>.png` et `documentation/<viewport>/<langue>/<thème>/<page>.png`. Les viewports de référence gardent leur nom et leurs dimensions, par exemple `ipadpro11-834x1194` ou `desktop-1920x1080`; les captures historiques utilisent `960x1000` et `1440x1000`. Chromium provient de la version Playwright verrouillée, avec une échelle de 1, le fuseau Europe/Paris et des dimensions fixes. Les références sont propres à l’OS ; Linux ou macOS demandent leurs propres captures. La CI visuelle cible Windows Server 2022 ; une différence de police ou de rendu système doit être examinée, pas masquée en augmentant la tolérance.

Une capture autorise au plus 100 pixels différents avec un seuil de couleur de 0,15. Les données et animations sont stabilisées ; les cartes, formulaires et graphiques ne sont pas masqués. Les requêtes vers un serveur externe sont bloquées et font échouer le test. Les erreurs JavaScript font également échouer le test.

## Accepter un changement volontaire

1. Exécuter les tests et ouvrir `npm run test:visual:report` pour comparer attendu, obtenu et différence.
2. Corriger les défauts involontaires.
3. Sur Windows, lancer `npm run test:visual:update` uniquement pour le changement voulu ; ajouter un filtre `-- --grep ...` pour limiter les captures concernées. Pour les nouvelles références des quatre formats : `-- --grep "devices /" --update-snapshots=missing` ; pour la documentation : `-- --grep "docs /" --update-snapshots=missing`.
4. Inspecter les PNG modifiés, relancer `npm run test:visual`, puis commiter code et références ensemble.

Avec Playwright 1.58, la création d’une référence absente via `--update-snapshots=missing` écrit le PNG mais signale un échec lors de ce premier passage. Inspecter le fichier créé puis relancer la comparaison sans mise à jour ; la création seule ne valide pas la régression.

La CI refuse la création ou la mise à jour de références. Sur échec, elle conserve le rapport HTML, les images obtenues/différences et les traces pendant 14 jours. Ce job ne publie aucun Storybook. Ne pas augmenter la tolérance pour faire passer un changement non inspecté.

Sources de configuration : [Storybook Angular](https://storybook.js.org/docs/get-started/frameworks/angular) et [comparaisons visuelles Playwright](https://playwright.dev/docs/test-snapshots).
