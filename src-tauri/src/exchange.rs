use crate::{domain::*, import_limits};
use calamine::{open_workbook_auto_from_rs, DataType, Reader};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, io::Write, path::Path};
#[derive(Debug, Clone)]
pub struct TemporalCell {
    pub date: Option<String>,
    pub time: Option<String>,
    pub minutes: Option<f64>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sheet {
    pub name: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    #[serde(skip)]
    pub temporal: HashMap<(usize, usize), TemporalCell>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Workbook {
    pub token: String,
    pub filename: String,
    pub sheets: Vec<Sheet>,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mapping {
    pub sheet: usize,
    pub date_column: usize,
    pub metric_column: Option<usize>,
    pub value_column: usize,
    pub unit_column: Option<usize>,
    #[serde(default)]
    pub time_column: Option<usize>,
    #[serde(default)]
    pub duration_column: Option<usize>,
    pub metric: String,
    pub unit: String,
    pub date_format: String,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRow {
    pub row: usize,
    pub observation: Option<Observation>,
    pub status: String,
    pub message: String,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub token: String,
    pub profile_id: String,
    pub filename: String,
    pub rows: Vec<PreviewRow>,
}
pub fn read(path: &Path) -> Result<Workbook> {
    let bytes = import_limits::read_file(path)?;
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mut sheets = vec![];
    match ext.as_str() {
        "csv" => {
            let text = std::str::from_utf8(&bytes)
                .map_err(|_| invalid("Le CSV doit être encodé en UTF-8."))?
                .trim_start_matches('\u{feff}');
            let first = text.lines().next().unwrap_or("");
            let delimiter = if first.matches(';').count() > first.matches(',').count() {
                b';'
            } else {
                b','
            };
            import_limits::csv(text.as_bytes(), delimiter)?;
            let mut r = csv::ReaderBuilder::new()
                .delimiter(delimiter)
                .from_reader(text.as_bytes());
            let headers = r.headers()?.iter().map(str::to_string).collect();
            let mut rows = vec![];
            for row in r.records() {
                rows.push(row?.iter().map(str::to_string).collect());
                if rows.len() > 50_000 {
                    return Err(invalid("50 000 lignes maximum par import."));
                }
            }
            sheets.push(Sheet {
                name: "CSV".into(),
                headers,
                rows,
                temporal: HashMap::new(),
            });
        }
        "xls" | "xlsx" => {
            let excel_bytes = if ext == "xlsx" {
                import_limits::xlsx(&bytes)?;
                bytes
            } else {
                import_limits::xls(&bytes)?
            };
            let mut book = open_workbook_auto_from_rs(std::io::Cursor::new(excel_bytes))?;
            if book.sheet_names().len() > import_limits::MAX_SHEETS {
                return Err(invalid("16 feuilles maximum par import."));
            }
            for name in book.sheet_names().to_vec() {
                let range = book.worksheet_range(&name)?;
                if range.height() > 50_001 || range.width() > 256 {
                    return Err(invalid(
                        "Feuille trop grande : 50 000 lignes et 256 colonnes maximum.",
                    ));
                }
                let formula = book.worksheet_formula(&name)?;
                if formula.cells().any(|(_, _, f)| !f.is_empty()) {
                    return Err(invalid(
                        "La feuille contient des formules. Exportez ses valeurs uniquement.",
                    ));
                }
                let mut temporal = HashMap::new();
                let mut rows = Vec::new();
                for (row_index, row) in range.rows().enumerate() {
                    let mut display = Vec::new();
                    for (column, cell) in row.iter().enumerate() {
                        let mut text = cell.to_string();
                        if cell.is_datetime() || cell.is_datetime_iso() || cell.is_duration_iso() {
                            let datetime = cell.as_datetime();
                            let time = cell.as_time().map(|t| t.format("%H:%M").to_string());
                            let duration = cell.get_datetime().is_some_and(|v| v.is_duration())
                                || cell.is_duration_iso();
                            let date = datetime
                                .filter(|d| {
                                    !duration
                                        && (d.date().to_string() >= "1901-01-01".to_string()
                                            || time.as_deref() == Some("00:00"))
                                })
                                .map(|d| d.date().to_string());
                            let minutes = cell
                                .as_duration()
                                .map(|d| d.num_milliseconds() as f64 / 60_000.0);
                            text = if duration {
                                minutes.map(|v| v.to_string()).unwrap_or(text)
                            } else if let Some(day) = &date {
                                match time.as_deref() {
                                    Some(t) if t != "00:00" => format!("{day} {t}"),
                                    _ => day.clone(),
                                }
                            } else {
                                time.clone().unwrap_or(text)
                            };
                            if row_index > 0 {
                                temporal.insert(
                                    (row_index - 1, column),
                                    TemporalCell {
                                        date,
                                        time,
                                        minutes,
                                    },
                                );
                            }
                        }
                        display.push(text);
                    }
                    rows.push(display);
                }
                let headers = if rows.is_empty() {
                    Vec::new()
                } else {
                    rows.remove(0)
                };
                sheets.push(Sheet {
                    name,
                    headers,
                    rows,
                    temporal,
                });
            }
        }
        "json" => {
            import_limits::json(&bytes)?;
            let value: serde_json::Value = serde_json::from_slice(&bytes)?;
            let rows=value.as_array().ok_or_else(||invalid("Pour une sauvegarde complète, utilisez Restaurer. L’import de mesures attend un tableau JSON."))?;
            if rows.len() > 50_000 {
                return Err(invalid("50 000 lignes maximum."));
            }
            let mut headers: Vec<String> = rows
                .first()
                .and_then(|v| v.as_object())
                .ok_or_else(|| invalid("Tableau JSON vide ou invalide."))?
                .keys()
                .cloned()
                .collect();
            headers.sort();
            let mut out = vec![];
            for v in rows {
                let object = v
                    .as_object()
                    .ok_or_else(|| invalid("Chaque ligne doit être un objet."))?;
                out.push(
                    headers
                        .iter()
                        .map(|h| match object.get(h) {
                            Some(serde_json::Value::String(s)) => s.clone(),
                            Some(serde_json::Value::Number(n)) => n.to_string(),
                            _ => String::new(),
                        })
                        .collect(),
                );
            }
            sheets.push(Sheet {
                name: "JSON".into(),
                headers,
                rows: out,
                temporal: HashMap::new(),
            });
        }
        _ => return Err(invalid("Formats acceptés : CSV, XLS, XLSX, JSON.")),
    }
    if sheets.is_empty() {
        return Err(invalid("Aucune feuille."));
    }
    Ok(Workbook {
        token: id(),
        filename: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into(),
        sheets,
    })
}
fn metric_name(s: &str) -> String {
    match s.trim().to_lowercase().as_str() {
        "poids" | "weight" => "weight",
        "sommeil" | "sleep" => "sleep",
        "pas" | "steps" => "steps",
        "activité" | "activite" | "activity" => "activity",
        "apports" | "calories" | "intake" => "intake",
        "stress" => "stress",
        "sport" | "exercice" | "exercise" => "exercise",
        "marche" | "sortie" | "walk" => "walk",
        "travail" | "étude" | "etude" | "work" => "work",
        "social" | "amis" => "social",
        "jeux" | "jeux vidéo" | "jeux video" | "gaming" => "gaming",
        "réseaux" | "reseaux" | "écran" | "ecran" | "screen" => "screen",
        "lecture" | "apprentissage" | "reading" => "reading",
        "repas" | "meal" => "meal",
        "repos" | "pause" | "rest" => "rest",
        "alcool" | "verre" | "alcohol" => "alcohol",
        "tabac" | "cigarette" | "cigarettes" | "tobacco" => "tobacco",
        "vapotage" | "vape" | "vaping" => "vaping",
        "écran le soir"
        | "ecran le soir"
        | "temps d'écran le soir"
        | "temps d'ecran le soir"
        | "écran soir"
        | "ecran soir"
        | "screen evening"
        | "screen_evening" => "screen_evening",
        "temps sédentaire" | "temps sedentaire" | "sédentarité" | "sedentarite" | "sédentaire"
        | "sedentaire" | "temps assis" | "sedentary" => "sedentary",
        _ => s,
    }
    .to_string()
}
fn parse_row(
    row: &[String],
    m: &Mapping,
    pid: &str,
    filename: &str,
    temporal: &HashMap<(usize, usize), TemporalCell>,
    row_index: usize,
) -> Result<Observation> {
    let at = |i: usize| {
        row.get(i)
            .map(|v| v.trim())
            .filter(|v| !v.is_empty())
            .ok_or_else(|| invalid("Cellule manquante."))
    };
    let fmt = match m.date_format.as_str() {
        "iso" => "%Y-%m-%d",
        "dmy" => "%d/%m/%Y",
        "mdy" => "%m/%d/%Y",
        _ => return Err(invalid("Choisissez le format des dates.")),
    };
    let date = match temporal
        .get(&(row_index, m.date_column))
        .and_then(|cell| cell.date.clone())
    {
        Some(date) => date,
        None => chrono::NaiveDate::parse_from_str(at(m.date_column)?, fmt)
            .map_err(|_| invalid("Date invalide pour le format choisi."))?
            .to_string(),
    };
    let metric = if let Some(c) = m.metric_column {
        metric_name(at(c)?)
    } else {
        m.metric.clone()
    };
    let source_unit = if let Some(c) = m.unit_column {
        at(c)?
    } else {
        m.unit.as_str()
    };
    let mut value = at(m.value_column)?
        .replace([' ', '\u{a0}', '\u{202f}'], "")
        .replace(',', ".")
        .parse::<f64>()
        .map_err(|_| invalid("Nombre invalide."))?;
    match (metric.as_str(), source_unit) {
        ("tobacco", "cigarettes" | "cigarette(s)") => {}
        ("weight", "lb") => value *= 0.45359237,
        ("weight", "g") => value /= 1000.,
        ("sleep", "min") => value /= 60.,
        ("activity", "h") => value *= 60.,
        ("intake", "kJ") => value /= 4.184,
        (_, u) if Some(u) == unit(&metric) => {}
        _ => {
            return Err(invalid(
                "Unité absente ou incompatible. Choisissez une unité explicite.",
            ))
        }
    }
    let mut at_time = match m.time_column {
        Some(column) => {
            let text = temporal
                .get(&(row_index, column))
                .and_then(|cell| cell.time.clone())
                .or_else(|| row.get(column).map(|v| v.trim().to_string()))
                .filter(|v| !v.is_empty());
            text.map(|text| {
                chrono::NaiveTime::parse_from_str(&text, "%H:%M")
                    .map(|time| time.format("%H:%M").to_string())
                    .map_err(|_| invalid("Heure invalide : utilisez HH:mm."))
            })
            .transpose()?
        }
        None => None,
    };
    let mut duration = match m.duration_column {
        Some(column) => match temporal
            .get(&(row_index, column))
            .and_then(|cell| cell.minutes)
        {
            Some(minutes) => Some(minutes),
            None => row
                .get(column)
                .map(|v| v.trim())
                .filter(|v| !v.is_empty())
                .map(|v| {
                    v.replace(',', ".")
                        .parse::<f64>()
                        .map_err(|_| invalid("Durée invalide : utilisez des minutes."))
                })
                .transpose()?,
        },
        None => None,
    }
    .or_else(|| (at_time.is_some() && unit(&metric) == Some("min")).then_some(value));
    // A recorded zero is a daily observation, not an event with a zero-length animation.
    if value == 0.0 && unit(&metric) == Some("min") && duration == Some(0.0) {
        at_time = None;
        duration = None;
    }
    let o = Observation {
        id: id(),
        profile_id: pid.into(),
        date,
        unit: unit(&metric)
            .ok_or_else(|| invalid("Mesure inconnue."))?
            .into(),
        metric,
        value,
        source: filename.into(),
        batch_id: None,
        at: at_time,
        duration_minutes: duration,
    };
    validate_observation(&o)?;
    Ok(o)
}
pub fn preview(book: &Workbook, m: &Mapping, pid: &str, s: &Snapshot) -> Result<Preview> {
    if !s.profiles.iter().any(|p| p.id == pid) {
        return Err(invalid("Profil introuvable."));
    }
    let sheet = book
        .sheets
        .get(m.sheet)
        .ok_or_else(|| invalid("Feuille introuvable."))?;
    let mut seen: HashMap<(String, String, String), f64> = s
        .observations
        .iter()
        .filter(|o| o.profile_id == pid)
        .map(|o| {
            (
                (
                    o.date.clone(),
                    o.metric.clone(),
                    o.at.clone().unwrap_or_default(),
                ),
                o.value,
            )
        })
        .collect();
    let mut rows = vec![];
    for (i, row) in sheet.rows.iter().enumerate() {
        let pr = match parse_row(row, m, pid, &book.filename, &sheet.temporal, i) {
            Ok(o) => {
                let key = (
                    o.date.clone(),
                    o.metric.clone(),
                    o.at.clone().unwrap_or_default(),
                );
                let (status, message) = match seen.get(&key) {
                    Some(v) if *v == o.value => ("duplicate", "Déjà présent : sera ignoré."),
                    Some(_) => (
                        "conflict",
                        "Valeur différente pour cette date et cette mesure.",
                    ),
                    None => ("new", "Prêt à importer."),
                };
                seen.insert(key, o.value);
                PreviewRow {
                    row: i + 2,
                    observation: Some(o),
                    status: status.into(),
                    message: message.into(),
                }
            }
            Err(e) => PreviewRow {
                row: i + 2,
                observation: None,
                status: "error".into(),
                message: e.message,
            },
        };
        rows.push(pr)
    }
    Ok(Preview {
        token: id(),
        profile_id: pid.into(),
        filename: book.filename.clone(),
        rows,
    })
}
pub fn commit(s: &mut Snapshot, p: &Preview, policy: &str, skip_errors: bool) -> Result<usize> {
    if !["skip", "replace"].contains(&policy) {
        return Err(invalid("Politique de conflit invalide."));
    }
    if !skip_errors && p.rows.iter().any(|r| r.status == "error") {
        return Err(invalid(
            "Corrigez les erreurs ou choisissez explicitement de les ignorer.",
        ));
    }
    let bid = id();
    let mut count = 0;
    for row in &p.rows {
        if let Some(o) = &row.observation {
            let pos = s.observations.iter().position(|x| {
                x.profile_id == p.profile_id
                    && x.date == o.date
                    && x.metric == o.metric
                    && x.at == o.at
            });
            if let Some(i) = pos {
                if s.observations[i].value == o.value || policy == "skip" {
                    continue;
                }
                let mut next = o.clone();
                next.id = s.observations[i].id.clone();
                next.batch_id = Some(bid.clone());
                s.observations[i] = next;
            } else {
                let mut next = o.clone();
                next.batch_id = Some(bid.clone());
                s.observations.push(next);
            }
            count += 1;
        }
    }
    s.batches.push(ImportBatch {
        id: bid,
        profile_id: p.profile_id.clone(),
        filename: p.filename.clone(),
        imported_at: chrono::Utc::now().to_rfc3339(),
        count,
    });
    validate(s)?;
    Ok(count)
}
fn cells(s: &Snapshot, pid: &str) -> Vec<Vec<String>> {
    let mut rows = vec![vec![
        "date".into(),
        "metric".into(),
        "value".into(),
        "unit".into(),
        "source".into(),
        "time".into(),
        "durationMinutes".into(),
    ]];
    let mut obs: Vec<_> = s
        .observations
        .iter()
        .filter(|o| o.profile_id == pid)
        .collect();
    obs.sort_by_key(|o| (&o.date, &o.metric));
    for o in obs {
        rows.push(vec![
            o.date.clone(),
            o.metric.clone(),
            o.value.to_string(),
            o.unit.clone(),
            o.source.clone(),
            o.at.clone().unwrap_or_default(),
            o.duration_minutes
                .map(|v| v.to_string())
                .unwrap_or_default(),
        ]);
    }
    rows
}
pub fn export(path: &Path, format: &str, s: &Snapshot, pid: &str) -> Result<()> {
    let rows = cells(s, pid);
    match format {
        "json" => atomic_write(path, &serde_json::to_vec_pretty(s)?)?,
        "csv" => {
            let mut w = csv::WriterBuilder::new()
                .delimiter(b';')
                .from_writer(Vec::new());
            for row in rows {
                w.write_record(row.iter().map(|v| {
                    if v.starts_with(['=', '+', '-', '@', '\t', '\r']) {
                        format!("'{v}")
                    } else {
                        v.clone()
                    }
                }))?;
            }
            let bytes = w.into_inner().map_err(|e| invalid(e.to_string()))?;
            let mut out = vec![0xEF, 0xBB, 0xBF];
            out.extend(bytes);
            atomic_write(path, &out)?;
        }
        "xlsx" => {
            let mut book = rust_xlsxwriter::Workbook::new();
            let sheet = book.add_worksheet();
            sheet.set_name("Mesures")?;
            sheet.set_column_width(0, 14)?;
            sheet.set_column_width(4, 36)?;
            for (r, row) in rows.iter().enumerate() {
                for (c, value) in row.iter().enumerate() {
                    if c == 2 && r > 0 {
                        sheet.write_number(
                            r as u32,
                            c as u16,
                            value
                                .parse::<f64>()
                                .map_err(|_| invalid("Nombre invalide."))?,
                        )?;
                    } else {
                        sheet.write_string(r as u32, c as u16, value)?;
                    }
                }
            }
            atomic_write(path, &book.save_to_buffer()?)?;
        }
        "xls" => atomic_write(path, &xls(&rows)?)?,
        _ => return Err(invalid("Format inconnu.")),
    }
    Ok(())
}
pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let parent = path.parent().ok_or_else(|| invalid("Dossier invalide."))?;
    let mut tmp = tempfile::NamedTempFile::new_in(parent)?;
    tmp.write_all(bytes)?;
    tmp.as_file().sync_all()?;
    tmp.persist(path).map_err(|e| invalid(e.to_string()))?;
    Ok(())
}
// Minimal BIFF8 writer: real .xls compound file; strings are never formulas.
fn record(out: &mut Vec<u8>, kind: u16, data: &[u8]) {
    out.extend(kind.to_le_bytes());
    out.extend((data.len() as u16).to_le_bytes());
    out.extend(data)
}
fn bof(kind: u16) -> Vec<u8> {
    let mut v = vec![];
    for n in [0x0600u16, kind, 0x0dbb, 0x07cc] {
        v.extend(n.to_le_bytes())
    }
    v.extend(0x41u32.to_le_bytes());
    v.extend(6u32.to_le_bytes());
    v
}
fn xls(rows: &[Vec<String>]) -> Result<Vec<u8>> {
    if rows.len() > 65_536 {
        return Err(invalid("XLS : 65 535 mesures maximum. Utilisez XLSX."));
    }
    let mut out = vec![];
    record(&mut out, 0x0809, &bof(5));
    record(&mut out, 0x0042, &1200u16.to_le_bytes());
    record(&mut out, 0x00e0, &[0; 20]);
    let bound = out.len();
    let mut bs = vec![0, 0, 0, 0, 0, 0, 7, 0];
    bs.extend(b"Mesures");
    record(&mut out, 0x0085, &bs);
    record(&mut out, 0x000a, &[]);
    let offset = out.len() as u32;
    out[bound + 4..bound + 8].copy_from_slice(&offset.to_le_bytes());
    record(&mut out, 0x0809, &bof(0x10));
    let mut dims = vec![];
    dims.extend(0u32.to_le_bytes());
    dims.extend((rows.len() as u32).to_le_bytes());
    dims.extend(0u16.to_le_bytes());
    dims.extend(5u16.to_le_bytes());
    dims.extend(0u16.to_le_bytes());
    record(&mut out, 0x0200, &dims);
    for (r, row) in rows.iter().enumerate() {
        for (c, v) in row.iter().enumerate() {
            let mut d = vec![];
            d.extend((r as u16).to_le_bytes());
            d.extend((c as u16).to_le_bytes());
            d.extend(0u16.to_le_bytes());
            if c == 2 && r > 0 {
                d.extend(
                    v.parse::<f64>()
                        .map_err(|_| invalid("Valeur XLS invalide."))?
                        .to_le_bytes(),
                );
                record(&mut out, 0x0203, &d);
            } else {
                let chars: Vec<u16> = v.encode_utf16().collect();
                if chars.len() > 4000 {
                    return Err(invalid("Texte trop long pour XLS."));
                }
                d.extend((chars.len() as u16).to_le_bytes());
                d.push(1);
                for ch in chars {
                    d.extend(ch.to_le_bytes());
                }
                record(&mut out, 0x0204, &d);
            }
        }
    }
    record(&mut out, 0x000a, &[]);
    out.resize(out.len().max(4096), 0);
    let cursor = std::io::Cursor::new(Vec::new());
    let mut c = cfb::CompoundFile::create_with_version(cfb::Version::V3, cursor)?;
    c.create_stream("/Workbook")?.write_all(&out)?;
    Ok(c.into_inner().into_inner())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn excel_and_csv_roundtrip() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        let expected_rows = s.observations.len();
        let dir = tempfile::tempdir().unwrap();
        for ext in ["csv", "xls", "xlsx"] {
            let path = dir.path().join(format!("test.{ext}"));
            export(&path, ext, &s, &s.profiles[0].id).unwrap();
            let b = read(&path).unwrap();
            assert_eq!(b.sheets[0].rows.len(), expected_rows, "{ext}");
            assert_eq!(b.sheets[0].headers[0], "date");
            let mapping = Mapping {
                sheet: 0,
                date_column: 0,
                metric_column: Some(1),
                value_column: 2,
                unit_column: Some(3),
                time_column: Some(5),
                duration_column: Some(6),
                metric: "weight".into(),
                unit: "".into(),
                date_format: "iso".into(),
            };
            let preview = preview(&b, &mapping, &s.profiles[0].id, &s).unwrap();
            assert!(
                preview.rows.iter().all(|r| r.status == "duplicate"),
                "Every exported numeric value must round-trip in {ext}"
            );
        }
    }
    #[test]
    fn mapping_errors_conflicts_units() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        let pid = s.profiles[0].id.clone();
        let book = Workbook {
            token: id(),
            filename: "test.csv".into(),
            sheets: vec![Sheet {
                temporal: HashMap::new(),
                name: "CSV".into(),
                headers: vec![],
                rows: vec![
                    vec!["12/01/2025".into(), "165,3".into()],
                    vec!["12/01/2025".into(), "166".into()],
                    vec!["bad".into(), "1".into()],
                ],
            }],
        };
        let map = Mapping {
            sheet: 0,
            date_column: 0,
            value_column: 1,
            metric_column: None,
            unit_column: None,
            time_column: None,
            duration_column: None,
            metric: "weight".into(),
            unit: "lb".into(),
            date_format: "dmy".into(),
        };
        let p = preview(&book, &map, &pid, &s).unwrap();
        assert_eq!(p.rows[1].status, "conflict");
        assert_eq!(p.rows[2].status, "error");
        assert!((p.rows[0].observation.as_ref().unwrap().value - 74.978818761).abs() < 1e-8);
        assert!(commit(&mut s.clone(), &p, "skip", false).is_err());
        assert_eq!(commit(&mut s, &p, "skip", true).unwrap(), 1);
        assert_eq!(commit(&mut s, &p, "skip", true).unwrap(), 0);
    }
}
#[cfg(test)]
mod acceptance {
    use super::*;
    fn map() -> Mapping {
        Mapping {
            sheet: 0,
            date_column: 0,
            metric_column: Some(1),
            value_column: 2,
            unit_column: Some(3),
            time_column: None,
            duration_column: None,
            metric: "weight".into(),
            unit: "".into(),
            date_format: "iso".into(),
        }
    }
    #[test]
    fn csv_french_json_and_empty_workbooks() {
        let dir = tempfile::tempdir().unwrap();
        let csv = dir.path().join("fr.csv");
        std::fs::write(
            &csv,
            "date;metric;value;unit\n2026-01-02;weight;72,5;kg\n2026-01-02;sleep;450;min\n",
        )
        .unwrap();
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        let pid = s.profiles[0].id.clone();
        let b = read(&csv).unwrap();
        let p = preview(&b, &map(), &pid, &s).unwrap();
        assert_eq!(p.rows[0].observation.as_ref().unwrap().value, 72.5);
        assert_eq!(p.rows[1].observation.as_ref().unwrap().value, 7.5);
        let json = dir.path().join("measure.json");
        std::fs::write(
            &json,
            r#"[{"date":"2026-01-02","metric":"weight","value":72.5,"unit":"kg"}]"#,
        )
        .unwrap();
        assert_eq!(read(&json).unwrap().sheets[0].rows.len(), 1);
        std::fs::write(&json, "not-json").unwrap();
        assert!(read(&json).is_err());
        let xls = dir.path().join("empty.xls");
        export(&xls, "xls", &Snapshot::default(), "").unwrap();
        assert!(read(&xls).unwrap().sheets[0].rows.is_empty());
    }
    #[test]
    fn multi_sheet_dates_formulas_and_malformed_excel() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("multi.xlsx");
        let mut book = rust_xlsxwriter::Workbook::new();
        book.add_worksheet()
            .set_name("Poids")
            .unwrap()
            .write_string(0, 0, "date")
            .unwrap();
        let second = book.add_worksheet();
        second.set_name("Sommeil").unwrap();
        second.write_string(0, 0, "date").unwrap();
        second
            .write_datetime_with_format(
                1,
                0,
                &rust_xlsxwriter::ExcelDateTime::from_ymd(2026, 1, 2).unwrap(),
                &rust_xlsxwriter::Format::new().set_num_format("dd/mm/yyyy"),
            )
            .unwrap();
        book.save(&path).unwrap();
        let b = read(&path).unwrap();
        assert_eq!(b.sheets.len(), 2);
        assert_eq!(b.sheets[1].rows[0][0], "2026-01-02");
        book.worksheet_from_index(0)
            .unwrap()
            .write_formula(1, 0, "=1+1")
            .unwrap();
        book.save(&path).unwrap();
        assert!(read(&path).unwrap_err().message.contains("formules"));
        std::fs::write(&path, b"invalid xlsx").unwrap();
        assert!(read(&path).is_err());
    }
    #[test]
    fn failures_do_not_write_and_conflicts_require_policy() {
        let mut db =
            crate::store::Store::init(rusqlite::Connection::open_in_memory().unwrap()).unwrap();
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        db.replace(&s).unwrap();
        let mut o = s.observations[0].clone();
        o.value += 1.;
        let pid = o.profile_id.clone();
        let p = Preview {
            token: id(),
            profile_id: pid,
            filename: "test".into(),
            rows: vec![PreviewRow {
                row: 2,
                observation: Some(o.clone()),
                status: "conflict".into(),
                message: "".into(),
            }],
        };
        assert_eq!(commit(&mut s, &p, "skip", false).unwrap(), 0);
        assert_ne!(s.observations[0].value, o.value);
        assert_eq!(commit(&mut s, &p, "replace", false).unwrap(), 1);
        assert_eq!(s.observations[0].value, o.value);
        let old = serde_json::to_string(&db.load().unwrap()).unwrap();
        let mut invalid = s.clone();
        invalid.observations[0].unit = "lb".into();
        assert!(db.replace(&invalid).is_err());
        assert_eq!(old, serde_json::to_string(&db.load().unwrap()).unwrap());
        // A late SQL failure after inserts also rolls the entire transaction back.
        db.conn.execute_batch("CREATE TRIGGER reject_changes BEFORE INSERT ON observations BEGIN SELECT RAISE(ABORT,'test interruption'); END;").unwrap();
        assert!(db.replace(&s).is_err());
        assert_eq!(old, serde_json::to_string(&db.load().unwrap()).unwrap());
    }
    #[test]
    fn ambiguous_dates_require_explicit_order_and_foreign_ids_rejected() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        mutate(&mut s, Mutation::Demo).unwrap();
        let mut o = s.observations[0].clone();
        o.profile_id = s.profiles[1].id.clone();
        assert!(mutate(&mut s, Mutation::SaveObservation(o)).is_err());
        let row = vec![
            "03/04/2026".into(),
            "weight".into(),
            "70".into(),
            "kg".into(),
        ];
        let mut m = map();
        m.date_format = "".into();
        assert!(parse_row(&row, &m, "p", "test", &HashMap::new(), 0).is_err());
        m.date_format = "dmy".into();
        assert_eq!(
            parse_row(&row, &m, "p", "test", &HashMap::new(), 0)
                .unwrap()
                .date,
            "2026-04-03"
        );
        m.date_format = "mdy".into();
        assert_eq!(
            parse_row(&row, &m, "p", "test", &HashMap::new(), 0)
                .unwrap()
                .date,
            "2026-03-04"
        );
    }
}
#[cfg(test)]
mod temporal_regressions {
    use super::*;
    fn snapshot() -> Snapshot {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        s.observations.clear();
        s.batches.clear();
        s
    }
    fn mapping() -> Mapping {
        Mapping {
            sheet: 0,
            date_column: 0,
            metric_column: None,
            value_column: 1,
            unit_column: None,
            time_column: Some(2),
            duration_column: Some(3),
            metric: "walk".into(),
            unit: "min".into(),
            date_format: "dmy".into(),
        }
    }
    #[test]
    fn excel_native_dates_times_and_durations_are_normalized_by_mapping() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("times.xlsx");
        let mut book = rust_xlsxwriter::Workbook::new();
        let sheet = book.add_worksheet();
        for (column, name) in ["date", "value", "time", "duration"].iter().enumerate() {
            sheet.write_string(0, column as u16, *name).unwrap();
        }
        sheet
            .write_datetime_with_format(
                1,
                0,
                &rust_xlsxwriter::ExcelDateTime::from_ymd(2026, 10, 1).unwrap(),
                &rust_xlsxwriter::Format::new().set_num_format("dd/mm/yyyy"),
            )
            .unwrap();
        sheet.write_number(1, 1, 30.).unwrap();
        sheet
            .write_datetime_with_format(
                1,
                2,
                &rust_xlsxwriter::ExcelDateTime::from_hms(18, 30, 0.).unwrap(),
                &rust_xlsxwriter::Format::new().set_num_format("hh:mm"),
            )
            .unwrap();
        sheet
            .write_datetime_with_format(
                1,
                3,
                &rust_xlsxwriter::ExcelDateTime::from_hms(0, 30, 0.).unwrap(),
                &rust_xlsxwriter::Format::new().set_num_format("[h]:mm"),
            )
            .unwrap();
        book.save(&path).unwrap();
        let workbook = read(&path).unwrap();
        let s = snapshot();
        let result = preview(&workbook, &mapping(), &s.profiles[0].id, &s).unwrap();
        assert_eq!(result.rows[0].status, "new");
        let o = result.rows[0].observation.as_ref().unwrap();
        assert_eq!(o.date, "2026-10-01");
        assert_eq!(o.at.as_deref(), Some("18:30"));
        assert_eq!(o.duration_minutes, Some(30.));
        // Public previews contain display cells; their typed metadata stays inside Rust.
        assert!(serde_json::to_value(&workbook).unwrap()["sheets"][0]
            .get("temporal")
            .is_none());
    }
    #[test]
    fn zero_duration_import_is_daily_and_invalid_duration_is_not_silently_ignored() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("zeros.csv");
        std::fs::write(
            &path,
            "date;value;time;duration\n01/10/2026;0;18:30;0\n02/10/2026;30;18:30;bad\n",
        )
        .unwrap();
        let workbook = read(&path).unwrap();
        let s = snapshot();
        let result = preview(&workbook, &mapping(), &s.profiles[0].id, &s).unwrap();
        let o = result.rows[0].observation.as_ref().unwrap();
        assert_eq!(o.value, 0.);
        assert!(o.at.is_none());
        assert!(o.duration_minutes.is_none());
        assert_eq!(result.rows[1].status, "error");
    }
    #[test]
    fn tobacco_two_column_csv_uses_fixed_cigarette_unit() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("tobacco.csv");
        std::fs::write(&path, "date;value\n01/10/2026;2\n").unwrap();
        let workbook = read(&path).unwrap();
        let s = snapshot();
        let mut m = mapping();
        m.metric = "tobacco".into();
        m.unit = "cigarette".into();
        m.time_column = None;
        m.duration_column = None;
        let result = preview(&workbook, &m, &s.profiles[0].id, &s).unwrap();
        assert_eq!(result.rows[0].status, "new");
        assert_eq!(
            result.rows[0].observation.as_ref().unwrap().unit,
            "cigarette"
        );
    }
}
