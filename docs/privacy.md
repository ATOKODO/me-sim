# Confidentialité et stockage

## Où restent les données ?

Me-Sim fonctionne avec une base SQLite dans le dossier local de données de l’application pour le compte système courant ; son chemin exact apparaît dans les préférences. Les profils, observations, habitudes, journées, imports et scénarios sont enregistrés dans cette base.

Aucun compte distant, cloud, API externe, CDN ou télémétrie applicative n’est nécessaire. Les traductions et les ressources du personnage sont embarquées. La WebView ne reçoit pas un accès général au disque ni un accès SQL : les opérations de fichiers passent par les commandes Rust et les sélecteurs natifs.

La langue et le thème sont aussi mémorisés dans le cache local de la WebView pour l’affichage au démarrage. Aucune donnée de santé n’est stockée dans ce cache par l’application. Dans l’aperçu navigateur, les données de démonstration restent temporaires en mémoire.

## Quelle protection existe ?

La base et les exports ne sont pas chiffrés par Me-Sim. Leur protection repose sur la session du compte système et les droits d’accès aux fichiers. Les profils sont séparés dans l’application, mais ne sont pas des comptes authentifiés : une personne ayant accès à la session ou aux fichiers peut accéder à leur contenu.

La documentation et Storybook ne lisent aucune base personnelle. Ils contiennent des guides et des exemples fictifs. Leur recherche est locale. La maintenance du système et du moteur WebView reste celle de la distribution utilisée.

## Sauvegarder et restaurer

Une sauvegarde JSON contient tous les profils et paramètres. Les exports CSV, XLS et XLSX contiennent uniquement les observations du profil choisi ; ils ne remplacent pas une sauvegarde complète.

Une restauration remplace l’espace local après aperçu et crée auparavant une copie JSON de l’état précédent à côté de la base. Ce fichier reste lisible. Les détails et règles de validation sont dans le [guide des données](./data-guide.md#export-et-restauration).

Le dossier choisi pour un export peut être synchronisé par un outil extérieur à Me-Sim. Choisir son emplacement en fonction de la confidentialité souhaitée ; l’application ne contrôle pas les copies réalisées par le système ou par d’autres logiciels.

## Supprimer un profil

La suppression retire les données du profil de la base active. Elle ne supprime pas les exports, sauvegardes préventives, copies système ou fichiers copiés ailleurs. Elle ne constitue pas un effacement forensique du disque.

## Compagnon mobile local

Un [compagnon PWA hors ligne](./mobile-companion.md) est en cours de développement. Il doit permettre de saisir des données sur le téléphone et de les transférer à la base du PC quand les deux appareils se retrouvent sur le réseau local. Les saisies en attente et le jeton d'appairage résident dans le stockage du navigateur du téléphone ; aucun chiffrement applicatif de ce stockage n'est actuellement prévu. La protection du téléphone, de sa session et de son navigateur compte donc aussi. Le service réseau du PC est désactivé par défaut et ne doit pas devenir un accès distant.
