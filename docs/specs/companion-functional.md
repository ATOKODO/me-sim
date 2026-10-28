---
kind: functional
title: Compagnon mobile — besoins
---
# Compagnon mobile

## REQ-COMPANION-CAPTURE — Saisir sans connexion

Une personne peut choisir un profil associé au PC et enregistrer depuis son téléphone une mesure ou une réponse d’habitude. Une date est requise, ainsi qu’une heure pour une activité positive. Les saisies restent sur le téléphone en attendant leur transmission. Le compagnon met à disposition uniquement les métriques prévues par son catalogue ; les quantités restent dans le journal.

## REQ-COMPANION-SYNC — Synchroniser sur le réseau local

Après association au PC, les opérations en attente sont envoyées au service du compagnon. Les opérations acceptées sont retirées de la file locale ; celles refusées ou en conflit restent visibles avec leur motif. En cas de perte de connexion ou d’accès révoqué, les saisies non envoyées sont conservées. L’accès aux API exige un contexte sécurisé ; l’installation hors ligne dépend de la prise en charge du service worker et du stockage par le navigateur.
