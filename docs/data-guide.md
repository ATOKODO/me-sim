# Guide des données

## Journal

Choisir un profil dans la barre supérieure. Ajouter une mesure avec sa date locale (AAAA-MM-JJ). Une observation par métrique, jour et profil ; pour corriger une valeur, utiliser le bouton Modifier de sa ligne. Le changement de profil réinitialise les formulaires en cours.

## Import

1. Choisir un profil puis un fichier dans Mes données.
2. Sélectionner la feuille et les colonnes date, valeur, mesure et unité. Les deux dernières peuvent être fixes pour tout le fichier.
3. Choisir explicitement AAAA-MM-JJ, JJ/MM/AAAA ou MM/JJ/AAAA. Les vraies cellules date Excel sont converties en AAAA-MM-JJ : sélectionner ce format.
4. Vérifier l’aperçu, les conversions et les erreurs. Par défaut, les valeurs existantes restent inchangées. Les doublons exacts sont ignorés. En mode remplacement, la dernière ligne d’une même date/métrique gagne.
5. Confirmer. Les lignes invalides bloquent l’import sauf si leur exclusion est explicitement cochée. Une erreur d’écriture annule toute la transaction.

Mesures reconnues : `weight`/poids, `sleep`/sommeil, `steps`/pas, `activity`/activité, `intake`/apports/calories et `stress`. Unités : kg, lb ou g pour le poids ; h ou min pour le sommeil et l’activité ; pas ; kcal ou kJ ; /10 pour le stress.

CSV UTF-8 avec ou sans BOM, virgule ou point-virgule ; virgule décimale acceptée. Les milliers peuvent utiliser des espaces. Pas de détection implicite d’une unité ou de l’ordre jour/mois. Les fichiers Excel contenant des formules sont refusés : exporter leurs valeurs uniquement. Les macros ne sont jamais exécutées. Fichiers chiffrés non pris en charge.

Limites : 25 Mo par fichier d’import, 50 000 lignes par feuille, 256 colonnes Excel ; base limitée à 100 profils et 100 000 observations. JSON tabulaire : tableau d’objets plats ; colonnes définies par le premier objet.

## Export et restauration

CSV, XLS (vrai BIFF8) et XLSX contiennent les observations du profil actif. Le CSV protège les chaînes commençant par un caractère de formule avec une apostrophe. XLS est limité à 65 535 observations, utiliser XLSX au-delà.

La sauvegarde JSON contient l’intégralité des profils, mesures, lots d’import, scénarios, résultats enregistrés et préférences. Les exports tabulaires ne remplacent pas cette sauvegarde.

Restaurer remplace tous les profils après aperçu. L’état précédent est sauvegardé en `avant-restauration-<uuid>.json` à côté de la base. Si la sauvegarde préventive échoue, la restauration n’a pas lieu. Une version inconnue ou des références invalides sont refusées avant modification. Pour revenir en arrière, restaurer le fichier préventif.

Les exemples `fixtures/mesures.csv` et `fixtures/mesures.json` sont entièrement fictifs.

En cas de modification simultanée par une autre fenêtre, une révision SQLite empêche tout écrasement silencieux. Réessayer l’action recharge la dernière version de la base.
