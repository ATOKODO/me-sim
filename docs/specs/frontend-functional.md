---
kind: functional
title: Spécifications fonctionnelles du frontal
---

# Parcours utilisateur

## REQ-FRONTEND-PROFILE-101 — Profils et présentation

L'utilisateur sélectionne, crée, modifie et supprime des profils. L'interface utilise la langue et le thème choisis localement. L'aperçu navigateur utilise uniquement des données de démonstration en mémoire ; les données personnelles persistantes sont gérées par l'application native.

## REQ-FRONTEND-JOURNAL-101 — Journal et données

L'utilisateur renseigne et corrige des observations. Il peut préparer un import, examiner son aperçu et confirmer son application, exporter les mesures et prévisualiser puis confirmer une restauration. Les échanges de fichiers nécessitent l'application native. Une donnée absente est présentée comme inconnue.

## REQ-FRONTEND-HABITS-101 — Habitudes et journée cible

L'utilisateur configure des habitudes à cultiver ou à réduire, répond jour par jour et valide une journée complète. Il peut comparer les mesures présentes à une journée cible. Le score et l'écart décrivent les données saisies et ne constituent pas une évaluation médicale.

## REQ-FRONTEND-GHOST-101 — Comparaison horaire

L'utilisateur consulte une journée, une référence historique ou un planning ; il peut naviguer dans le temps, lancer ou terminer une session et configurer ses routines. Une absence d'observation n'est pas interprétée comme une activité inexistante.

## REQ-FRONTEND-SCENE-101 — Scène et animation

La scène permet de regarder un avatar et des activités dans une pièce, de modifier la caméra et de désactiver les animations selon les préférences. Les représentations sont illustratives et ne prédisent pas une apparence future.

## REQ-FRONTEND-FUTURES-101 — Scénarios et limites

L'utilisateur peut préparer et gérer des scénarios. Les projections scientifiques ne sont activées que lorsque le modèle et ses conditions ont été validés ; la création d'un scénario ne constitue pas une prédiction.

## REQ-FRONTEND-COMPANION-101 — Compagnon local

L'utilisateur commande le service compagnon, l'appairage et la révocation depuis les préférences. Le service est local au réseau prévu ; l'interface présente son état et ses erreurs.
