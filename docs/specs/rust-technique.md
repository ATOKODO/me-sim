---
kind: technical
title: Contrats techniques du moteur Rust
---

# Contrats techniques du moteur Rust

Ce document décrit le comportement actuellement implémenté ; il ne certifie ni l'exécution ni la réussite des tests. Les erreurs `Result` contiennent une erreur applicative, SQLite, d'entrée-sortie ou de désérialisation selon l'opération. Les mutations d'un instantané en mémoire doivent être validées et enregistrées par le magasin avant d'être persistées.

## TECH-RUST-101 — Domaine, unités et validation

Implémente REQ-RUST-101 et REQ-RUST-103.

`AppError::new` construit une erreur à partir d'un code et d'un message ; `invalid` construit une erreur d'entrée invalide. Les conversions d'erreurs et les implémentations `Default` définissent les valeurs de repli des structures correspondantes ; `id` produit un identifiant UUID. `unit` associe une métrique connue à son unité, ou renvoie `None`. `observation_key` sélectionne la clé temporelle servant à identifier une mesure.

`validate_target`, `validate_observation` et `validate` reçoivent respectivement une journée cible, une observation et un instantané. Elles renvoient `Ok(())` si leurs contraintes de format, de plage et de références sont respectées, sinon une erreur ; elles ne persistent aucune donnée. `mutate` reçoit un instantané mutable et une opération typée, modifie les collections correspondantes puis valide l'ensemble ; l'appelant doit travailler sur une copie pour conserver l'état précédent en cas d'erreur. La suppression d'un profil supprime également ses données liées.

## TECH-RUST-102 — Stockage SQLite et concurrence

Implémente REQ-RUST-101 et REQ-RUST-102.

`open` ouvre le chemin fourni, `init` configure SQLite et applique les migrations jusqu'à la version 4 ; une version plus récente est refusée. `load` lit un instantané et sa révision dans une transaction ; `current` renvoie les deux, et `versioned` associe la révision connue à un instantané fourni. `require_revision` refuse une révision périmée avec `CONCURRENT_CHANGE`. `mutate_at_revision` charge et clone l'état, vérifie la révision attendue, applique la mutation puis persiste la différence.

`replace`, `replace_with_companion_ops` et `replace_for_restore` délèguent à `replace_inner` : l'instantané est validé puis écrit dans une transaction immédiate avec vérification de révision et incrément de celle-ci. Les opérations compagnon sont enregistrées dans la même transaction ; une restauration complète révoque les appareils. Les erreurs de validation, concurrence ou SQLite interrompent la transaction.

## TECH-RUST-103 — Écriture incrémentale

Implémente REQ-RUST-101 et REQ-RUST-105.

`changes` compare les collections avant/après par clé et détermine suppressions, écritures et déplacements nécessaires à leur ordre. `read` et son aide `rows` reconstruisent l'instantané depuis les lignes JSON ordonnées par `rowid`. `owned_rows` et `write` enregistrent uniquement les différences dans la transaction fournie en conservant l'ordre et les relations de profil. `replace_all` remplace les lignes pour une restauration. Une erreur SQL ou JSON est propagée ; la validation et la clôture de transaction relèvent du magasin appelant.

## TECH-RUST-104 — Planning et sessions

Implémente REQ-RUST-103.

Les prédicats `label`, `event` et `link` contrôlent respectivement le libellé, les métriques d'activité prises en charge et le lien éventuel à une habitude du profil. `validate_profile` vérifie les versions de planning, créneaux et session active ; `validate_context` contrôle les dates RFC 3339 et la cohérence entre horaires et durée d'une observation. Les erreurs signalent les éléments invalides.

`save_plan` ajoute une version non dupliquée dont la date de début n'est pas passée. `start` ouvre une session pour un profil lorsqu'aucune autre n'est active et que le début n'est pas trop futur. `finish`, avec une fin, crée une observation de durée positive au plus égale à 24 heures et renseigne éventuellement l'habitude liée ; sans fin, elle annule simplement la session. `record_habit` et `validate_link` contrôlent et enregistrent les liens appropriés entre observation et habitude, sans valider la journée. Ces fonctions modifient l'instantané fourni ; les erreurs ne sont persistées que si l'appelant les ignore.

## TECH-RUST-105 — Lecture et préparation d'import

Implémente REQ-RUST-102 et REQ-RUST-106.

`read` accepte un chemin CSV, XLS, XLSX ou JSON, vérifie les limites avant de produire un classeur contenant ses feuilles et un jeton. `metric_name` normalise les noms reconnus ; `parse_row` utilise le mapping, les unités et la date choisie pour convertir une ligne en observation ou fournir une erreur. `preview` reçoit le classeur, le mapping, l'identifiant de profil et l'instantané ; il produit un aperçu des lignes valides, erreurs, doublons et conflits sans enregistrer de données. Les fichiers ou mappings invalides sont refusés.

## TECH-RUST-106 — Validation d'import et exports

Implémente REQ-RUST-102.

`commit` applique à un instantané un aperçu d'import confirmé selon la politique de conflit et le choix d'ignorer ou non les lignes erronées ; il renvoie le nombre importé ou une erreur. L'appelant valide puis persiste le résultat transactionnellement. `cells` extrait les mesures du profil pour les formats tabulaires. `export` écrit les formats CSV, XLS, XLSX ou la sauvegarde JSON de l'espace. `atomic_write` écrit un fichier temporaire puis le place à la destination. `record`, `bof` et `xls` construisent les enregistrements BIFF du format XLS ; les limites ou erreurs d'écriture sont propagées.

## TECH-RUST-107 — Limites communes aux imports

Implémente REQ-RUST-106.

`read_file` lit au plus 25 Mio, en contrôlant à la fois les métadonnées et la lecture effective. `add` et `rect` vérifient les additions, multiplications et plafonds de lignes, colonnes et cellules ; `Extent::include` et `Extent::cells` suivent la zone rectangulaire utilisée. `u16_at` et `u32_at` lisent des entiers little-endian et refusent les données tronquées. Les dépassements et opérations impossibles renvoient une erreur avant l'allocation d'une grande plage.

## TECH-RUST-108 — Contrôle des classeurs XLS

Implémente REQ-RUST-106.

`xls` reçoit les octets d'un classeur binaire et reconstruit un fichier contenant le flux Workbook contrôlé. `biff_record`, `xls_dimensions` et `biff` parcourent les enregistrements et contrôlent dimensions et cellules ; `sst` vérifie les chaînes partagées et leur budget. Les méthodes du lecteur de segments avancent, lisent ou sautent les données BIFF, y compris leurs continuations ; une structure tronquée, une formule interdite ou un dépassement produit une erreur.

## TECH-RUST-109 — Contrôle des classeurs XLSX

Implémente REQ-RUST-106.

`xlsx` contrôle l'archive reçue avant la lecture des feuilles. `zip_directory` vérifie les entrées et tailles de l'archive, `coordinate` et `decimal` décodent les positions de cellules et `xml` parcourt le contenu XML sous budgets de taille et de complexité. Les archives malformées, coordonnées invalides, formules non prises en charge ou dépassements sont refusés par une erreur.

## TECH-RUST-110 — Contrôle CSV et JSON

Implémente REQ-RUST-106.

`csv` parcourt les octets avec le séparateur fourni et contrôle la structure ainsi que les limites de lignes, colonnes et texte. `json` vérifie une table JSON avant sa conversion ; ses visiteurs Serde (`deserialize`, `expecting`, `visit_seq`, `visit_map` et `visit_*`) comptent les éléments et acceptent les types scalaires pris en charge. Les structures imbriquées non admises, fichiers malformés et dépassements renvoient une erreur.

## TECH-RUST-111 — Compagnon et synchronisation locale

Implémente REQ-RUST-105.

`lan_ip` choisit une adresse IPv4 privée ou link-local ; `ca_and_server` crée ou recharge une autorité locale et construit un certificat TLS pour cette adresse. `code` et `new_pairing` créent un code d'appariement à durée limitée. `start` vérifie le profil, ouvre le port local 18439 et démarre le serveur ; `status`, `stop`, `refresh_pairing` et `revoke` exposent ou modifient son état et ses appareils. Les verrous, réseau, certificats et base peuvent produire une erreur.

`authenticated` vérifie le jeton pour le profil demandé. `sync` valide les opérations du téléphone, leur profil et leur identité, puis les applique avec les identifiants de déduplication dans une transaction. `read_request`, `response`, `json_response`, `configure_connection` et `serve` gèrent les requêtes et réponses HTTPS locales sous limites de taille et de connexions. `sha256_hex` calcule un condensat et `internal` convertit une erreur en erreur compagnon.

## TECH-RUST-112 — Commandes Tauri et simulation

Implémente REQ-RUST-102, REQ-RUST-104 et REQ-RUST-105.

`lock` transforme un verrou empoisonné en erreur. `initial_state` renvoie l'instantané, sa révision, l'emplacement local et la définition du modèle ; `mutate` applique une opération sous contrôle de révision. `choose_import` et `preview_import` lisent un fichier et conservent les jetons temporaires ; `commit_import` vérifie le jeton et la révision avant écriture. `export_data` ouvre le dialogue et vérifie le format et l'extension. `preview_restore` valide la sauvegarde choisie ; `commit_restore` sauvegarde l'état existant puis restaure l'aperçu. Une annulation de dialogue renvoie `None`, les autres erreurs sont propagées.

Les commandes compagnon délèguent au module local. `run_simulation` cherche le profil et le scénario correspondant puis délègue au modèle sans enregistrer de résultat. `definition` décrit un modèle désactivé ; `science::run` distingue les données manquantes et les profils ou horizons hors domaine, puis retourne `MODEL_NOT_VALIDATED`. `research_late_phase` est un calcul déterministe de recherche isolé, limité à 365 jours et à des entrées finies admissibles ; il n'est pas exposé comme projection de production. Les fonctions `main` et `run` initialisent respectivement le programme de compilation et l'application.

## TECH-RUST-113 — Tests et aides de test

Implémente REQ-RUST-107.

Les fonctions sous `#[cfg(test)]` construisent des données temporaires et exercent les contrats de leur module par assertions. Les helpers de test fabriquent notamment des instantanés, mappings, archives ZIP ou classeurs BIFF en mémoire ; ils renvoient leurs fixtures ou échouent sur une assertion. Les tests individuels vérifient les propriétés indiquées par leur nom : isolation des profils, atomicité et concurrence SQLite, limites des imports, conservation des horaires, état des sessions, refus du modèle non validé et synchronisation idempotente. Une assertion échouée fait échouer le test ; ces fonctions ne constituent pas une API de production.
