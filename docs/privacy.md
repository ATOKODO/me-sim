# Confidentialité et stockage

## Où restent les données ?

Me-Sim fonctionne avec une base SQLite sur l’ordinateur Windows. L’emplacement par défaut est `%LOCALAPPDATA%\fr.mesim.desktop\me-sim.db` ; son chemin exact apparaît dans les préférences. Les profils, observations, habitudes, journées, imports et scénarios sont enregistrés dans cette base.

Aucun compte distant, cloud, API externe, CDN ou télémétrie applicative n’est nécessaire. Les traductions et les ressources du personnage sont embarquées. La WebView ne reçoit pas un accès général au disque ni un accès SQL : les opérations de fichiers passent par les commandes Rust et les sélecteurs natifs.

La langue et le thème sont aussi mémorisés dans le cache local de la WebView pour l’affichage au démarrage. Aucune donnée de santé n’est stockée dans ce cache par l’application. Dans l’aperçu navigateur, les données de démonstration restent temporaires en mémoire.

## Quelle protection existe ?

La base et les exports ne sont pas chiffrés par Me-Sim. Leur protection repose sur la session Windows et les droits d’accès aux fichiers. Les profils sont séparés dans l’application, mais ne sont pas des comptes authentifiés : une personne ayant accès à la session ou aux fichiers peut accéder à leur contenu.

La documentation et Storybook ne lisent aucune base personnelle. Ils contiennent des guides et des exemples fictifs. Leur recherche est locale. Les politiques de maintenance de Windows et de WebView2 restent celles du système.

## Sauvegarder et restaurer

Une sauvegarde JSON contient tous les profils et paramètres. Les exports CSV, XLS et XLSX contiennent uniquement les observations du profil choisi ; ils ne remplacent pas une sauvegarde complète.

Une restauration remplace l’espace local après aperçu et crée auparavant une copie JSON de l’état précédent à côté de la base. Ce fichier reste lisible. Les détails et règles de validation sont dans le [guide des données](./data-guide.md#export-et-restauration).

Le dossier choisi pour un export peut être synchronisé par un outil extérieur à Me-Sim. Choisir son emplacement en fonction de la confidentialité souhaitée ; l’application ne contrôle pas les copies réalisées par Windows ou par d’autres logiciels.

## Supprimer un profil

La suppression retire les données du profil de la base active. Elle ne supprime pas les exports, sauvegardes préventives, copies système ou fichiers copiés ailleurs. Elle ne constitue pas un effacement forensique du disque.

## Connexions futures

Aucun compagnon Android/iOS ni accès réseau distant aux données n’est actuellement implémenté. Une éventuelle connexion privée entre appareils devra définir l’authentification, les autorisations, le chiffrement et les limites d’exposition avant son ajout.
