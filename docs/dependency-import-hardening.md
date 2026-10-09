# Dépendances et limites d’import — 9 octobre 2026 {#dependency-import-hardening}

Cette page décrit les corrections des points npm, parseur XML et limites d’import de la [revue open source](./open-source-review-2026-10-09.md). Elle ne règle pas les droits des assets ni le choix de licence du projet.

## Dépendances corrigées {#updated-dependencies}

- Angular, compilateur et outils de build : **22.2.2**. Les versions directes sont exactes et les dépendances transitives sont verrouillées.
- VitePress reste en version stable **1.6.4**, avec une substitution ciblée vers **Vite 6.4.4**. Son ancien Vite 5 présentait les alertes Windows du serveur de développement. Le plugin Vue 5 prend en charge Vite 6 ; la compatibilité du site est vérifiée par build et tests Playwright.
- Storybook reste en version stable **10.6.1**. Son builder Webpack utilise **webpack-dev-middleware 7.4.6** via une substitution ciblée, pour éviter la version 6 vulnérable. Les builds et le serveur de développement doivent être validés lors des mises à jour.
- Calamine : **0.36.1**, avec la fonctionnalité `chrono` ; **quick-xml 0.41.0**, corrigé pour [RUSTSEC-2026-0194](https://rustsec.org/advisories/RUSTSEC-2026-0194.html) et RUSTSEC-2026-0195. ZIP 8.6.0 est utilisé pour le contrôle préalable des XLSX.

Le 9 octobre, l’audit npm ne retourne plus d’alerte. La requête OSV sur les nouvelles versions Calamine, quick-xml, ZIP, atoi_simd et csv-core ne retourne pas d’avis. Cela ne remplace pas une analyse de tous les composants ni les tests de compatibilité.

### Correctif local de braces {#local-braces-patch}

Aucun correctif npm publié pour [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) n’était disponible. `vendor/braces` conserve la source 3.0.3 et sa licence MIT, avec un correctif local `3.0.3-me-sim.1`. Le fichier `PATCH.md` donne la provenance, l’empreinte de l’archive, le détail des changements et la condition de retrait.

La copie est une dépendance de développement locale ; la substitution `$braces` impose cette même copie à tous les consommateurs. Le parsing refuse les chaînes imbriquées au-delà de 64 blocs. Compile, expand et stringify valident les AST de façon itérative avant leurs parcours récursifs : profondeur 128, 131 072 nœuds et refus des cycles. Les options utilisateur ne peuvent pas relever ces limites.

**Un audit npm propre ne valide pas un paquet local.** Les tests vérifient le paquet réellement résolu, son consommateur micromatch, les motifs ordinaires, les plages, l’échappement, les chaînes profondes et les AST fournis directement. Remplacer le correctif local par une version upstream corrigée après revue et validation ; ne pas supprimer la substitution sans vérifier tous les chemins transitifs.

## Contrôles avant les allocations Excel {#preallocation-checks}

Le fichier est lu une seule fois dans un snapshot limité à 25 Mio, avec une lecture bornée en plus du contrôle de métadonnées. Le même contenu est utilisé pour les contrôles puis le parsing ; un remplacement du fichier sur disque ne permet pas de contourner les limites.

| Ressource                                      | Limite                       |
| ---------------------------------------------- | ---------------------------- |
| Fichier brut                                   | 25 Mio                       |
| Lignes de tableau                              | 50 000 mesures + en-tête     |
| Colonnes                                       | 256 dans tous les formats    |
| Feuilles Excel                                 | 16                           |
| Étendue d’une grille                           | 500 010 cellules par feuille |
| Grilles et cellules du classeur                | 1 000 020 cellules cumulées  |
| Texte contrôlé, y compris références partagées | 32 Mio                       |
| Texte d’une cellule                            | 256 Kio                      |
| Enregistrement CSV                             | 1 Mio                        |
| Entrées ZIP                                    | 512                          |
| Une entrée décompressée / toutes les entrées   | 32 Mio / 64 Mio              |
| Événements XML ou enregistrements BIFF         | 1 000 000                    |
| Profondeur XML / attributs par élément         | 64 / 64                      |

Les coordonnées Excel sont contrôlées, pas seulement la dimension déclarée. Les limites portent sur l’étendue réelle entre la première et la dernière cellule utilisée : une petite table située loin de A1 reste acceptée. Un fichier très creux peut être refusé même avec peu de cellules remplies si leur écart impose une grande grille. Diviser le fichier ou exporter une plage compacte.

- **XLSX :** le répertoire ZIP est contrôlé avant la création de ses métadonnées : nombre d’entrées, tailles, doublons et budgets cumulés. La lecture décompressée est également bornée et confrontée à la taille déclarée. Les XML contrôlent dimensions, coordonnées explicites/implicites, formules, profondeur, attributs et compteurs susceptibles de déclencher des réservations. Le coût des textes partagés est compté à chaque référence, y compris les entités XML. ZIP64, archives chiffrées, DTD et encodages XML autres qu’UTF-8/ASCII sont refusés.
- **XLS :** un lecteur CFB validé lit le flux Workbook de façon bornée. Le contrôle BIFF vérifie les dimensions, les cellules, les textes partagés et leurs continuations avant les allocations Calamine. Un conteneur CFB canonique est reconstruit uniquement en mémoire, sans macros ni chaînes FAT issues du fichier original. Le fichier source n’est pas modifié.
- **CSV :** csv-core parcourt les données avec des buffers fixes avant la création des enregistrements. Les champs entre guillemets, séparateurs intégrés et retours à la ligne sont conservés ; les colonnes, champs, lignes et cellules sont bornés.
- **JSON tabulaire :** un visiteur sans collecte vérifie les objets plats et les quotas avant la construction du tableau de valeurs. Les structures imbriquées sont refusées. La restauration complète reste une procédure distincte.

Ces contrôles bornent les données et les allocations connues ; ils ne constituent pas une limite matérielle de mémoire du processus ni un délai d’exécution interruptible. Les fichiers refusés n’atteignent pas la transaction d’import. Les parsers ne sont pas présentés comme sûrs pour toute entrée imaginable.

## Validation et entretien {#validation-and-maintenance}

```powershell
npm ci
npm run check:dependencies
npm run build
npm run docs:build
npm run build:storybook
npm run test:visual -- --skip-build
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

`check:dependencies` exécute l’audit puis les tests du correctif local ; la CI Windows l’exécute après `npm ci`. Les tests Rust couvrent les cas de référence existants et les limites : fichiers creux, grilles cumulées, répertoire ZIP falsifié, doublons, tailles incohérentes, texte partagé amplifié, entités XML, formules, champs CSV surdimensionnés, objets JSON imbriqués et continuations SST XLS. Les fixtures sont fictives et bornées ; aucun épuisement mémoire n’est provoqué sur le poste.

Validation locale du 9 octobre : installation propre avec `npm ci`, audit npm sans alerte, 5 tests du correctif braces, 40 tests Rust, 48 tests fonctionnels Playwright et 220 tests visuels réussis, sans modification des captures de référence. Les builds Angular, Storybook, VitePress et natif Windows (debug) réussissent. Les serveurs de développement Angular, VitePress et Storybook ont également été vérifiés.

Les captures de référence ne doivent pas être régénérées pour masquer un changement visuel dû aux dépendances. Revoir les substitutions à chaque mise à jour de VitePress/Storybook et conserver les tests du correctif tant qu’il est utilisé.
