---
kind: technical
title: Compagnon mobile — contrats techniques
---
# Compagnon mobile

## TECH-COMPANION-DATA — Opérations et validation

Implémente REQ-COMPANION-CAPTURE et REQ-COMPANION-SYNC. Les opérations sont des objets sérialisables associés à un profil et identifiées par leur UUID fourni par l’appelant ; les données ne sont pas une prédiction ou une évaluation médicale.

- `localDate(now)` et `localTime(now)` formatent respectivement la date locale en `AAAA-MM-JJ` et l’heure locale en `HH:mm`, avec la date courante par défaut.
- `validDate(date)` accepte seulement une date ISO calendaire existante ; il renvoie un booléen.
- `observationOperation` valide identifiants, date, métrique du catalogue, valeur finie dans ses bornes, entier si requis et heure `HH:mm` pour une activité positive. Elle renvoie une opération avec unité, provenance mobile et durée applicable ; une entrée invalide déclenche une erreur.
- `habitOperation` exige des identifiants, une date valide et une réponse booléenne ; elle renvoie une opération de réponse, ou déclenche une erreur si les entrées sont invalides.
- `applySyncResult(operations, result)` retire les identifiants acceptés et associe aux opérations restantes les statuts et motifs de conflit ou de rejet connus. L’appelant valide la cohérence de l’accusé avant cet appel.

## TECH-COMPANION-STORAGE — File et préférences IndexedDB

Implémente REQ-COMPANION-CAPTURE et REQ-COMPANION-SYNC. La base IndexedDB `me-sim-companion` contient les magasins `settings` et `operations` indexé par identifiant. Les opérations écrites par transaction sont conservées sur le téléphone sous réserve des garanties du navigateur.

- `open()` ouvre ou initialise la base et propage les erreurs d’ouverture ; `request()` convertit une requête IndexedDB en promesse, résolue avec son résultat ou rejetée avec son erreur.
- `withStore(name, mode, task)` exécute la tâche sur un magasin dans une transaction et ferme la connexion après sa terminaison ; les erreurs de tâche, de transaction ou d’annulation sont propagées.
- `getSetting`, `putSetting` lisent et écrivent une préférence par clé. `addOperation` ajoute une entrée ; `replaceOperation` supprime l’ancienne et ajoute la nouvelle dans la même transaction ; `deleteOperation` retire une entrée.
- `allOperations` lit la file complète. `updateOperations(operations, acceptedIds)` supprime les entrées acceptées et réécrit les opérations restantes au sein d’une transaction. Les erreurs de stockage sont propagées aux appels de l’interface.

## TECH-COMPANION-UI — Interface et synchronisation

Implémente REQ-COMPANION-CAPTURE et REQ-COMPANION-SYNC. L’interface conserve une copie en mémoire des profils, du profil actif, du jeton et de la file. Les fonctions de rendu utilisent le DOM local ; elles ne téléversent pas de données à elles seules.

- `$` retrouve un élément par son identifiant ; `notice` affiche un message et son état d’erreur ; `connection` indique l’état du PC et du réseau.
- `selectedProfile` retrouve le profil actif ; `profileName` renvoie son nom ou un libellé de remplacement. `renderProfiles` actualise le sélecteur et les panneaux ; `activeHabits` filtre les habitudes selon la date et l’archivage ; `renderHabits` affiche les réponses en attente. `renderQueue` affiche au maximum les 30 dernières opérations et permet de les retirer ; `renderMetric` met à jour les bornes et la visibilité de l’heure selon la métrique.
- `queue` ajoute ou remplace une opération en stockage puis actualise la file ; la file est limitée à 2 000 ajouts et une synchronisation peut être tentée lorsque le réseau est disponible. Une erreur de stockage reste propagée. `saveHabit` construit une réponse et affiche une erreur si elle ne peut pas être sauvegardée.
- `api` exige un contexte sécurisé, envoie une requête JSON sans cookies avec jeton quand il existe, abandonne après 10 secondes et propage les erreurs HTTP et réseau. Une réponse 401 hors association efface le jeton local sans supprimer les saisies.
- `refreshBootstrap` récupère les profils, vérifie que la réponse est un tableau et persiste le résultat. `sync` ignore les appels concurrents et envoie les opérations sans statut par lots de 50 ; elle valide l’unicité et l’appartenance des identifiants reçus avant de mettre à jour la file. Les conflits et refus restent dans la file ; une interruption conserve les opérations non acquittées et indique la déconnexion.
- `setTab` affiche le panneau de saisie choisi. `start` enregistre le service worker lorsque possible, recharge réglages et file, initialise dates et métriques et tente une mise à jour si associé et en ligne. Une erreur IndexedDB arrête l’initialisation et affiche un message.
