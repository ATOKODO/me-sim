---
kind: functional
title: Contrats fonctionnels du moteur local
---

# Contrats fonctionnels du moteur local

## REQ-RUST-101 — Données personnelles et profils

Les données de chaque profil, ses mesures, ses habitudes, ses scénarios et ses sessions sont conservés localement. Une suppression de profil retire ses données associées. Les modifications concurrentes ne doivent pas écraser silencieusement une version plus récente.

## REQ-RUST-102 — Échange et sauvegarde

L'utilisateur peut préparer un import, en examiner les erreurs et conflits puis le confirmer. Les mesures peuvent être exportées et l'espace local sauvegardé en JSON versionné. Une restauration n'est appliquée qu'après validation et création d'une sauvegarde préalable.

## REQ-RUST-103 — Activités et planning

Un profil peut conserver les versions de son planning et une session en cours. Terminer une session crée une observation horodatée ; annuler une session ne crée pas d'observation. Les habitudes liées peuvent être renseignées sans valider automatiquement la journée.

## REQ-RUST-104 — Simulation

Les scénarios sont conservés, mais aucune projection scientifique n'est proposée tant que le modèle n'est pas validé. Les données manquantes et les profils hors domaine sont signalés distinctement.

## REQ-RUST-105 — Compagnon local

Le propriétaire peut activer un serveur local pour un profil, apparier un téléphone, synchroniser ses saisies et révoquer l'accès. L'appariement et les données restent sous le contrôle du PC ; aucun service distant n'est requis.

## REQ-RUST-106 — Robustesse des fichiers

Un fichier importé doit respecter des limites de taille et de complexité avant son traitement. Les structures malformées ou trop volumineuses sont refusées sans importer partiellement leurs données.

## REQ-RUST-107 — Régression

Les tests automatisés vérifient notamment l'isolation des profils, les transactions, les formats d'échange, les sessions et la synchronisation du compagnon.
