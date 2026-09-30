# Sources de l’avatar

- `male_casual.fbx` : modèle original et squelette de 25 os, sans clips d’animation.
- `character-texture.png` : texture fournie, préservée à l’identique.
- `male-casual-animated.blend` : version éditable, texture intégrée et quinze actions (attente + habitudes). Les accessoires sont liés aux os `prop_*`.
- `character-report.json` : inventaire produit lors de la préparation initiale.

Pour exporter un travail enregistré dans le `.blend`, utiliser `scripts/export-avatar.py` avec Blender. `scripts/prepare-avatar.py` reconstruit les animations de départ et remplace le fichier de travail : réserver ce script à une reconstruction volontaire.

L’application charge `public/avatar/character/male-casual.glb`. Les correspondances de clips sont dans `public/avatar/animations.json`. Un artiste peut remplacer un seul mouvement ou le personnage entier, sans modifier le code de l’application.

Voir [le guide de création et d’intégration](../../docs/artist-animation-guide.md).
