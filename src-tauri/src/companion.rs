use crate::domain::{self, AppError, HabitDay, Observation, Result};
use crate::{lock, AppState};
use chrono::{Duration, Utc};
use rcgen::{BasicConstraints, CertificateParams, IsCa, Issuer, KeyPair, KeyUsagePurpose, SanType};
use rusqlite::{params, OptionalExtension};
use rustls::pki_types::{PrivateKeyDer, PrivatePkcs8KeyDer};
use rustls::{ServerConfig, ServerConnection, StreamOwned};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};
use std::io::{Read, Write};
use std::net::{IpAddr, Ipv4Addr, TcpListener, TcpStream, UdpSocket};
use std::path::Path;
use std::sync::atomic::AtomicUsize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration as StdDuration, Instant};
use tauri::{Emitter, Manager};

const PORT: u16 = 18439;
const PAIR_TTL_MINUTES: i64 = 5;
const MAX_BODY: usize = 128 * 1024;
const MAX_OPERATIONS: usize = 100;
const MAX_HEADER: usize = 16 * 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub id: String,
    pub name: String,
    pub profile_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanionStatus {
    pub running: bool,
    pub url: Option<String>,
    pub port: Option<u16>,
    pub certificate_path: Option<String>,
    pub certificate_fingerprint: Option<String>,
    pub pairing_code: Option<String>,
    pub pairing_expires_at: Option<String>,
    pub profile_id: Option<String>,
    pub devices: Vec<Device>,
}

struct Pairing {
    code: String,
    expires_at: chrono::DateTime<Utc>,
    failures: u8,
    blocked_until: Option<Instant>,
}

pub struct Runtime {
    stop: Option<Arc<AtomicBool>>,
    thread: Option<JoinHandle<()>>,
    address: Option<String>,
    profile_id: Option<String>,
    cert_path: Option<String>,
    cert_fingerprint: Option<String>,
    pairing: Arc<Mutex<Option<Pairing>>>,
}

impl Default for Runtime {
    fn default() -> Self {
        Self {
            stop: None,
            thread: None,
            address: None,
            profile_id: None,
            cert_path: None,
            cert_fingerprint: None,
            pairing: Arc::new(Mutex::new(None)),
        }
    }
}

fn internal(e: impl ToString) -> AppError {
    AppError::new("COMPANION", e)
}

fn lan_ip() -> Result<Ipv4Addr> {
    let socket = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0))?;
    socket.connect((Ipv4Addr::new(192, 0, 2, 1), 9))?;
    let IpAddr::V4(ip) = socket.local_addr()?.ip() else {
        return Err(internal("Aucune adresse IPv4 locale disponible."));
    };
    if !(ip.is_private() || ip.is_link_local()) {
        return Err(internal("Connectez ce PC à un réseau Wi-Fi privé."));
    }
    Ok(ip)
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn ca_and_server(
    directory: &Path,
    ip: Ipv4Addr,
) -> Result<(Arc<ServerConfig>, String, String, Vec<u8>)> {
    let ca_path = directory.join("companion-ca.crt");
    let key_path = directory.join("companion-ca-key.pem");
    let (ca_pem, key_pem) = if ca_path.exists() && key_path.exists() {
        (
            std::fs::read_to_string(&ca_path)?,
            std::fs::read_to_string(&key_path)?,
        )
    } else if ca_path.exists() || key_path.exists() {
        return Err(internal("Certificat compagnon incomplet ; restaurez les deux fichiers ou supprimez-les tous les deux."));
    } else {
        let key = KeyPair::generate().map_err(internal)?;
        let mut params = CertificateParams::new(Vec::<String>::new()).map_err(internal)?;
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.key_usages = vec![KeyUsagePurpose::KeyCertSign, KeyUsagePurpose::CrlSign];
        params
            .distinguished_name
            .push(rcgen::DnType::CommonName, "Me-Sim local companion CA");
        let cert = params.self_signed(&key).map_err(internal)?;
        let ca_pem = cert.pem();
        let key_pem = key.serialize_pem();
        // The private key lives only in this user's local application data directory.
        crate::exchange::atomic_write(&key_path, key_pem.as_bytes())?;
        crate::exchange::atomic_write(&ca_path, ca_pem.as_bytes())?;
        (ca_pem, key_pem)
    };
    let ca_key = KeyPair::from_pem(&key_pem).map_err(internal)?;
    let issuer = Issuer::from_ca_cert_pem(&ca_pem, &ca_key).map_err(internal)?;
    let ca_der =
        rustls::pki_types::pem::PemObject::from_pem_slice(ca_pem.as_bytes()).map_err(internal)?;
    let ca_der: rustls::pki_types::CertificateDer<'static> = ca_der;
    let leaf_key = KeyPair::generate().map_err(internal)?;
    let mut leaf = CertificateParams::new(Vec::<String>::new()).map_err(internal)?;
    leaf.subject_alt_names
        .push(SanType::IpAddress(IpAddr::V4(ip)));
    leaf.distinguished_name
        .push(rcgen::DnType::CommonName, "Me-Sim companion");
    leaf.key_usages = vec![KeyUsagePurpose::DigitalSignature];
    leaf.extended_key_usages = vec![rcgen::ExtendedKeyUsagePurpose::ServerAuth];
    let certificate = leaf.signed_by(&leaf_key, &issuer).map_err(internal)?;
    let key = PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(leaf_key.serialize_der()));
    let config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(vec![certificate.der().clone(), ca_der.clone()], key)
        .map_err(internal)?;
    Ok((
        Arc::new(config),
        ca_path.to_string_lossy().into(),
        sha256_hex(ca_pem.as_bytes()),
        ca_pem.into_bytes(),
    ))
}

fn code() -> String {
    let bytes = uuid::Uuid::new_v4().into_bytes();
    let number = u32::from_le_bytes(bytes[..4].try_into().unwrap()) % 1_000_000;
    format!("{number:06}")
}

fn new_pairing(runtime: &Runtime) -> Result<()> {
    *lock(&runtime.pairing)? = Some(Pairing {
        code: code(),
        expires_at: Utc::now() + Duration::minutes(PAIR_TTL_MINUTES),
        failures: 0,
        blocked_until: None,
    });
    Ok(())
}

pub fn status(state: &AppState) -> Result<CompanionStatus> {
    let runtime = lock(&state.companion)?;
    let running = runtime.stop.is_some();
    let profile_id = runtime.profile_id.clone();
    let pairing = lock(&runtime.pairing)?;
    let active_code = pairing.as_ref().filter(|p| p.expires_at > Utc::now());
    let db = lock(&state.store)?;
    let mut statement = db
        .conn
        .prepare("SELECT id,name,profile_id FROM companion_devices ORDER BY name")?;
    let rows = statement.query_map([], |row| {
        Ok(Device {
            id: row.get(0)?,
            name: row.get(1)?,
            profile_id: row.get(2)?,
        })
    })?;
    let devices = rows.collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(CompanionStatus {
        running,
        url: runtime.address.clone(),
        port: running.then_some(PORT),
        certificate_path: runtime.cert_path.clone(),
        certificate_fingerprint: runtime.cert_fingerprint.clone(),
        pairing_code: active_code.map(|p| p.code.clone()),
        pairing_expires_at: active_code.map(|p| p.expires_at.to_rfc3339()),
        profile_id,
        devices,
    })
}

pub fn start(app: tauri::AppHandle, profile_id: String) -> Result<CompanionStatus> {
    let state = app.state::<AppState>();
    {
        let db = lock(&state.store)?;
        if !db.load()?.profiles.iter().any(|p| p.id == profile_id) {
            return Err(domain::invalid("Profil introuvable."));
        }
    }
    let mut runtime = lock(&state.companion)?;
    if runtime.stop.is_some() {
        if runtime.profile_id.as_deref() == Some(&profile_id) {
            drop(runtime);
            return status(&state);
        }
        return Err(internal("Arrêtez d'abord le partage du profil précédent."));
    }
    let ip = lan_ip()?;
    let listener = TcpListener::bind((ip, PORT))?;
    listener.set_nonblocking(true)?;
    let (tls, path, fingerprint, ca_public) = ca_and_server(&state.directory, ip)?;
    let stop = Arc::new(AtomicBool::new(false));
    let stop_flag = Arc::clone(&stop);
    let pairing = Arc::clone(&runtime.pairing);
    let active_connections = Arc::new(AtomicUsize::new(0));
    let expected_origin = format!("https://{ip}:{PORT}");
    let expected_host = format!("{ip}:{PORT}");
    let companion_url = format!("{expected_origin}/companion/");
    let app_for_thread = app.clone();
    let profile_for_thread = profile_id.clone();
    let thread = thread::spawn(move || {
        while !stop_flag.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, peer)) => {
                    if !(peer.ip().is_loopback()
                        || matches!(peer.ip(), IpAddr::V4(v4) if v4.is_private() || v4.is_link_local()))
                    {
                        continue;
                    }
                    if active_connections.fetch_add(1, Ordering::AcqRel) >= 8 {
                        active_connections.fetch_sub(1, Ordering::AcqRel);
                        continue;
                    }
                    let app = app_for_thread.clone();
                    let tls = Arc::clone(&tls);
                    let pairing = Arc::clone(&pairing);
                    let origin = expected_origin.clone();
                    let host = expected_host.clone();
                    let profile_id = profile_for_thread.clone();
                    let ca_public = ca_public.clone();
                    let stop = Arc::clone(&stop_flag);
                    let connections = Arc::clone(&active_connections);
                    thread::spawn(move || {
                        let _ = serve(
                            stream,
                            tls,
                            &app,
                            &pairing,
                            &stop,
                            &origin,
                            &host,
                            &profile_id,
                            &ca_public,
                        );
                        connections.fetch_sub(1, Ordering::AcqRel);
                    });
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(StdDuration::from_millis(50));
                }
                Err(_) => break,
            }
        }
    });
    runtime.stop = Some(stop);
    runtime.thread = Some(thread);
    runtime.address = Some(companion_url);
    runtime.profile_id = Some(profile_id);
    runtime.cert_path = Some(path);
    runtime.cert_fingerprint = Some(fingerprint);
    new_pairing(&runtime)?;
    drop(runtime);
    status(&state)
}

pub fn stop(state: &AppState) -> Result<CompanionStatus> {
    let mut runtime = lock(&state.companion)?;
    if let Some(flag) = runtime.stop.take() {
        flag.store(true, Ordering::Relaxed);
    }
    if let Some(thread) = runtime.thread.take() {
        let _ = thread.join();
    }
    runtime.address = None;
    runtime.profile_id = None;
    runtime.cert_path = None;
    runtime.cert_fingerprint = None;
    *lock(&runtime.pairing)? = None;
    drop(runtime);
    status(state)
}

pub fn refresh_pairing(state: &AppState) -> Result<CompanionStatus> {
    let runtime = lock(&state.companion)?;
    if runtime.stop.is_none() {
        return Err(internal("Activez d'abord le compagnon mobile."));
    }
    new_pairing(&runtime)?;
    drop(runtime);
    status(state)
}

pub fn revoke(state: &AppState, device_id: &str) -> Result<CompanionStatus> {
    let db = lock(&state.store)?;
    db.conn.execute(
        "DELETE FROM companion_operations WHERE device_id=?1",
        [device_id],
    )?;
    db.conn
        .execute("DELETE FROM companion_devices WHERE id=?1", [device_id])?;
    drop(db);
    status(state)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PairRequest {
    code: String,
    device_id: String,
    device_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SyncRequest {
    device_id: String,
    operations: Vec<MobileOperation>,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct MobileOperation {
    id: String,
    kind: String,
    profile_id: String,
    created_at: String,
    payload: serde_json::Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitAnswer {
    date: String,
    habit_id: String,
    answer: bool,
    at: String,
}

#[derive(Serialize)]
struct Issue {
    id: String,
    reason: String,
}

#[derive(Serialize)]
struct SyncResponse {
    accepted: Vec<String>,
    conflicts: Vec<Issue>,
    rejected: Vec<Issue>,
}

fn authenticated(state: &AppState, bearer: &str, profile_id: &str) -> Result<Option<String>> {
    if bearer.len() < 32 || bearer.len() > 256 {
        return Ok(None);
    }
    let hash = sha256_hex(bearer.as_bytes());
    let db = lock(&state.store)?;
    let record: Option<(String, String)> = db
        .conn
        .query_row(
            "SELECT id,profile_id FROM companion_devices WHERE token_hash=?1",
            [hash],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    let Some((device, scope)) = record else {
        return Ok(None);
    };
    if scope != profile_id || !db.load()?.profiles.iter().any(|p| p.id == scope) {
        return Ok(None);
    }
    Ok(Some(device))
}

fn sync(
    state: &AppState,
    request: SyncRequest,
    authorized_device: &str,
    scope: &str,
) -> Result<SyncResponse> {
    if request.device_id != authorized_device || request.operations.len() > MAX_OPERATIONS {
        return Err(domain::invalid("Lot ou appareil invalide."));
    }
    let mut db = lock(&state.store)?;
    let mut snapshot = db.load()?;
    let mut accepted = Vec::new();
    let mut conflicts = Vec::new();
    let mut rejected = Vec::new();
    let mut pending_ids = Vec::new();
    let mut seen = HashSet::new();
    for op in request.operations {
        let op_id = op.id.clone();
        if uuid::Uuid::parse_str(&op_id).is_err()
            || op.profile_id != scope
            || !seen.insert(op_id.clone())
            || chrono::DateTime::parse_from_rfc3339(&op.created_at).is_err()
        {
            rejected.push(Issue {
                id: op_id,
                reason: "Opération ou profil invalide.".into(),
            });
            continue;
        }
        let exists: bool = db.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM companion_operations WHERE device_id=?1 AND operation_id=?2)",
            params![authorized_device, op_id], |r| r.get(0),
        )?;
        if exists {
            accepted.push(op_id);
            continue;
        }
        let result = match op.kind.as_str() {
            "observation" => {
                let mut value = op.payload.clone();
                if let Some(object) = value.as_object_mut() {
                    object.insert("profileId".into(), scope.into());
                    object.insert("id".into(), op_id.clone().into());
                    object.insert("source".into(), "Compagnon mobile".into());
                    object.insert("batchId".into(), serde_json::Value::Null);
                    object.insert("context".into(), serde_json::Value::Null);
                }
                match serde_json::from_value::<Observation>(value) {
                    Ok(observation) => match domain::validate_observation(&observation) {
                        Ok(()) => {
                            let key = domain::observation_key(&observation);
                            match snapshot.observations.iter().find(|existing| {
                                existing.profile_id == scope
                                    && existing.date == observation.date
                                    && existing.metric == observation.metric
                                    && domain::observation_key(existing) == key
                            }) {
                                Some(existing)
                                    if existing.value == observation.value
                                        && existing.unit == observation.unit
                                        && existing.duration_minutes
                                            == observation.duration_minutes =>
                                {
                                    Ok(false)
                                }
                                Some(_) => Err((true, "Mesure différente déjà présente.".into())),
                                None => {
                                    snapshot.observations.push(observation);
                                    Ok(true)
                                }
                            }
                        }
                        Err(error) => Err((false, error.message)),
                    },
                    Err(_) => Err((false, "Mesure invalide.".into())),
                }
            }
            "habit-answer" => match serde_json::from_value::<HabitAnswer>(op.payload) {
                Ok(answer) => {
                    let valid_date = chrono::NaiveDate::parse_from_str(&answer.date, "%Y-%m-%d")
                        .is_ok()
                        && chrono::DateTime::parse_from_rfc3339(&answer.at).is_ok();
                    let habit = snapshot
                        .profiles
                        .iter()
                        .find(|p| p.id == scope)
                        .and_then(|p| {
                            p.habits.iter().find(|h| {
                                h.id == answer.habit_id
                                    && h.start_date <= answer.date
                                    && h.archived_at.as_ref().is_none_or(|end| end > &answer.date)
                            })
                        });
                    if !valid_date || habit.is_none() {
                        Err((false, "Habitude ou date invalide.".into()))
                    } else {
                        let day = snapshot
                            .habit_days
                            .iter_mut()
                            .find(|d| d.profile_id == scope && d.date == answer.date);
                        if let Some(day) = day {
                            match day.answers.get(&answer.habit_id) {
                                Some(existing) if *existing == answer.answer => Ok(false),
                                Some(_) => Err((true, "Réponse différente déjà présente.".into())),
                                None => {
                                    day.answers.insert(answer.habit_id, answer.answer);
                                    day.validated_at = None;
                                    Ok(true)
                                }
                            }
                        } else {
                            let mut answers = BTreeMap::new();
                            answers.insert(answer.habit_id, answer.answer);
                            snapshot.habit_days.push(HabitDay {
                                profile_id: scope.into(),
                                date: answer.date,
                                answers,
                                validated_at: None,
                            });
                            Ok(true)
                        }
                    }
                }
                Err(_) => Err((false, "Réponse invalide.".into())),
            },
            _ => Err((false, "Type d'opération inconnu.".into())),
        };
        match result {
            Ok(_) => {
                accepted.push(op_id.clone());
                pending_ids.push(op_id);
            }
            Err((true, reason)) => conflicts.push(Issue { id: op_id, reason }),
            Err((false, reason)) => rejected.push(Issue { id: op_id, reason }),
        }
    }
    if !pending_ids.is_empty() {
        let keys: Vec<_> = pending_ids
            .iter()
            .map(|id| (authorized_device, id.as_str()))
            .collect();
        db.replace_with_companion_ops(&snapshot, &keys)?;
    }
    Ok(SyncResponse {
        accepted,
        conflicts,
        rejected,
    })
}

struct Request {
    method: String,
    path: String,
    headers: BTreeMap<String, String>,
    body: Vec<u8>,
}

fn read_request(stream: &mut impl Read) -> std::io::Result<Request> {
    let mut data = Vec::new();
    let deadline = Instant::now() + StdDuration::from_secs(8);
    let header_end = loop {
        if Instant::now() >= deadline {
            return Err(std::io::Error::new(
                std::io::ErrorKind::TimedOut,
                "Request deadline",
            ));
        }
        if data.len() > MAX_HEADER {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Headers too large",
            ));
        }
        let mut byte = [0u8; 1];
        stream.read_exact(&mut byte)?;
        data.push(byte[0]);
        if data.ends_with(b"\r\n\r\n") {
            break data.len();
        }
    };
    let header = std::str::from_utf8(&data[..header_end]).map_err(std::io::Error::other)?;
    let mut lines = header.split("\r\n");
    let request_line: Vec<&str> = lines
        .next()
        .unwrap_or_default()
        .split_whitespace()
        .collect();
    if request_line.len() != 3 || request_line[2] != "HTTP/1.1" {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Invalid request line",
        ));
    }
    let mut headers = BTreeMap::new();
    for line in lines.filter(|l| !l.is_empty()) {
        let (key, value) = line.split_once(':').ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid header")
        })?;
        headers.insert(key.trim().to_ascii_lowercase(), value.trim().to_string());
    }
    if headers.contains_key("transfer-encoding") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Chunked request not supported",
        ));
    }
    let length: usize = headers
        .get("content-length")
        .map(|v| v.parse())
        .transpose()
        .map_err(std::io::Error::other)?
        .unwrap_or(0);
    if length > MAX_BODY {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "Body too large",
        ));
    }
    let mut body = vec![0; length];
    if Instant::now() >= deadline {
        return Err(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "Request deadline",
        ));
    }
    stream.read_exact(&mut body)?;
    if Instant::now() >= deadline {
        return Err(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "Request deadline",
        ));
    }
    Ok(Request {
        method: request_line[0].into(),
        path: request_line[1].into(),
        headers,
        body,
    })
}

fn response(
    stream: &mut impl Write,
    status: &str,
    mime: &str,
    body: &[u8],
    cache: &str,
) -> std::io::Result<()> {
    write!(stream, "HTTP/1.1 {status}\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nCache-Control: {cache}\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'\r\nConnection: close\r\n\r\n", body.len())?;
    stream.write_all(body)?;
    stream.flush()
}

fn json_response(
    stream: &mut impl Write,
    status: &str,
    body: serde_json::Value,
) -> std::io::Result<()> {
    response(
        stream,
        status,
        "application/json; charset=utf-8",
        body.to_string().as_bytes(),
        "no-store",
    )
}

fn configure_connection(stream: &TcpStream) -> std::io::Result<()> {
    // Winsock inherits the listener's nonblocking mode on accepted sockets.
    // Each worker uses blocking TLS reads bounded by these timeouts.
    stream.set_nonblocking(false)?;
    stream.set_read_timeout(Some(StdDuration::from_secs(2)))?;
    stream.set_write_timeout(Some(StdDuration::from_secs(5)))
}

fn serve(
    stream: TcpStream,
    tls: Arc<ServerConfig>,
    app: &tauri::AppHandle,
    pairing: &Arc<Mutex<Option<Pairing>>>,
    stop: &Arc<AtomicBool>,
    origin: &str,
    host: &str,
    profile_id: &str,
    ca_public: &[u8],
) -> Result<()> {
    configure_connection(&stream)?;
    let connection = ServerConnection::new(tls).map_err(internal)?;
    let mut stream = StreamOwned::new(connection, stream);
    let request = match read_request(&mut stream) {
        Ok(request) => request,
        Err(_) => return Ok(()),
    };
    if stop.load(Ordering::Relaxed) {
        response(
            &mut stream,
            "503 Service Unavailable",
            "text/plain",
            b"Companion disabled",
            "no-store",
        )?;
        return Ok(());
    }
    if request.headers.get("host").map(String::as_str) != Some(host)
        || request
            .headers
            .get("origin")
            .is_some_and(|value| value != origin)
    {
        response(
            &mut stream,
            "403 Forbidden",
            "text/plain",
            b"Forbidden",
            "no-store",
        )?;
        return Ok(());
    }
    let state = app.state::<AppState>();
    let path = request.path.split('?').next().unwrap_or("");
    if request.method == "GET" && path == "/companion/ca.crt" {
        response(
            &mut stream,
            "200 OK",
            "application/x-x509-ca-cert",
            ca_public,
            "no-store",
        )?;
        return Ok(());
    }
    if request.method == "GET" {
        let asset = match path {
            "/companion/" | "/companion/index.html" => Some((
                "text/html; charset=utf-8",
                include_bytes!("../../companion/index.html").as_slice(),
            )),
            "/companion/app.mjs" => Some((
                "text/javascript; charset=utf-8",
                include_bytes!("../../companion/app.mjs").as_slice(),
            )),
            "/companion/data.mjs" => Some((
                "text/javascript; charset=utf-8",
                include_bytes!("../../companion/data.mjs").as_slice(),
            )),
            "/companion/db.mjs" => Some((
                "text/javascript; charset=utf-8",
                include_bytes!("../../companion/db.mjs").as_slice(),
            )),
            "/companion/styles.css" => Some((
                "text/css; charset=utf-8",
                include_bytes!("../../companion/styles.css").as_slice(),
            )),
            "/companion/sw.js" => Some((
                "text/javascript; charset=utf-8",
                include_bytes!("../../companion/sw.js").as_slice(),
            )),
            "/companion/manifest.webmanifest" => Some((
                "application/manifest+json",
                include_bytes!("../../companion/manifest.webmanifest").as_slice(),
            )),
            "/companion/icon.svg" => Some((
                "image/svg+xml",
                include_bytes!("../../companion/icon.svg").as_slice(),
            )),
            "/companion/icon-192.png" => Some((
                "image/png",
                include_bytes!("../../companion/icon-192.png").as_slice(),
            )),
            "/companion/icon-512.png" => Some((
                "image/png",
                include_bytes!("../../companion/icon-512.png").as_slice(),
            )),
            _ => None,
        };
        if let Some((mime, body)) = asset {
            response(&mut stream, "200 OK", mime, body, "no-cache")?;
            return Ok(());
        }
        if path == "/api/companion/bootstrap" {
            let token = request
                .headers
                .get("authorization")
                .and_then(|v| v.strip_prefix("Bearer "));
            let Some(device_id) = token
                .map(|v| authenticated(&state, v, profile_id))
                .transpose()?
                .flatten()
            else {
                json_response(
                    &mut stream,
                    "401 Unauthorized",
                    serde_json::json!({"error":"Pairing required"}),
                )?;
                return Ok(());
            };
            let db = lock(&state.store)?;
            let snapshot = db.load()?;
            let profiles: Vec<_> = snapshot
                .profiles
                .into_iter()
                .filter(|p| p.id == profile_id)
                .map(|p| serde_json::json!({"id":p.id,"name":p.name,"habits":p.habits}))
                .collect();
            json_response(
                &mut stream,
                "200 OK",
                serde_json::json!({"deviceId":device_id,"profiles":profiles}),
            )?;
            return Ok(());
        }
    }
    if request.method == "POST"
        && request
            .headers
            .get("content-type")
            .is_some_and(|v| v.starts_with("application/json"))
    {
        if path == "/api/companion/pair" {
            let runtime_guard = lock(&state.companion)?;
            if stop.load(Ordering::Relaxed) || runtime_guard.stop.is_none() {
                json_response(
                    &mut stream,
                    "503 Service Unavailable",
                    serde_json::json!({"error":"Companion disabled"}),
                )?;
                return Ok(());
            }
            let Ok(input) = serde_json::from_slice::<PairRequest>(&request.body) else {
                json_response(
                    &mut stream,
                    "400 Bad Request",
                    serde_json::json!({"error":"Invalid request"}),
                )?;
                return Ok(());
            };
            let mut active = lock(pairing)?;
            let Some(pair) = active.as_mut() else {
                json_response(
                    &mut stream,
                    "403 Forbidden",
                    serde_json::json!({"error":"Pairing closed"}),
                )?;
                return Ok(());
            };
            if pair
                .blocked_until
                .is_some_and(|until| until > Instant::now())
            {
                json_response(
                    &mut stream,
                    "429 Too Many Requests",
                    serde_json::json!({"error":"Wait before retrying"}),
                )?;
                return Ok(());
            }
            if pair.expires_at <= Utc::now() || input.code != pair.code {
                pair.failures = pair.failures.saturating_add(1);
                if pair.failures >= 5 {
                    pair.blocked_until = Some(Instant::now() + StdDuration::from_secs(60));
                    pair.failures = 0;
                }
                json_response(
                    &mut stream,
                    "403 Forbidden",
                    serde_json::json!({"error":"Invalid or expired code"}),
                )?;
                return Ok(());
            }
            if uuid::Uuid::parse_str(&input.device_id).is_err()
                || input.device_name.trim().is_empty()
                || input.device_name.len() > 80
            {
                json_response(
                    &mut stream,
                    "400 Bad Request",
                    serde_json::json!({"error":"Invalid device"}),
                )?;
                return Ok(());
            }
            let token = format!(
                "{}{}",
                uuid::Uuid::new_v4().simple(),
                uuid::Uuid::new_v4().simple()
            );
            let token_hash = sha256_hex(token.as_bytes());
            let db = lock(&state.store)?;
            if db.load()?.profiles.iter().any(|p| p.id == profile_id) {
                let tx = db.conn.unchecked_transaction()?;
                tx.execute(
                    "DELETE FROM companion_operations WHERE device_id=?1",
                    [&input.device_id],
                )?;
                tx.execute("INSERT INTO companion_devices(id,profile_id,name,token_hash) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,name=excluded.name,token_hash=excluded.token_hash",
                    params![input.device_id, profile_id, input.device_name.trim(), token_hash])?;
                tx.commit()?;
                *active = None;
                json_response(&mut stream, "200 OK", serde_json::json!({"token":token}))?;
            } else {
                json_response(
                    &mut stream,
                    "404 Not Found",
                    serde_json::json!({"error":"Profile removed"}),
                )?;
            }
            return Ok(());
        }
        if path == "/api/companion/sync" {
            let runtime_guard = lock(&state.companion)?;
            if stop.load(Ordering::Relaxed) || runtime_guard.stop.is_none() {
                json_response(
                    &mut stream,
                    "503 Service Unavailable",
                    serde_json::json!({"error":"Companion disabled"}),
                )?;
                return Ok(());
            }
            let token = request
                .headers
                .get("authorization")
                .and_then(|v| v.strip_prefix("Bearer "));
            let Some(device_id) = token
                .map(|v| authenticated(&state, v, profile_id))
                .transpose()?
                .flatten()
            else {
                json_response(
                    &mut stream,
                    "401 Unauthorized",
                    serde_json::json!({"error":"Pairing required"}),
                )?;
                return Ok(());
            };
            let Ok(input) = serde_json::from_slice::<SyncRequest>(&request.body) else {
                json_response(
                    &mut stream,
                    "400 Bad Request",
                    serde_json::json!({"error":"Invalid batch"}),
                )?;
                return Ok(());
            };
            match sync(&state, input, &device_id, profile_id) {
                Ok(result) => {
                    if !result.accepted.is_empty() {
                        let _ = app.emit("companion-sync", ());
                    }
                    json_response(&mut stream, "200 OK", serde_json::to_value(result)?)?;
                }
                Err(_) => json_response(
                    &mut stream,
                    "400 Bad Request",
                    serde_json::json!({"error":"Sync rejected"}),
                )?,
            }
            return Ok(());
        }
    }
    response(
        &mut stream,
        "404 Not Found",
        "text/plain",
        b"Not found",
        "no-store",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{Mutation, Snapshot};
    use rusqlite::Connection;
    use std::collections::HashMap;
    use std::path::PathBuf;

    #[test]
    fn https_worker_accepts_a_request_split_across_network_packets() {
        use rustls::pki_types::pem::PemObject;

        let directory = tempfile::tempdir().unwrap();
        let (tls, _, _, ca_pem) = ca_and_server(directory.path(), Ipv4Addr::LOCALHOST).unwrap();
        let mut roots = rustls::RootCertStore::empty();
        roots
            .add(rustls::pki_types::CertificateDer::from_pem_slice(&ca_pem).unwrap())
            .unwrap();
        let client_config = rustls::ClientConfig::builder()
            .with_root_certificates(roots)
            .with_no_client_auth();
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        listener.set_nonblocking(true).unwrap();
        let address = listener.local_addr().unwrap();
        let worker = thread::spawn(move || {
            let deadline = Instant::now() + StdDuration::from_secs(8);
            let socket = loop {
                match listener.accept() {
                    Ok((socket, _)) => break socket,
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(Instant::now() < deadline, "Client did not connect");
                        thread::sleep(StdDuration::from_millis(5));
                    }
                    Err(error) => panic!("{error}"),
                }
            };
            // Model Winsock inheritance on every platform running this regression.
            socket.set_nonblocking(true).unwrap();
            configure_connection(&socket).unwrap();
            let mut stream = StreamOwned::new(ServerConnection::new(tls).unwrap(), socket);
            let request = read_request(&mut stream).unwrap();
            assert_eq!(request.path, "/companion/");
            response(&mut stream, "200 OK", "text/plain", b"OK", "no-store").unwrap();
        });
        let socket = TcpStream::connect(address).unwrap();
        socket
            .set_read_timeout(Some(StdDuration::from_secs(5)))
            .unwrap();
        socket
            .set_write_timeout(Some(StdDuration::from_secs(5)))
            .unwrap();
        let connection = rustls::ClientConnection::new(
            Arc::new(client_config),
            rustls::pki_types::ServerName::try_from("127.0.0.1").unwrap(),
        )
        .unwrap();
        let mut stream = StreamOwned::new(connection, socket);
        stream
            .write_all(b"GET /companion/ HTTP/1.1\r\nHost: localhost\r\n")
            .unwrap();
        stream.flush().unwrap();
        thread::sleep(StdDuration::from_millis(100));
        stream.write_all(b"\r\n").unwrap();
        stream.flush().unwrap();
        let mut header = Vec::new();
        while !header.ends_with(b"\r\n\r\n") {
            let mut byte = [0; 1];
            stream.read_exact(&mut byte).unwrap();
            header.push(byte[0]);
            assert!(header.len() <= MAX_HEADER);
        }
        assert!(header.starts_with(b"HTTP/1.1 200 OK\r\n"));
        let mut body = [0; 2];
        stream.read_exact(&mut body).unwrap();
        assert_eq!(&body, b"OK");
        worker.join().unwrap();
    }

    fn fixture() -> (AppState, String, String, String) {
        let mut db = crate::store::Store::init(Connection::open_in_memory().unwrap()).unwrap();
        let mut snapshot = Snapshot::default();
        domain::mutate(&mut snapshot, Mutation::Demo).unwrap();
        let profile_id = snapshot.profiles[0].id.clone();
        let habit_id = snapshot.profiles[0].habits[0].id.clone();
        let day = snapshot
            .habit_days
            .iter_mut()
            .find(|day| day.profile_id == profile_id)
            .unwrap();
        let date = day.date.clone();
        day.answers.remove(&habit_id);
        assert!(day.validated_at.is_some());
        db.replace(&snapshot).unwrap();
        db.conn.execute(
            "INSERT INTO companion_devices(id,profile_id,name,token_hash) VALUES('phone',?1,'Phone','hash')",
            [&profile_id],
        ).unwrap();
        let state = AppState {
            store: Mutex::new(db),
            companion: Mutex::new(Runtime::default()),
            directory: PathBuf::new(),
            books: Mutex::new(HashMap::new()),
            previews: Mutex::new(HashMap::new()),
            restores: Mutex::new(HashMap::new()),
        };
        (state, profile_id, habit_id, date)
    }

    fn op(kind: &str, profile_id: &str, payload: serde_json::Value) -> MobileOperation {
        MobileOperation {
            id: uuid::Uuid::new_v4().to_string(),
            kind: kind.into(),
            profile_id: profile_id.into(),
            created_at: Utc::now().to_rfc3339(),
            payload,
        }
    }

    #[test]
    fn sync_is_scoped_idempotent_and_does_not_trust_import_metadata() {
        let (state, profile, _, _) = fixture();
        let payload = serde_json::json!({
            "id":"forged", "profileId":"other", "date":"2030-01-02",
            "metric":"weight", "value":80.0, "unit":"kg", "source":"forged",
            "batchId":"missing-import", "at":null, "durationMinutes":null,
            "context":"invalid-context"
        });
        let operation = op("observation", &profile, payload.clone());
        let id = operation.id.clone();
        let result = sync(
            &state,
            SyncRequest {
                device_id: "phone".into(),
                operations: vec![operation],
            },
            "phone",
            &profile,
        )
        .unwrap();
        assert_eq!(result.accepted, vec![id.clone()]);
        let saved = lock(&state.store).unwrap().load().unwrap();
        let observation = saved
            .observations
            .iter()
            .find(|entry| entry.id == id)
            .unwrap();
        assert_eq!(observation.profile_id, profile);
        assert_eq!(observation.source, "Compagnon mobile");
        assert!(observation.batch_id.is_none());
        assert!(observation.context.is_none());

        let replay = op("observation", &profile, payload.clone());
        let replay_id = replay.id.clone();
        let result = sync(
            &state,
            SyncRequest {
                device_id: "phone".into(),
                operations: vec![replay.clone()],
            },
            "phone",
            &profile,
        )
        .unwrap();
        assert_eq!(result.accepted, vec![replay_id]);
        let result = sync(
            &state,
            SyncRequest {
                device_id: "phone".into(),
                operations: vec![replay],
            },
            "phone",
            &profile,
        )
        .unwrap();
        assert_eq!(result.accepted.len(), 1);
        assert_eq!(
            lock(&state.store)
                .unwrap()
                .load()
                .unwrap()
                .observations
                .len(),
            saved.observations.len()
        );

        let wrong_profile = op("observation", "other", payload);
        let result = sync(
            &state,
            SyncRequest {
                device_id: "phone".into(),
                operations: vec![wrong_profile],
            },
            "phone",
            &profile,
        )
        .unwrap();
        assert_eq!(result.rejected.len(), 1);
    }

    #[test]
    fn a_mobile_answer_reopens_a_validated_day_and_restore_revokes_devices() {
        let (state, profile, habit, date) = fixture();
        let operation = op(
            "habit-answer",
            &profile,
            serde_json::json!({
                "date": date, "habitId": habit, "answer": true, "at": Utc::now().to_rfc3339()
            }),
        );
        let result = sync(
            &state,
            SyncRequest {
                device_id: "phone".into(),
                operations: vec![operation],
            },
            "phone",
            &profile,
        )
        .unwrap();
        assert_eq!(result.accepted.len(), 1);
        let mut db = lock(&state.store).unwrap();
        let snapshot = db.load().unwrap();
        let day = snapshot
            .habit_days
            .iter()
            .find(|day| day.profile_id == profile && day.date == date)
            .unwrap();
        assert_eq!(day.answers.get(&habit), Some(&true));
        assert!(day.validated_at.is_none());
        db.replace_for_restore(&snapshot).unwrap();
        let count: i64 = db
            .conn
            .query_row("SELECT count(*) FROM companion_devices", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }
}
