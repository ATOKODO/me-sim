# Remplacer les animations 3D

Chaque habitude de la timeline a son propre mode d’animation. Le personnage et ses accessoires intégrés sont dessinés par Three.js tant qu’aucun GLB n’est déclaré pour ce mode. Un artiste peut remplacer une habitude à la fois, sans modifier Angular ou Rust.

## Fichiers

- `art/avatar/` : fichiers de travail modifiables, par exemple Blender `.blend`.
- `public/avatar/clips/` : exports GLB autonomes livrés avec l’application.
- `public/avatar/animations.json` : correspondance entre une habitude, un fichier GLB et le nom de son clip.

Exemple de manifeste :

```json
{
  "version": 1,
  "overrides": {
    "walk": { "file": "clips/walk.glb", "clip": "Walk" },
    "reading": { "file": "clips/reading.glb", "clip": "Read" }
  }
}
```

Les identifiants utilisables sont `idle`, `exercise`, `walk`, `work`, `social`, `gaming`, `screen`, `reading`, `meal`, `rest`, `alcohol`, `tobacco`, `vaping`, `screen_evening` et `sedentary`. Ils correspondent directement aux mesures du journal. Un fichier absent, invalide ou sans le clip nommé garde l’animation procédurale de cette habitude.

## Contrat d’un GLB

Chaque fichier contient **le personnage complet**, ses accessoires utiles à l’habitude et au moins un clip d’animation. Cette convention permet de remplacer un mouvement indépendamment des autres, sans retargeting de squelette. Utiliser glTF 2.0 binaire (`.glb`) et intégrer textures et géométrie dans le fichier. Les chemins du manifeste restent relatifs à `public/avatar/` ; les URL distantes et les chemins remontant hors de ce dossier sont refusés.

- Placer l’origine du modèle au sol, au milieu des pieds. Axe vertical **+Y**, avant du personnage **+Z**. Viser environ **2,2 unités** de haut : la scène place cette origine à la position de l’avatar actuel.
- Garder le personnage au même emplacement pendant le cycle. Préparer une boucle courte (environ 1 à 2 secondes), avec une pose reconnaissable dès les premières images. La relecture laisse **2 secondes** à chaque événement et redémarre le clip pour chaque ligne, même si deux événements ont la même habitude.
- Dans Blender, nommer l’action correspondant au mouvement, exporter les animations, puis recopier **exactement** ce nom dans `clip`. Un fichier peut contenir d’autres clips ; seul celui indiqué est joué.
- Nommer le matériau du vêtement `AvatarShirt` pour reprendre automatiquement la couleur choisie dans le profil. Les autres matériaux gardent leurs couleurs d’export.
- Préférer une géométrie légère et des textures de petite taille. Le rendu applique un filtrage pixelisé ; garder les effets, lumières et textures intégrés simples pour préserver 30 images/s.

## Vérifier et prévisualiser

1. Déposer le GLB dans `public/avatar/clips/` et modifier une entrée de `animations.json`.
2. Exécuter `npm run check:avatar` : le script contrôle les chemins, le conteneur GLB, le nom du clip et l’absence de ressources externes.
3. Lancer `npm run desktop`. Dans le tableau de bord, choisir l’habitude avec **Prévisualiser**. La légende de la scène affiche **ANIMATION GLB** quand le fichier d’artiste est utilisé.
4. Créer un nouveau profil de démonstration pour rejouer les quatorze habitudes dans la timeline. La lecture peut être arrêtée ; sélectionner une ligne rejoue aussi son animation.
5. Reconstruire l’application avec `npm run package` ou `npm run package:offline` pour inclure les nouveaux fichiers dans l’installateur.

La vue 2D reste disponible en cas de WebGL indisponible ou si son option est activée. Le chargeur lit seulement les GLB inclus dans l’application et libère leurs ressources quand la scène est fermée.
