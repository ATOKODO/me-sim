# Guide des données

## Journal

Choisir un profil dans la barre supérieure. Ajouter une mesure avec sa date locale (AAAA-MM-JJ). Les repères quotidiens restent uniques par métrique et jour ; les activités peuvent être répétées dans une journée si leur heure de début diffère. Pour corriger une valeur, utiliser le bouton Modifier de sa ligne. Le changement de profil réinitialise les formulaires en cours. Les activités positives et les habitudes à observer sont documentées avec la même saisie, sans jugement clinique.

Lorsqu’une activité horodatée est sélectionnée dans la timeline ou rejouée, l’avatar adopte son animation dédiée : mouvement pour la marche et le sport, posture concentrée et accessoire pour le travail, l’écran, les jeux ou la lecture, animation de fumée pour le tabac et le vapotage, et position assise pour la sédentarité. Le mode 2D reprend ces mouvements simplifiés.

La liste **Prévisualiser** du tableau de bord permet de voir chaque animation même sans observation. Pendant la relecture, chaque ligne dispose de deux secondes et relance son animation propre ; le bouton permet d’arrêter la séquence. Les fichiers GLB facultatifs pour remplacer le rendu 3D sont décrits dans le [guide de l’artiste](artist-animation-guide.md).

Tabac se saisit en nombre entier de cigarettes par moment. Vapotage, écran le soir et temps sédentaire se saisissent en minutes avec une heure de début ; la durée est reprise dans la timeline. Ce sont des déclarations personnelles, sans interprétation ni estimation automatique.

## Profil Target

Le tableau de bord permet d’enregistrer, pour le profil actif, une journée de référence : heures de sommeil, pas, minutes d’activité, sport, marche et temps social, ainsi que les plafonds d’écran, de jeux vidéo, d’alcool, de tabac, de vapotage, d’écran le soir et de sédentarité. Les valeurs initiales sont modifiables ; elles servent de repères personnels, pas de recommandations médicales. La trajectoire affiche la déviation moyenne des observations disponibles pour chacun des sept derniers jours ; une barre plus haute signifie que les données s’éloignent davantage de la cible. Chaque jour indique aussi le nombre d’indicateurs renseignés sur les 13 possibles. Un score de 0 % avec une couverture partielle ne prouve pas que toute la journée correspond à la cible. Un jour sans indicateur utilisable reste marqué `?` et n’est pas compté comme zéro. Pour une cible positive, l’écart relatif est plafonné à 100 % par indicateur ; pour une cible à zéro, toute quantité positive compte comme un écart complet pour cet indicateur. La moyenne reste un repère personnel, pas une mesure clinique. La cible est incluse dans la sauvegarde JSON et restaurée avec son profil.

## Calendrier des habitudes

Dans **Mes habitudes**, choisir des exemples ou ajouter une habitude personnalisée. Une bonne habitude est souhaitée chaque jour ; une habitude à réduire est souhaitée absente. La configuration appartient au profil actif. Retirer une habitude arrête son suivi à partir du jour courant et conserve les journées historiques.

Choisir une date dans le calendrier, répondre **Oui** ou **Non** pour chaque habitude, puis sélectionner **Valider la journée**. Une réponse peut être effacée ou corrigée ; il faut alors revalider. La courbe sur 14 jours compare les journées validées à un cap de 100 % : chaque habitude répondue compte autant, sans prétention clinique. Les jours non validés forment des trous dans la courbe ; une réponse partielle apparaît seulement comme aperçu du jour choisi. Le suivi binaire et les observations détaillées du journal sont distincts : cocher « Oui » ne crée pas de mesure chiffrée ni d’événement dans la timeline. Les profils, configurations et journées sont inclus dans la sauvegarde JSON complète, mais pas dans les exports tabulaires de mesures.

## Import

1. Choisir un profil puis un fichier dans Mes données.
2. Sélectionner la feuille et les colonnes date, valeur, mesure et unité. Les deux dernières peuvent être fixes pour tout le fichier. Pour reconstruire une timeline, associer aussi les colonnes `time` (HH:mm) et `durationMinutes`.
3. Choisir explicitement AAAA-MM-JJ, JJ/MM/AAAA ou MM/JJ/AAAA. Les vraies cellules date Excel sont converties en AAAA-MM-JJ : sélectionner ce format.
4. Vérifier l’aperçu, les conversions et les erreurs. Par défaut, les valeurs existantes restent inchangées. Les doublons exacts sont ignorés. En mode remplacement, la dernière ligne d’une même date/métrique gagne.
5. Confirmer. Les lignes invalides bloquent l’import sauf si leur exclusion est explicitement cochée. Une erreur d’écriture annule toute la transaction.

Mesures reconnues : `weight`/poids, `sleep`/sommeil, `steps`/pas, `activity`/activité, `intake`/apports/calories, `stress`, `exercise`/sport, `walk`/marche, `work`/travail, `social`, `reading`/lecture, `rest`/repos, `meal`/repas, `screen`/réseaux/écran, `screen_evening`/écran le soir, `gaming`/jeux vidéo, `alcohol`/alcool, `tobacco`/tabac, `vaping`/vapotage et `sedentary`/temps sédentaire. Les activités en minutes utilisent `min`; l’alcool utilise `verre`; le tabac utilise `cigarette`. Une activité horodatée en minutes conserve aussi sa durée dans `durationMinutes`.

CSV UTF-8 avec ou sans BOM, virgule ou point-virgule ; virgule décimale acceptée. Les milliers peuvent utiliser des espaces. Pas de détection implicite d’une unité ou de l’ordre jour/mois. Les fichiers Excel contenant des formules sont refusés : exporter leurs valeurs uniquement. Les macros ne sont jamais exécutées. Fichiers chiffrés non pris en charge.

Limites : 25 Mo par fichier d’import, 50 000 lignes par feuille, 256 colonnes Excel ; base limitée à 100 profils et 100 000 observations. JSON tabulaire : tableau d’objets plats ; colonnes définies par le premier objet.

## Export et restauration

CSV, XLS (vrai BIFF8) et XLSX contiennent les observations du profil actif, avec les colonnes `time` et `durationMinutes` lorsqu’elles existent. Le CSV protège les chaînes commençant par un caractère de formule avec une apostrophe. XLS est limité à 65 535 observations, utiliser XLSX au-delà.

La sauvegarde JSON contient l’intégralité des profils, habitudes, journées validées ou en cours, mesures, lots d’import, scénarios, résultats enregistrés et préférences. Les exports tabulaires ne remplacent pas cette sauvegarde.

Restaurer remplace tous les profils après aperçu. L’état précédent est sauvegardé en `avant-restauration-<uuid>.json` à côté de la base. Si la sauvegarde préventive échoue, la restauration n’a pas lieu. Une version inconnue ou des références invalides sont refusées avant modification. Pour revenir en arrière, restaurer le fichier préventif.

Les exemples `fixtures/mesures.csv` et `fixtures/mesures.json` sont entièrement fictifs.

En cas de modification simultanée par une autre fenêtre, une révision SQLite empêche tout écrasement silencieux. La tentative périmée est refusée avant toute écriture. L’application recharge les données actuelles et conserve le brouillon lorsque le profil existe encore. Vérifier le brouillon puis enregistrer de nouveau ; il n’est jamais renvoyé automatiquement. Un aperçu d’import devenu périmé doit être vérifié de nouveau.

## Précision du journal et des échanges — corrections du 2 octobre 2026

Le récap résume les observations du jour local, indépendamment de la timeline glissante de 24 heures. Une donnée non renseignée reste indiquée par `—` ; un zéro explicitement saisi reste zéro. L’activité totale déclarée est utilisée lorsqu’elle existe ; sinon le récap additionne les séances de sport et de marche renseignées. Le total déclaré n’est pas additionné une seconde fois à ces séances. Les événements futurs ne sont pas inclus dans le récap.

Une quantité nulle de vapotage, d’écran ou d’une autre activité peut être enregistrée sans heure ni durée d’animation : elle renseigne la journée et ne crée pas de moment dans la timeline. Les pas et les cigarettes utilisent des nombres entiers. Corriger une observation importée conserve son lien avec le lot d’origine.

Le calendrier, le titre du jour, les trajectoires et la timeline suivent une horloge locale commune. Le passage à minuit avance la sélection lorsqu’elle suivait aujourd’hui ; une date historique choisie reste sélectionnée. Le journal conserve la quantité en cours de saisie et avance uniquement sa date par défaut. Le retour au premier plan actualise également ces repères.

L’assistant propose l’unité fixe `cigarette`, y compris pour un fichier tabac sans colonne d’unité. Les dates, heures natives Excel et durées restent distinctes jusqu’au mapping ; une heure 18:30 ne devient plus une date. Une durée invalide est signalée au lieu d’être remplacée implicitement par la valeur. Les heures sont enregistrées à la minute et les durées dans `durationMinutes` sont en minutes.

La limite de suivi porte sur 100 habitudes actives ; retirer une habitude conserve son historique sans occuper une place active. Une limite totale de 10 000 définitions par profil protège la taille des sauvegardes.
