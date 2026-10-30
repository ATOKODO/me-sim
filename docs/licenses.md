# Licences et crédits {#licences}

## Projet et contributions {#projet}

Le code et la documentation propres à Me-Sim sont sous **AGPL-3.0-only**. Voir `LICENSE` et `CREDITS.md` à la racine. Les dépendances et ressources tierces conservent leurs conditions. La licence ne porte pas sur les données personnelles des utilisateurs.

Les contributions externes et pull requests ne sont pas acceptées pour le moment. Les droits de cloner, forker, modifier et redistribuer le code restent accordés selon sa licence. Voir `CONTRIBUTING.md` à la racine.

## Personnages de Vinrax {#modeles}

Les pages [PSX Female Secretary Character](https://vinrax.itch.io/psx-secretary-character) et [PSX Casual Male Character](https://vinrax.itch.io/psx-casual-male-character), vérifiées le 30 octobre 2026, autorisent l’utilisation dans des projets avec crédit. `CREDITS.md` conserve la formulation publiée et identifie les FBX, textures, dérivés Blender/GLB et rendus. Les animations, accessoires et conversions sont des ajouts Me-Sim. Ces modèles ne sont pas replacés sous AGPL. Le build embarque licence, crédits et inventaire dans `legal/`.

La permission publiée ne précise pas explicitement la redistribution des originaux éditables dans un dépôt public ni leur sous-licence. La provenance et l’usage avec crédit sont établis ; demander une clarification à Vinrax avant de considérer ces autres droits comme confirmés. Aucun contact ni changement d’historique n’a été effectué.

## Compatibilité des dépendances {#dependances}

Revue du 30 octobre 2026 : **1 187 entrées npm** du lockfile (développement et plateformes optionnelles compris) et **318 paquets Cargo du graphe Windows x64**, construction comprise. Aucune déclaration de licence absente n’a été trouvée. Les manifestes installés sont utilisés quand disponibles ; les plateformes npm absentes reposent sur les métadonnées du lockfile. Ce périmètre n’est pas la composition exacte d’un binaire. Inventaire versionné : `licenses/dependencies.json`, sans chemin personnel du poste.

| Groupe | Conclusion et conditions |
| --- | --- |
| MIT, ISC, BSD, Apache-2.0, 0BSD, Zlib, BSL-1.0, BlueOak-1.0.0 | Pas d’incompatibilité identifiée avec AGPLv3 dans les déclarations examinées. Conserver les licences, copyrights, attributions et NOTICE applicables. OR permet une branche compatible ; AND impose toutes les conditions. |
| MPL-2.0 | 14 entrées npm, notamment axe-core et Lightning CSS (outillage), et 5 crates : cssparser 0.36.0, cssparser-macros 0.6.1, dtoa-short 0.3.5, option-ext 0.2.0, selectors 0.36.1. Les sources Rust examinées ne portent pas le marqueur d’exclusion des licences secondaires. La section 3.3 permet l’association avec AGPLv3 sous ses conditions : préserver les notices, fournir les sources avec les droits MPL et les droits secondaires lorsqu’applicables. Ne pas supprimer la MPL des composants tiers. |
| CC-BY-4.0 | caniuse-lite, données de l’outillage : conserver l’attribution et les indications de modification si ces données sont redistribuées. |
| Python-2.0 | argparse 2.0.1, outil de développement : le texte PSF fourni distingue les anciennes versions Python incompatibles. Ne pas confondre l’identifiant SPDX avec la version de Python. |
| Unicode-3.0, CC0-1.0, Unlicense | Préserver les notices et permissions selon leurs textes ; aucune incompatibilité identifiée dans ce périmètre. |

Références primaires : [MPL, sections 1.12 et 3.3](https://www.mozilla.org/en-US/MPL/2.0/), [FAQ Mozilla](https://www.mozilla.org/en-US/MPL/2.0/FAQ/), [liste des licences GNU](https://www.gnu.org/licenses/license-list.html), [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html).

**Aucune incompatibilité de licence identifiée pour les dépendances examinées, sous réserve de leurs obligations.** Ce contrôle des déclarations et cas particuliers n’est pas une certification juridique ni un audit de chaque fichier amont. Certains paquets Cargo n’incluent pas de licence à leur racine : retrouver leurs notices amont avant une distribution binaire. L’inventaire n’est pas un recueil complet de notices pour installateur. Les autres plateformes Cargo restent à examiner.

## Contrôle local et distribution {#controle}

Après installation des dépendances verrouillées et mise en cache des crates :

```powershell
npm run licenses:inventory
npm run licenses:check
```

La génération utilise les manifestes locaux et `cargo metadata --locked --offline` pour Windows ; elle ne téléverse pas le graphe. Le contrôle refuse une déclaration absente, une version installée différente du lockfile ou un inventaire périmé. Les empreintes des deux lockfiles sont conservées. L’état des plateformes optionnelles installées peut varier entre postes. Revoir les différences après toute mise à jour : le script ne démontre pas automatiquement la compatibilité.

Avant un installateur public, fournir les textes et notices applicables et un accès aux sources correspondant exactement au build. Pour le compagnon et les versions modifiées accessibles par réseau, prévoir une offre du code source conforme à l’AGPL ; elle peut être servie localement. Voir les [instructions GNU](https://www.gnu.org/licenses/gpl-howto.en.html).
