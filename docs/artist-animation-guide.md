# Remplacer le personnage et ses animations 3D

Le personnage livré utilise `male_casual.fbx` et la texture fournie. Le FBX contient 25 os et aucun clip d’animation : quinze actions ont été créées sur ce rig pour l’attente et les quatorze habitudes. Le GLB embarque le personnage, sa texture et ses accessoires. Toutes les habitudes partagent ce fichier ; chaque scène ne charge qu’un modèle et un mixer.

## Sources modifiables

- `art/avatar/male_casual.fbx` : FBX d’origine, conservé sans modification.
- `art/avatar/character-texture.png` : atlas de texture d’origine, conservé sans modification et intégré au fichier Blender.
- `art/avatar/male-casual-animated.blend` : personnage texturé, rig, accessoires et quinze actions modifiables dans Blender 4.2 LTS.
- `art/avatar/character-report.json` : inventaire des sources et actions créées.
- `public/avatar/character/male-casual.glb` : export autonome utilisé par l’application.
- `public/avatar/animations.json` : correspondance entre chaque habitude, un fichier GLB et le nom exact du clip.

Le rig `AvatarRig` garde les os du personnage d’origine. Les quinze os `prop_*` commandent les accessoires : leur échelle est animée entre 0 et 1 pour n’afficher que ceux de l’activité courante. Le matériau `CharacterAtlas` utilise l’UV original et un filtrage pixelisé ; il garde les couleurs de la texture fournie.

## Modifier une animation dans Blender

1. Ouvrir `male-casual-animated.blend`, sélectionner `AvatarRig`, puis passer en **Pose Mode**.
2. Dans le **Dope Sheet → Action Editor**, sélectionner une action du tableau ci-dessous. Chaque action possède un utilisateur fictif pour rester conservée dans le fichier.
3. Modifier les poses et les clés des os du personnage ou des accessoires. Garder une boucle sur place, avec une première pose reconnaissable. La timeline de l’application laisse deux secondes par événement et redémarre le clip pour chaque ligne, même lorsque deux événements ont la même habitude.
4. Enregistrer le `.blend`, puis exporter toutes les actions avec le script prévu, depuis la racine du projet :

   ```powershell
   & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python scripts/export-avatar.py
   npm run check:avatar
   ```

Le script d’export lit le `.blend` enregistré et n’altère pas les sources. `scripts/prepare-avatar.py` sert uniquement à **reconstruire les animations initiales depuis le FBX** : il remplace le `.blend` et le GLB, donc ne pas l’utiliser après un travail manuel à conserver.

| Habitude         | Action Blender / clip GLB |
| ---------------- | ------------------------- |
| `idle`           | `Idle`                    |
| `walk`           | `Walk`                    |
| `exercise`       | `Exercise`                |
| `work`           | `Work`                    |
| `social`         | `Social`                  |
| `screen`         | `Screen`                  |
| `screen_evening` | `ScreenEvening`           |
| `gaming`         | `Gaming`                  |
| `reading`        | `Read`                    |
| `meal`           | `Meal`                    |
| `alcohol`        | `Alcohol`                 |
| `tobacco`        | `Tobacco`                 |
| `vaping`         | `Vaping`                  |
| `sedentary`      | `Sedentary`               |
| `rest`           | `Rest`                    |

## Remplacer une ou plusieurs habitudes

Un artiste peut utiliser un autre personnage et un autre rig sans modifier Angular ou Rust. Chaque GLB contient le personnage complet, ses accessoires utiles et au moins un clip. Plusieurs habitudes peuvent partager le même GLB, ou utiliser des fichiers séparés.

```json
{
  "version": 1,
  "overrides": {
    "idle": { "file": "character/male-casual.glb", "clip": "Idle" },
    "walk": { "file": "clips/walk.glb", "clip": "Walk" },
    "reading": { "file": "character/male-casual.glb", "clip": "Read" }
  }
}
```

Un fichier absent, invalide ou sans le clip nommé garde l’animation procédurale de cette habitude. Le fichier partagé reste utilisable pour les autres clips si un nom de clip est incorrect.

## Contrat d’un GLB

- Utiliser glTF 2.0 binaire (`.glb`) avec textures et géométrie intégrées. Les chemins du manifeste restent relatifs à `public/avatar/` ; les URL distantes et les chemins remontant hors de ce dossier sont refusés.
- Placer l’origine au sol, au milieu des pieds. Axe vertical **+Y**, avant du personnage **+Z**, hauteur approximative **2,2 unités**. L’export glTF de Blender convertit automatiquement ses axes Z verticaux vers ceux du GLB.
- Exporter les animations et conserver exactement leur nom dans `clip`. Pour un export manuel dans Blender 4.2, choisir **glTF Binary**, **Animation Mode: Actions**, toutes les actions d’une seule armature et l’échantillonnage des animations ; désactiver la limitation à la plage de la scène.
- Le matériau facultatif `AvatarShirt` reprend la couleur choisie dans le profil. Les autres matériaux gardent leurs couleurs. Le modèle fourni utilise `CharacterAtlas` pour préserver sa texture : le sélecteur de couleur du profil ne recolore donc pas sa chemise.
- Préférer une géométrie légère, peu de matériaux et des textures de petite taille. Le rendu applique un filtrage pixelisé.

## Vérifier dans l’application

1. Exécuter `npm run check:avatar` pour contrôler les fichiers, noms de clips et ressources locales.
2. Lancer `npm start` ou `npm run desktop`. Dans le tableau de bord, choisir chaque habitude avec **Prévisualiser**. La légende affiche **ANIMATION GLB** lorsque le personnage d’artiste est utilisé.
3. Cliquer sur les événements ou sur **Rejouer la journée** pour vérifier le déclenchement des animations par la timeline.
4. Pour les tests automatisés : `npm run build`, puis `npm test`. Le test du personnage fourni vérifie toutes les habitudes, la timeline et le chargement unique du GLB ; il enregistre des captures dans `test-results/`.
5. Reconstruire l’application avec `npm run package` ou `npm run package:offline` pour inclure les nouveaux fichiers dans l’installateur.

Les animations restent des illustrations d’activités déclarées. Si WebGL est indisponible, un message propose de réessayer la 3D ; aucun avatar de remplacement n’est généré. Le chargeur libère géométrie, textures et squelettes lorsque la scène est fermée.
