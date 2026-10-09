# Sources de l’avatar

- `male_casual.fbx` : modèle original et squelette de 25 os, sans clips d’animation.
- `character-texture.png` : texture fournie, préservée à l’identique.
- `male-casual-animated.blend` : version éditable, texture intégrée et quinze actions (attente + habitudes). Les accessoires sont liés aux os `prop_*`.
- `female_secretary.fbx` : modèle féminin fourni, squelette de 28 os et aucun clip d’animation.
- `secretary_tex.png` : texture féminine fournie, préservée à l’identique et embarquée dans le GLB.
- `female-casual-animated.blend` : modèle féminin sur son propre rig, texture intégrée, 15 os d’accessoires ajoutés et quinze actions éditables.
- `female-character-report.json` : inventaire de cette variante (488 sommets, 932 triangles, 43 os avec les accessoires, quinze clips).
- `character-report.json` : inventaire produit lors de la préparation initiale.

Pour exporter un travail enregistré dans le `.blend`, utiliser `scripts/export-avatar.py` avec Blender. Ajouter `-- --model female` à la commande Blender pour exporter le fichier féminin ; sans argument, le modèle masculin est exporté. `scripts/prepare-avatar.py` reconstruit les animations de départ et remplace le fichier de travail : réserver ce script à une reconstruction volontaire.

`scripts/prepare-female-avatar.py` reconstruit la variante féminine depuis `female_secretary.fbx` et `secretary_tex.png`, via le générateur commun de `prepare-avatar.py -- --model female` : il remplace les fichiers féminins, donc ne pas le lancer sur un travail manuel à conserver.

L’application charge `public/avatar/character/female-casual.glb` pour un profil dont `sex` vaut `female`, et `public/avatar/character/male-casual.glb` sinon. Les correspondances de clips sont dans `public/avatar/animations.json`. Un artiste peut remplacer un seul mouvement ou le personnage entier, sans modifier le code de l’application.

Voir [le guide de création et d’intégration](../../docs/artist-animation-guide.md).
