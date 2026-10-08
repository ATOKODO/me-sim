# Sources de l’avatar

- `male_casual.fbx` : modèle original et squelette de 25 os, sans clips d’animation.
- `character-texture.png` : texture fournie, préservée à l’identique.
- `male-casual-animated.blend` : version éditable, texture intégrée et quinze actions (attente + habitudes). Les accessoires sont liés aux os `prop_*`.
- `female-casual-animated.blend` : variante féminine éditable sur le même rig, coiffure liée à `head`, silhouette distincte et matériau `AvatarShirt` recolorable.
- `female-character-report.json` : inventaire de cette variante (corps de 952 triangles, coiffure de 76 triangles, visage de 10 triangles, quinze clips).
- `character-report.json` : inventaire produit lors de la préparation initiale.

Pour exporter un travail enregistré dans le `.blend`, utiliser `scripts/export-avatar.py` avec Blender. Ajouter `-- --model female` à la commande Blender pour exporter le fichier féminin ; sans argument, le modèle masculin est exporté. `scripts/prepare-avatar.py` reconstruit les animations de départ et remplace le fichier de travail : réserver ce script à une reconstruction volontaire.

`scripts/prepare-female-avatar.py` reconstruit la variante féminine depuis le `.blend` masculin : il remplace les fichiers féminins, donc ne pas le lancer sur un travail manuel à conserver.

L’application charge `public/avatar/character/female-casual.glb` pour un profil dont `sex` vaut `female`, et `public/avatar/character/male-casual.glb` sinon. Les correspondances de clips sont dans `public/avatar/animations.json`. Un artiste peut remplacer un seul mouvement ou le personnage entier, sans modifier le code de l’application.

Voir [le guide de création et d’intégration](../../docs/artist-animation-guide.md).
