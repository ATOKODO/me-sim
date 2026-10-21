# Mode fantôme {#ghost-mode}

Depuis **Mes habitudes → Mon fantôme**, ou **Comparer avec mon fantôme** sur l’aperçu, suivre une journée à la minute face à une référence. Ce mode décrit des activités déclarées, sans projection de santé, score médical ni collecte automatique d’Instagram ou du téléphone.

## Choisir une référence {#references}

- **Journée passée** : sélectionner une date antérieure au jour suivi. Les créneaux rejouent les observations horodatées ; les trous restent inconnus.
- **Période** : les 7, 14 ou 30 jours précédant le jour suivi, avec filtre tous les jours, lundi–vendredi ou week-ends. Ce filtre décrit le calendrier, pas les horaires réels de travail. Comparer une catégorie ou un nom personnalisé, par exemple Instagram.
- **Target** : les journées types applicables au jour suivi, avec leurs créneaux prévus. Le planning horaire complète les objectifs quantitatifs du tableau de bord ; il ne les remplace pas et ne les déduit pas automatiquement.

La fréquence à l’heure sélectionnée indique le nombre de jours portant cette activité parmi les jours renseignés à cette heure, ainsi que la couverture sur la période entière. Une absence de données n’est pas un zéro. La moyenne porte seulement sur les quantités enregistrées les jours disposant d’activités jusqu’à l’heure choisie ; elle ne prétend pas mesurer une journée entière. Une référence sans données reste `?`.

## Direct, relecture et personnages {#live-and-replay}

Le direct suit l’horloge locale à la minute et se rafraîchit au retour sur l’application. Déplacer le curseur passe en relecture ; **Lire la journée** avance de cinq minutes toutes les 300 ms et s’arrête en fin de journée. **Revenir au direct** revient à aujourd’hui.

Le personnage illustre l’activité enregistrée à l’heure choisie ; un personnage transparent illustre la référence dans la même pièce. Les animations utilisent les mêmes assets remplaçables que la timeline existante, y compris le modèle féminin. Une référence inconnue masque le fantôme. Des activités simultanées ou une égalité dans la référence statistique ne choisissent pas arbitrairement une activité. Désactiver les animations dans les préférences conserve les informations et poses ; l’indisponibilité de WebGL n’empêche pas la saisie ni la comparaison.

Les timelines partagent l’axe 00:00–24:00. Cliquer un créneau affiche ses détails. Les événements ponctuels, dont tabac et alcool, gardent leur quantité ; ils ne deviennent pas artificiellement des minutes. Les durées simultanées d’une même catégorie sont réunies pour éviter les doubles comptes. Les zones hachurées indiquent les zones inconnues ou non planifiées.

## Déclarer une activité {#sessions}

Choisir une catégorie, éventuellement une habitude liée et un nom personnalisé. **Je commence maintenant** ouvre une session locale. **Terminer et enregistrer** crée une observation dans le journal ; **Pause** enregistre le segment, puis une nouvelle session peut être démarrée. Si une habitude est liée, sa réponse est mise à Oui pour le jour de début et sa journée doit être validée à nouveau. Une réalisation d’habitude à réduire reste une réponse Oui, sans inversion silencieuse.

Une seule session peut être ouverte par profil. Dans l’application Windows, elle reste enregistrée après navigation et fermeture, avec son instant initial. Elle n’est pas fermée automatiquement : corriger la fin si nécessaire. Une session doit durer au plus 24 heures et ne peut finir dans le futur. L’abandon demande confirmation et ne crée aucune observation. Les conflits de révision ou de créneau sont refusés sans perdre la session.

Le journal permet de corriger date, heure, quantité et nom ; une correction manuelle retire les instants absolus de la session et conserve une déclaration locale. Les anciennes observations restent utilisables. Les sessions conservent leurs instants avec décalage UTC et leur fuseau déclaré : les durées écoulées sont calculées entre instants, y compris au changement d’heure. La comparaison affiche les heures dans le fuseau actuel du poste ; une heure répétée peut porter plusieurs créneaux. Le nom du fuseau est une métadonnée, sans service distant.

## Planifier un changement {#target-planning}

Créer plusieurs journées types, choisir leurs jours de semaine et ajouter des activités avec nom, heure et durée. Un créneau doit tenir dans la journée ; pour traverser minuit, créer un créneau de chaque côté. Les chevauchements restent visibles et sont signalés.

Chaque sauvegarde ajoute une version. La date d’application est aujourd’hui ou une date future ; les jours précédents ne changent pas. À date égale, la dernière version enregistrée prévaut pour cette journée type. Une version vide suspend ses créneaux à partir de sa date. L’historique est conservé dans le profil. Depuis un créneau sélectionné, **Préparer un changement sur ce créneau** prépare une nouvelle activité sur le même horaire pour le lendemain ; vérifier puis enregistrer explicitement.

## Stockage et limites {#storage-and-limits}

Profils, sessions et plannings restent dans la base locale et la sauvegarde JSON complète, avec contrôle transactionnel des révisions. Les anciennes bases et sauvegardes sans mode fantôme restent lisibles. Les exports CSV/XLS/XLSX restent des mesures tabulaires : ils ne remplacent pas le JSON pour les noms, liens d’habitudes, instants absolus, sessions ouvertes et versions de planning. L’aperçu navigateur est temporaire en mémoire et ne survit pas au rechargement, comme le reste de l’aperçu.

Les créneaux statistiques sont affichés sur une grille de 15 minutes ; le détail à l’heure choisie utilise la minute sélectionnée. Limites par profil : 2 000 versions et 128 créneaux par version. Aucune surveillance automatique des usages, aucun cloud, notification ou connexion mobile n’est ajouté par ce mode. Les autres limites de confidentialité sont décrites dans le [guide dédié](./privacy.md).

Les créneaux Target peuvent définir une marge de début de 0 à 180 minutes. Le détail prévu/réalisé rapproche les sessions par habitude ou catégorie puis horaire le plus proche ; les noms personnalisés d’écran doivent correspondre. Il affiche décalage du début, différence de durée, créneaux à venir et absences non renseignées. Ce rapprochement est une aide de lecture, pas une preuve de réalisation.

Les segments de session conservent leurs instants distincts même lorsqu’ils commencent dans la même minute affichée. Le journal garde la date de début ; les récapitulatifs et la déviation quantitative répartissent les sessions nocturnes entre les jours concernés. Les événements ponctuels peuvent être liés à une habitude de même catégorie. Corriger ou supprimer ensuite une observation ne retire pas automatiquement une réponse du calendrier : vérifier cette déclaration et la validation de sa journée.
