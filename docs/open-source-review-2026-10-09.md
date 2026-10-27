# Préparation de la publication open source — 9 octobre 2026 {#open-source-publication-2026-10-09}

**Suivi du 9 octobre :** les points npm, parseur XML et contrôles avant chargement sont traités dans les [correctifs de dépendances et d’import](./dependency-import-hardening.md). Les constats ci-dessous décrivent l’état du commit audité.

**Suivi du 27 octobre :** le workflow GitHub Actions a été retiré ; les vérifications et la construction des paquets se font localement. Les mentions de CI ci-dessous décrivent la configuration historique.

Revue du commit `ca8eca2`, arbre propre au démarrage : 404 fichiers suivis, environ 38,7 Mo et 14 commits accessibles. Périmètre : licences, assets, historique Git, dépendances, entrées de fichiers, CI et documentation. Aucun code métier, asset, licence ou historique Git modifié par cette revue.

**Publication à différer jusqu’à clarification des licences et traitement des dépendances exposées.** Le suivi local des habitudes peut être présenté comme une alpha ; les projections scientifiques restent désactivées. Publier les sources et distribuer un installateur final ont des critères distincts.

## Corrections prioritaires {#priority-fixes}

### P1 — Définir la licence du code et son périmètre {#code-license}

Aucun fichier `LICENSE`, `COPYING` ou `NOTICE` dans les fichiers suivis. `package.json` et `src-tauri/Cargo.toml` ne définissent pas de licence. Un dépôt visible publiquement ne suffit pas à autoriser les usages attendus d’un projet open source. Voir la [documentation GitHub sur les licences](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

Choisir explicitement une licence, ajouter son texte, identifier le titulaire des droits et renseigner les identifiants SPDX des manifestes. Expliquer dans le README le traitement distinct du code, de la documentation et des assets tiers. Inventorier les notices nécessaires avant de distribuer les binaires ou les sites construits ; les licences des dépendances ne remplacent pas celle du projet. Le champ npm `private: true` peut rester : il bloque une publication npm accidentelle, pas un dépôt public.

### P1 — Établir les droits des personnages et textures {#asset-rights}

`art/avatar/README.md:3–9` décrit les fichiers fournis, sans auteur, URL d’origine, licence ou preuve de permission de redistribution. Cela concerne `male_casual.fbx`, `character-texture.png`, `female_secretary.fbx` et `secretary_tex.png`, leurs fichiers Blender et leurs exports GLB sous `public/avatar/character/`. Les empreintes SHA-256 prouvent leur identité, pas leurs droits.

Obtenir la provenance et les conditions de redistribution, puis ajouter un inventaire par asset : auteur, source, licence, modifications et attribution requise. Si les droits restent inconnus, remplacer ou retirer les originaux **et leurs dérivés**. Les anciens fichiers étant dans l’historique, supprimer seulement la version actuelle ne suffit pas pour publier cet historique. Une éventuelle préparation d’un historique assaini doit être décidée séparément ; aucune réécriture n’a été effectuée ici. Ce constat ne présume pas que les fichiers sont illicites.

### P1 — Traiter les alertes npm avant d’ouvrir les outils aux contributeurs {#npm-advisories}

`npm audit --json` du 9 octobre signale **21 paquets** : 3 critiques, 14 élevés et 4 modérés. Ces nombres incluent les parents transitifs d’une même alerte ; ce ne sont pas 21 failles indépendantes. La plupart sont des dépendances de développement.

| Chemin verrouillé                                              | Constat                                                                                                                                  | Suite à donner                                                                                                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Angular CLI/build 22.1.x → `piscina 5.2.0`                     | [Alerte de pollution de prototype](https://github.com/advisories/GHSA-67c8-pqhq-4rmx), classée critique par l’audit                      | Mise à jour compatible de la chaîne Angular, avec builds et tests ; aucune exploitation démontrée dans ce projet                                                                           |
| VitePress 1.6.4 → Vite 5.4.21                                  | Alertes de serveur de développement, dont [contournement Windows de `server.fs.deny`](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | Trouver une combinaison VitePress/Vite corrigée et compatible ; les serveurs actuels écoutent sur loopback et ne doivent pas être exposés au réseau                                        |
| Storybook → `webpack-dev-middleware 6.1.3` ; autre copie 8.0.3 | [Alerte de traversée de chemins](https://github.com/advisories/GHSA-g84c-rxfj-3j2c)                                                      | Résoudre la dépendance compatible et vérifier les conditions de `publicPath`, puis reconstruire le catalogue                                                                               |
| `@angular/router 22.1.7`                                       | Seule alerte avec `npm audit --omit=dev`                                                                                                 | [Alerte SSR](https://github.com/advisories/GHSA-ff3f-86qr-9cv3) : le projet utilise un client Angular avec routes hash, sans SSR ; ce chemin n’est pas exposé dans l’architecture actuelle |

Ne pas lancer `npm audit fix --force` sans examen : l’audit suggère notamment une ancienne version majeure de Storybook et ne propose pas de correction automatique compatible pour VitePress. Mettre à jour par groupes cohérents, inspecter les résultats et documenter les alertes restantes avec leur applicabilité. `.npmrc:3` désactive l’audit automatique ; la CI ne contient pas de contrôle de dépendances dédié.

### P1 — Corriger le lecteur XML utilisé par les imports Excel {#rust-xml-advisories}

Le contrôle OSV de 475 versions crates.io du lockfile retrouve `quick-xml 0.39.4`, dépendance de `calamine 0.34.0`, dans le graphe Windows. [RUSTSEC-2026-0194](https://rustsec.org/advisories/RUSTSEC-2026-0194.html) décrit une vérification d’attributs XML de coût quadratique, corrigée à partir de 0.41.0. Les appels d’attributs avec vérification par défaut sont présents dans le lecteur XLSX de Calamine ; l’application appelle ce lecteur dans `src-tauri/src/exchange.rs:100`.

Mettre à jour Calamine et son parseur vers une combinaison corrigée, puis tester les imports avec une fixture de taille et de coût bornés. Aucune charge destinée à bloquer le poste n’a été exécutée.

La même version est signalée pour [RUSTSEC-2026-0195](https://rustsec.org/advisories/RUSTSEC-2026-0195.html), qui concerne `NsReader`. Aucun usage de `NsReader` n’a été trouvé dans ce chemin Calamine : cette seconde alerte n’est pas présentée comme une exploitation démontrée. Les cinq alertes `unic-*` retrouvées dans le graphe Windows indiquent des paquets non maintenus ; ce ne sont pas cinq nouvelles vulnérabilités prouvées. Les alertes GLib et `proc-macro-error` du lockfile ne sont pas dans le graphe Windows vérifié.

## Durcissement avant une alpha publique {#public-alpha-hardening}

### P2 — Borner les imports avant les allocations {#import-bounds}

`exchange.rs:60` borne la taille du fichier à 25 Mo, puis `worksheet_range`, ligne 102, matérialise la feuille **avant** le contrôle des dimensions ligne 103. Dans Calamine 0.34.0, `Range::from_sparse` alloue une grille à partir de l’étendue des cellules. Un petit XLSX compressé ou une feuille très creuse peut donc réclamer bien plus de mémoire que sa taille sur disque. Le nombre de feuilles et le volume décompressé total n’ont pas de limite explicite dans ce parcours.

Ajouter un contrôle préalable du budget décompressé, des entrées et des étendues de cellules ; définir un budget cumulé pour le classeur. Prévoir un traitement isolé avec une interruption effective pour les parsers non coopératifs. Le constat vient du code et des sources de la dépendance, pas d’un test d’épuisement mémoire sur ce poste. Les rejets transactionnels existants protègent l’état écrit, sans empêcher l’allocation préalable.

### P2 — Ajouter les règles de contribution et de sécurité {#community-and-security}

Aucun `CONTRIBUTING.md`, `SECURITY.md`, modèle d’issue/PR ou configuration Dependabot/Renovate n’est suivi. Décrire les commandes de validation, la cible Windows, les fixtures fictives et le protocole de mise à jour des captures. Prévoir un canal privé de signalement avec un contact réel et des versions prises en charge ; ne pas inviter à joindre des sauvegardes personnelles dans des issues publiques. Ajouter une politique de contribution et un code de conduite selon l’organisation du projet.

Dans `.github/workflows/windows.yml`, les permissions du jeton ne sont pas explicites et les actions sont référencées par tags. Déclarer les permissions nécessaires, épingler les actions par SHA et automatiser leurs mises à jour ; GitHub [recommande l’épinglage par SHA](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats). Ajouter un contrôle de secrets de l’historique, les audits npm/Rust et `npm run check:avatar`. Les paramètres distants de protection de branche, de secrets et l’état des jobs GitHub n’ont pas pu être vérifiés ici.

### P2 — Adapter l’accueil du dépôt à un clone neuf {#new-clone-documentation}

`README.md:9–15` annonce des paquets disponibles dans `release/`, mais ce dossier est ignoré et absent des fichiers suivis. Indiquer des liens GitHub Releases vérifiés si ces paquets existent, ou présenter la compilation depuis les sources. Ne pas annoncer les artefacts locaux comme disponibles dans un clone.

La capture `docs/native-dashboard.png` montre encore l’ancienne identité avec losange, alors que le code actuel l’a supprimée. La remplacer par une capture fictive actuelle et ajouter un résumé d’installation/limites en anglais directement accessible depuis le README. Les guides VitePress FR/EN, Storybook et les captures des quatre formats sont déjà en place.

## Travaux qui peuvent suivre la publication des sources {#after-source-publication}

- Indexer les recherches d’import : `exchange.rs:452` parcourt toutes les observations pour chaque ligne. La complexité augmente avec les lignes existantes et entrantes.
- Remplacer les écritures complètes : `store.rs:29–37` et `store.rs:120` traitent tout le snapshot pour une mutation courante. Les transactions et révisions protègent les conflits ; le problème restant est la montée en charge.
- Extraire les éditeurs Target et mapping/import des grandes pages Angular, réutiliser les composants réels dans Storybook et vérifier la parité des contrats Rust/TypeScript. Voir la [revue des refactorings](./refactoring-review-2026-10-07.md).
- Réexaminer les métadonnées et chemins absolus des sources Blender pour leur portabilité. La recherche textuelle de l’historique n’a pas trouvé de chemin utilisateur personnel ; les chemins de travail retrouvés dans les Blender ne sont pas présentés comme des secrets.

Ces refactorings ne justifient pas une réécriture générale avant une première publication.

## Critères distincts pour distribuer les installateurs {#installer-release}

Avant une release Windows annoncée comme prête : reconstruire les paquets au commit publié, donner version, empreintes et notices, vérifier installation/mise à jour/désinstallation dans une VM Windows 11 sans réseau, et décider de la signature des binaires. Les paquets locaux décrits sont non signés et n’ont pas été reconstruits pour les changements récents. La CI assemble le paquet standard, sans test de VM ni assemblage hors ligne dans ce workflow.

L’absence de chiffrement applicatif est documentée : la protection dépend de la session Windows et de l’accès aux fichiers. Elle doit rester visible dans les communications. Ce n’est pas un défaut de licence ni un motif imposant d’ajouter un cloud. Les projections scientifiques peuvent rester désactivées dans une alpha open source ; leur activation reste soumise aux critères de la [fiche modèle](./model-card.md).

## Vérifications et limites {#review-validation}

- Arbre propre au début de la revue ; 404 fichiers suivis. Aucun fichier de base SQLite ou nom de fichier de credentials reconnu parmi les fichiers suivis.
- 289 blobs textuels distincts dans l’historique accessible examinés avec des motifs de jetons GitHub/OpenAI/AWS, clés privées et affectations de credentials : aucun résultat. Ce contrôle heuristique ne remplace pas Gitleaks/TruffleHog, ne prouve pas l’absence de secrets dans les binaires et ne couvre pas un historique distant inaccessible.
- Capture du README inspectée : démonstration explicitement fictive. Métadonnées Blender examinées par motifs ; aucune donnée personnelle ouverte.
- Audits npm complets et production exécutés ; OSV interrogé avec uniquement les noms et versions des dépendances publiques. Graphe Cargo résolu pour `x86_64-pc-windows-msvc` afin de distinguer les alertes hors cible. Ce contrôle n’est pas une analyse d’exploitabilité exhaustive ni un audit Cargo complet avec politique de licences.
- `cargo test --locked --offline --manifest-path src-tauri/Cargo.toml` : **22 tests réussis** lors de cette revue. La dernière chaîne visuelle au même commit applicatif comptait **220 tests réussis**, et les sept tests de présentation étaient réussis avant cette revue ; la suite native/UI complète et une VM vierge ne sont pas relancées ici.
- Documentation de cette revue : formatage, typage, parité des **12 pages par langue** et build VitePress réussis ; **34 tests Playwright de documentation réussis**, sans mise à jour des références visuelles.
- Les seuls changements de cette revue sont les deux pages de rapport et leur entrée de navigation. Aucune correction de dépendance, choix de licence, remplacement d’asset, réécriture Git ou publication effectués.
