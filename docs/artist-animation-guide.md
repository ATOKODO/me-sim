# Remplacer le personnage et ses animations 3D

Deux personnages locaux sont livrés : le modèle masculin issu de `male_casual.fbx`, et le personnage féminin fourni dans `female_secretary.fbx` avec sa texture `secretary_tex.png`. Le profil sélectionne la variante féminine lorsque son champ `sex` vaut `female` ; masculin ou non renseigné garde le modèle par défaut. Le choix ne modifie aucune mesure.

Les FBX d’origine contiennent 25 os pour le modèle masculin et 28 os pour le modèle féminin, sans clip d’animation. Quinze actions sont créées sur chaque rig pour l’attente et les quatorze habitudes. Chaque GLB embarque son personnage, sa texture et ses accessoires. Les quinze habitudes d’une variante partagent un fichier et un mixer. Changer de profil dans une scène conserve la caméra et réutilise les modèles déjà chargés.

## Sources modifiables

- `art/avatar/male_casual.fbx` : FBX d’origine, conservé sans modification.
- `art/avatar/character-texture.png` : atlas de texture d’origine, conservé sans modification et intégré au fichier Blender.
- `art/avatar/male-casual-animated.blend` : personnage texturé, rig, accessoires et quinze actions modifiables dans Blender 4.2 LTS.
- `art/avatar/female_secretary.fbx` et `art/avatar/secretary_tex.png` : modèle et atlas féminins fournis, conservés à l’identique.
- `art/avatar/female-casual-animated.blend` : personnage féminin sur son propre rig, texture intégrée et quinze actions éditables ; géométrie, UV et poids d’origine conservés.
- `art/avatar/female-character-report.json` : inventaire de cette variante.
- `public/avatar/character/female-casual.glb` : export autonome du personnage féminin.
- `art/avatar/character-report.json` : inventaire des sources et actions créées.
- `public/avatar/character/male-casual.glb` : export autonome utilisé par l’application.
- `public/avatar/animations.json` : correspondance entre chaque habitude, un fichier GLB et le nom exact du clip.

Chaque rig `AvatarRig` garde les articulations du personnage d’origine. Pour le modèle féminin, certains os et leurs groupes de sommets sont renommés (`hips` → `pelvis`, `.L` / `.R` → `_left` / `_right`) pour partager le code de création des activités ; leurs positions et poids restent ceux du FBX. Les quinze os `prop_*` commandent les accessoires : leur échelle est animée entre 0 et 1 pour n’afficher que ceux de l’activité courante. Les matériaux `CharacterAtlas` et `SecretaryAtlas` utilisent les UV et les couleurs de leurs textures respectives, avec un filtrage pixelisé.

## Modifier une animation dans Blender

1. Ouvrir `male-casual-animated.blend` ou `female-casual-animated.blend`, sélectionner `AvatarRig`, puis passer en **Pose Mode**.
2. Dans le **Dope Sheet → Action Editor**, sélectionner une action du tableau ci-dessous. Chaque action possède un utilisateur fictif pour rester conservée dans le fichier.
3. Modifier les poses et les clés des os du personnage ou des accessoires. Garder une boucle sur place, avec une première pose reconnaissable. La timeline de l’application laisse deux secondes par événement et redémarre le clip pour chaque ligne, même lorsque deux événements ont la même habitude.
4. Enregistrer le `.blend`, puis exporter toutes les actions avec le script prévu, depuis la racine du projet :

   ```powershell
   & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/export-avatar.py
   # Exporter le modèle féminin après avoir enregistré ses modifications :
   & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/export-avatar.py -- --model female
   npm run check:avatar
   ```

Le script d’export lit le `.blend` enregistré et n’altère pas les sources. `scripts/prepare-avatar.py` sert uniquement à **reconstruire les animations initiales depuis le FBX** : il remplace le `.blend` et le GLB, donc ne pas l’utiliser après un travail manuel à conserver. `scripts/prepare-female-avatar.py` reconstruit le personnage féminin depuis `female_secretary.fbx` et `secretary_tex.png`, en utilisant le générateur commun avec `--model female` ; il remplace le fichier féminin de travail et son GLB. Utiliser uniquement le script **export-avatar.py** pour livrer des modifications d’artiste.

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
  },
  "variants": {
    "female": {
      "overrides": {
        "idle": { "file": "character/female-casual.glb", "clip": "Idle" },
        "walk": { "file": "character/female-casual.glb", "clip": "Walk" },
        "reading": { "file": "character/female-casual.glb", "clip": "Read" }
      }
    }
  }
}
```

La version du manifeste reste **1** : `overrides` décrit le modèle par défaut, et le bloc facultatif `variants.female.overrides` décrit le modèle féminin. Les anciens manifestes restent lisibles. Une habitude non fournie pour une variante utilise son personnage procédural 3D ; elle ne reprend pas automatiquement le GLB d’une autre variante.

Pendant la lecture du manifeste et le chargement du GLB, la pièce reste visible et la légende indique **Chargement du personnage…** ; le personnage procédural est masqué jusqu’à la fin du chargement. Un fichier absent, invalide ou sans le clip nommé utilise alors l’animation procédurale de cette habitude. Le fichier partagé reste utilisable pour les autres clips si un nom de clip est incorrect.

## Contrat d’un GLB

- Utiliser glTF 2.0 binaire (`.glb`) avec textures et géométrie intégrées. Les chemins du manifeste restent relatifs à `public/avatar/` ; les URL distantes et les chemins remontant hors de ce dossier sont refusés.
- Placer l’origine au sol, au milieu des pieds. Axe vertical **+Y**, avant du personnage **+Z**, hauteur approximative **2,2 unités**. L’export glTF de Blender convertit automatiquement ses axes Z verticaux vers ceux du GLB.
- Exporter les animations et conserver exactement leur nom dans `clip`. Pour un export manuel dans Blender 4.2, choisir **glTF Binary**, **Animation Mode: Actions**, toutes les actions d’une seule armature et l’échantillonnage des animations ; désactiver la limitation à la plage de la scène.
- Le matériau facultatif `AvatarShirt` reprend la couleur choisie dans le profil. Les autres matériaux gardent leurs couleurs. Les modèles fournis utilisent `CharacterAtlas` ou `SecretaryAtlas` pour préserver leurs textures : le sélecteur de couleur du profil ne recolore pas leurs vêtements. Un artiste peut ajouter un matériau `AvatarShirt` pour rendre une zone recolorable.
- Préférer une géométrie légère, peu de matériaux et des textures de petite taille. Le rendu applique un filtrage pixelisé.

## Vérifier dans l’application

1. Exécuter `npm run check:avatar` pour contrôler les fichiers, noms de clips et ressources locales.
2. Lancer `npm start` ou `npm run desktop`. Créer ou modifier un profil en choisissant **Féminin** pour vérifier cette variante, puis un profil masculin ou non renseigné pour vérifier le modèle par défaut. Dans le tableau de bord, choisir chaque habitude avec **Prévisualiser**. La légende affiche **ANIMATION GLB** lorsque le personnage d’artiste est utilisé.
3. Cliquer sur les événements ou sur **Rejouer la journée** pour vérifier le déclenchement des animations par la timeline.
4. Pour les tests automatisés : `npm run build`, puis `npm test`. Les tests des deux personnages vérifient les quinze clips et la timeline, le chargement unique du GLB par variante, le changement de profil sans réinitialiser la caméra et les chargements tardifs. Des chargements volontairement retardés vérifient aussi l’absence d’avatar procédural pendant l’attente, après navigation et rafraîchissement, puis le repli en cas d’échec réel. Ils enregistrent des captures dans `test-results/`.
5. Reconstruire l’application avec `npm run package` ou `npm run package:offline` pour inclure les nouveaux fichiers dans l’installateur.

Les animations restent des illustrations d’activités déclarées. Si WebGL est indisponible, un message propose de réessayer la 3D ; aucun avatar de remplacement n’est généré. Le chargeur libère géométrie, textures et squelettes lorsque la scène est fermée.
