mod companion;
mod domain;
mod exchange;
mod ghost;
mod import_limits;
mod science;
mod store;
use domain::*;
use std::{collections::HashMap, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};
struct AppState {
    store: Mutex<store::Store>,
    companion: Mutex<companion::Runtime>,
    directory: PathBuf,
    books: Mutex<HashMap<String, exchange::Workbook>>,
    previews: Mutex<HashMap<String, exchange::Preview>>,
    restores: Mutex<HashMap<String, Snapshot>>,
}
// @spec TECH-RUST-112
fn lock<T>(m: &Mutex<T>) -> Result<std::sync::MutexGuard<'_, T>> {
    m.lock()
        .map_err(|_| AppError::new("INTERNAL", "Verrou indisponible. Redémarrez l’application."))
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Initial {
    snapshot: Snapshot,
    revision: i64,
    storage_path: String,
    model: science::ModelDefinition,
}
// @spec TECH-RUST-112
#[tauri::command]
fn initial_state(state: State<AppState>) -> Result<Initial> {
    let db = lock(&state.store)?;
    let current = db.current()?;
    Ok(Initial {
        snapshot: current.snapshot,
        revision: current.revision,
        storage_path: state.directory.join("me-sim.db").to_string_lossy().into(),
        model: science::definition(),
    })
}
// @spec TECH-RUST-112
#[tauri::command]
fn mutate(
    operation: Mutation,
    expected_revision: i64,
    state: State<AppState>,
) -> Result<store::VersionedSnapshot> {
    lock(&state.store)?.mutate_at_revision(operation, expected_revision)
}
// @spec TECH-RUST-112
#[tauri::command]
async fn choose_import(state: State<'_, AppState>) -> Result<Option<exchange::Workbook>> {
    let english = matches!(lock(&state.store)?.load()?.settings.language, Language::En);
    let path = rfd::AsyncFileDialog::new()
        .add_filter(
            if english { "Measurements" } else { "Mesures" },
            &["csv", "xls", "xlsx", "json"],
        )
        .pick_file()
        .await;
    let Some(file) = path else { return Ok(None) };
    let book = exchange::read(file.path())?;
    let mut books = lock(&state.books)?;
    books.clear();
    books.insert(book.token.clone(), book.clone());
    Ok(Some(book))
}
// @spec TECH-RUST-112
#[tauri::command]
fn preview_import(
    token: String,
    mapping: exchange::Mapping,
    profile_id: String,
    state: State<AppState>,
) -> Result<exchange::Preview> {
    let books = lock(&state.books)?;
    let book = books
        .get(&token)
        .ok_or_else(|| invalid("Fichier expiré. Sélectionnez-le à nouveau."))?;
    let s = lock(&state.store)?.load()?;
    let p = exchange::preview(book, &mapping, &profile_id, &s)?;
    let mut previews = lock(&state.previews)?;
    previews.clear();
    previews.insert(p.token.clone(), p.clone());
    Ok(p)
}
// @spec TECH-RUST-112
#[tauri::command]
fn commit_import(
    token: String,
    policy: String,
    skip_errors: bool,
    expected_revision: i64,
    state: State<AppState>,
) -> Result<store::VersionedSnapshot> {
    let mut previews = lock(&state.previews)?;
    let p = previews
        .get(&token)
        .ok_or_else(|| invalid("Aperçu expiré."))?;
    let mut db = lock(&state.store)?;
    let mut s = db.load()?;
    db.require_revision(expected_revision)?;
    exchange::commit(&mut s, p, &policy, skip_errors)?;
    db.replace(&s)?;
    previews.remove(&token);
    Ok(db.versioned(s))
}
// @spec TECH-RUST-112
#[tauri::command]
async fn export_data(
    format: String,
    profile_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>> {
    if !["csv", "xls", "xlsx", "json"].contains(&format.as_str()) {
        return Err(invalid("Format inconnu."));
    }
    let s = lock(&state.store)?.load()?;
    if format != "json" && !s.profiles.iter().any(|p| p.id == profile_id) {
        return Err(invalid("Profil introuvable."));
    }
    let name = if format == "json" {
        "me-sim-sauvegarde"
    } else {
        "me-sim-mesures"
    };
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(format!("{name}.{format}"))
        .add_filter(&format, &[format.as_str()])
        .save_file()
        .await;
    let Some(file) = file else { return Ok(None) };
    let path = file.path().to_path_buf();
    if path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        != Some(format.clone())
    {
        return Err(invalid(
            "Utilisez l’extension correspondant au format sélectionné.",
        ));
    }
    exchange::export(&path, &format, &s, &profile_id)?;
    Ok(Some(path.to_string_lossy().into()))
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RestorePreview {
    token: String,
    profiles: Vec<String>,
    observations: usize,
    habit_days: usize,
    scenarios: usize,
}
// @spec TECH-RUST-112
#[tauri::command]
async fn preview_restore(state: State<'_, AppState>) -> Result<Option<RestorePreview>> {
    let english = matches!(lock(&state.store)?.load()?.settings.language, Language::En);
    let file = rfd::AsyncFileDialog::new()
        .add_filter(
            if english {
                "Me-Sim backup"
            } else {
                "Sauvegarde Me-Sim"
            },
            &["json"],
        )
        .pick_file()
        .await;
    let Some(file) = file else { return Ok(None) };
    if std::fs::metadata(file.path())?.len() > 100 * 1024 * 1024 {
        return Err(invalid("Sauvegarde trop volumineuse."));
    }
    let s: Snapshot = serde_json::from_slice(&std::fs::read(file.path())?)?;
    validate(&s)?;
    let token = id();
    let result = RestorePreview {
        token: token.clone(),
        profiles: s.profiles.iter().map(|p| p.name.clone()).collect(),
        observations: s.observations.len(),
        habit_days: s.habit_days.len(),
        scenarios: s.scenarios.len(),
    };
    let mut restores = lock(&state.restores)?;
    restores.clear();
    restores.insert(token, s);
    Ok(Some(result))
}
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Restored {
    state: store::VersionedSnapshot,
    backup_path: String,
}
// @spec TECH-RUST-112
#[tauri::command]
fn commit_restore(
    token: String,
    expected_revision: i64,
    state: State<AppState>,
) -> Result<Restored> {
    let mut pending = lock(&state.restores)?;
    let s = pending
        .get(&token)
        .ok_or_else(|| invalid("Aperçu expiré."))?;
    let mut db = lock(&state.store)?;
    let backup = state
        .directory
        .join(format!("avant-restauration-{}.json", id()));
    let previous = db.load()?;
    db.require_revision(expected_revision)?;
    exchange::atomic_write(&backup, &serde_json::to_vec_pretty(&previous)?)?;
    db.replace_for_restore(s)?;
    let versioned = db.versioned(s.clone());
    drop(db);
    pending.clear();
    lock(&state.previews)?.clear();
    lock(&state.books)?.clear();
    Ok(Restored {
        state: versioned,
        backup_path: backup.to_string_lossy().into(),
    })
}
// @spec TECH-RUST-112
#[tauri::command]
fn run_simulation(
    profile_id: String,
    scenario_id: String,
    state: State<AppState>,
) -> Result<SimulationRun> {
    let s = lock(&state.store)?.load()?;
    let p = s
        .profiles
        .iter()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| invalid("Profil introuvable."))?;
    let v = s
        .scenarios
        .iter()
        .find(|v| v.id == scenario_id && v.profile_id == profile_id)
        .ok_or_else(|| invalid("Scénario introuvable."))?;
    science::run(p, v)
}
// @spec TECH-RUST-112
#[tauri::command]
fn companion_start(
    profile_id: String,
    app: tauri::AppHandle,
) -> Result<companion::CompanionStatus> {
    companion::start(app, profile_id)
}
// @spec TECH-RUST-112
#[tauri::command]
fn companion_status(state: State<AppState>) -> Result<companion::CompanionStatus> {
    companion::status(&state)
}
// @spec TECH-RUST-112
#[tauri::command]
fn companion_new_pairing_code(state: State<AppState>) -> Result<companion::CompanionStatus> {
    companion::refresh_pairing(&state)
}
// @spec TECH-RUST-112
#[tauri::command]
fn companion_stop(state: State<AppState>) -> Result<companion::CompanionStatus> {
    companion::stop(&state)
}
// @spec TECH-RUST-112
#[tauri::command]
fn companion_revoke(
    device_id: String,
    state: State<AppState>,
) -> Result<companion::CompanionStatus> {
    companion::revoke(&state, &device_id)
}
// @spec TECH-RUST-112
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = app.path().app_local_data_dir()?;
            #[cfg(debug_assertions)]
            let directory = std::env::var_os("ME_SIM_TEST_DATA_DIR")
                .map(PathBuf::from)
                .unwrap_or(directory);
            std::fs::create_dir_all(&directory)?;
            let db = store::Store::open(&directory.join("me-sim.db"))
                .map_err(|e| std::io::Error::other(e.message))?;
            app.manage(AppState {
                store: Mutex::new(db),
                companion: Mutex::new(companion::Runtime::default()),
                directory,
                books: Mutex::new(HashMap::new()),
                previews: Mutex::new(HashMap::new()),
                restores: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            initial_state,
            mutate,
            choose_import,
            preview_import,
            commit_import,
            export_data,
            preview_restore,
            commit_restore,
            run_simulation,
            companion_start,
            companion_status,
            companion_new_pairing_code,
            companion_stop,
            companion_revoke
        ])
        .run(tauri::generate_context!())
        .expect("Impossible de démarrer Me-Sim");
}
