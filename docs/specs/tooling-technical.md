---
kind: technical
title: Outils et vérifications — contrats techniques
---
# Outils de développement

## TECH-TOOLING-DOCS — Navigation documentaire

`navigation(language)` reçoit `fr` ou `en` et construit la configuration VitePress de navigation et de barre latérale dans cette langue. Sa fonction `t(fr, english)` sélectionne la chaîne, et `path(page)` préfixe le chemin anglais par `/en/`. Ces fonctions construisent des valeurs ; elles ne vérifient pas l’existence des pages.

## TECH-TOOLING-VALIDATION — Scripts de contrôle et processus

Les scripts s’exécutent sur le poste de développement et signalent un échec par erreur ou code de sortie non nul ; ils ne sont pas des fonctionnalités de l’application distribuée.

- `pages(folder)` énumère et trie les fichiers Markdown immédiats ; `flatten(nodes)` aplatit récursivement l’arbre des titres ; `sections(file)` rend le Markdown et renvoie niveaux et identifiants de titres. Le contrôle compare les noms et les ancres FR/EN et échoue en cas de divergence ou d’erreur de lecture.
- `property(object, name)` trouve une propriété d’un littéral analysé par TypeScript ; `visit(node)` parcourt l’arbre et extrait les métriques d’événement pour vérifier le manifeste d’animations. Un manifeste, fichier GLB ou clip invalide fait échouer la validation.
- `spawnNode(file, params, options)` démarre un programme Node et enregistre son processus jusqu’à sa fermeture. `run` attend sa fin et rejette sur échec ou interruption. `startServer(file, marker, env)` attend le texte de démarrage, rejette si le processus échoue ou après 20 secondes. `stopChildren()` termine les processus suivis et attend au plus cinq secondes par processus. Ces opérations sont utilisées par la validation visuelle locale.
- Les fonctions `capture`, `read` et `state` des scripts de vérification native récupèrent des états de l’application Windows pour les assertions du scénario correspondant ; les erreurs d’accès et assertions sont remontées par le script appelant.

## TECH-TOOLING-TESTS — Aides de tests fonctionnels et visuels

Ces fonctions préparent des scénarios reproductibles et exposent les erreurs aux tests Playwright. Elles ne modifient pas les données de l’utilisateur final.

- `sampleAnimatedGlb`, `gate`, `pendingRequest` et les fonctions `capture` des tests d’avatar fournissent respectivement un modèle d’essai, une porte asynchrone, un état de requête ou une mesure de rendu afin de vérifier le chargement et le comportement de la scène.
- `freezeAvatar`, `orbit` et `captureCamera` préparent ou inspectent la caméra dans une page de test ; `draws` et `expectStopped` relèvent et vérifient l’arrêt des rendus. Une attente ou assertion Playwright échouée échoue au test.
- `row`, `snapshot`, `native` et `profile` créent des données fictives ou préparent le contexte navigateur requis par leurs scénarios de journal, fantôme et profil. Les données restent propres au scénario de test.
- `snapshotPath(category, width, height, language, theme, ...file)` renvoie les segments de chemin de référence, y compris le nom d’appareil lorsque sa taille correspond à une résolution de référence ; sinon elle utilise la résolution seule.
- Dans les tests visuels d’application, `prepare(page, theme, language, width, height)` fixe le contexte d’affichage et les préférences ; `navigate(page, route, language)` ouvre la route et vérifie le titre et les commandes de scène. `translated(source)` choisit le libellé attendu selon la langue. Les pixels du canvas sont masqués dans ces captures ; les interactions 3D sont vérifiées séparément.
- Dans les tests de documentation, `path(language, name)` construit le chemin de page ; `prepare(page, theme)` fixe le thème et `ready(page, language, name)` attend la langue, le titre et les polices. Les erreurs de lecture ou de correspondance font échouer le test.
- Dans les tests visuels du compagnon, `prepare(page, viewportName)` fixe le viewport et l’horloge, `pair(page)` parcourt l’association avec l’API fictive et `capture(page, viewportName, screenName)` compare l’écran PWA à sa référence. Les scénarios couvrent l’association, la saisie d’une mesure et une saisie d’habitude hors ligne.

## TECH-TOOLING-ART — Préparation des ressources artistiques

Ces fonctions Python sont utilisées lors de la génération d’assets et nécessitent l’environnement de leur script : Pillow pour les icônes, Blender pour la préparation de l’avatar. Les erreurs de dépendance, de géométrie ou d’accès aux fichiers sont propagées.

- `quadratic(start, control, end, steps)` produit les points d’une courbe de Bézier quadratique, extrémités comprises, pour dessiner les icônes installables.
- `add_prop`, `solid`, `bind`, `box` et `sphere` ajoutent respectivement un os d’accessoire, un matériau, une liaison à l’armature et des géométries de boîte ou de sphère. Elles utilisent les objets et la scène Blender préparés par le script.
- `rotate`, `translate` et `visible` règlent la transformation d’os ou la visibilité d’accessoires ; `sit`, `hands_forward`, `aim_bone`, `reach` et `pose` composent les postures d’animation à partir du squelette et des cibles fournis ou préparés par le script.

## TECH-TOOLING-LICENSES — Inventaire des licences

Le script `scripts/license-inventory.mjs` lit les deux lockfiles, les manifestes npm installés et le graphe Cargo Windows résolu hors ligne. Il écrit `licenses/dependencies.json`, ou vérifie son égalité exacte en mode `--check`. Il refuse une version installée différente du lockfile, une déclaration absente ou une sortie périmée. Les liens npm locaux sont résolus dans le lockfile. `hash(file)` reçoit un chemin de lockfile, lit ses octets et renvoie son empreinte SHA-256 ; une erreur de lecture est propagée. Aucun chemin personnel Cargo n’est enregistré. Cet inventaire ne constitue pas une preuve de compatibilité ni un recueil complet de notices pour binaires.
