use crate::domain::*;
use calamine::{open_workbook_auto, DataType, Reader};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, io::Write, path::Path};
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Sheet {
    pub name: String,
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
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
    if std::fs::metadata(path)?.len() > 25 * 1024 * 1024 {
        return Err(invalid("Fichier trop volumineux (25 Mo maximum)."));
    }
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mut sheets = vec![];
    match ext.as_str() {
        "csv" => {
            let bytes = std::fs::read(path)?;
            let text = std::str::from_utf8(&bytes)
                .map_err(|_| invalid("Le CSV doit être encodé en UTF-8."))?
                .trim_start_matches('\u{feff}');
            let first = text.lines().next().unwrap_or("");
            let delimiter = if first.matches(';').count() > first.matches(',').count() {
                b';'
            } else {
                b','
            };
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
            });
        }
        "xls" | "xlsx" => {
            let mut book = open_workbook_auto(path)?;
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
                let mut rows = range.rows().map(|r| {
                    r.iter()
                        .map(|c| {
                            if c.is_datetime() || c.is_datetime_iso() {
                                c.as_datetime()
                                    .map(|d| d.date().to_string())
                                    .unwrap_or_else(|| c.to_string())
                            } else {
                                c.to_string()
                            }
                        })
                        .collect::<Vec<_>>()
                });
                let headers = rows.next().unwrap_or_default();
                sheets.push(Sheet {
                    name,
                    headers,
                    rows: rows.collect(),
                });
            }
        }
        "json" => {
            let value: serde_json::Value = serde_json::from_slice(&std::fs::read(path)?)?;
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
        _ => s,
    }
    .to_string()
}
fn parse_row(row: &[String], m: &Mapping, pid: &str, filename: &str) -> Result<Observation> {
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
    let date = chrono::NaiveDate::parse_from_str(at(m.date_column)?, fmt)
        .map_err(|_| invalid("Date invalide pour le format choisi."))?
        .to_string();
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
    let mut seen: HashMap<(String, String), f64> = s
        .observations
        .iter()
        .filter(|o| o.profile_id == pid)
        .map(|o| ((o.date.clone(), o.metric.clone()), o.value))
        .collect();
    let mut rows = vec![];
    for (i, row) in sheet.rows.iter().enumerate() {
        let pr = match parse_row(row, m, pid, &book.filename) {
            Ok(o) => {
                let key = (o.date.clone(), o.metric.clone());
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
                x.profile_id == p.profile_id && x.date == o.date && x.metric == o.metric
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
        let dir = tempfile::tempdir().unwrap();
        for ext in ["csv", "xls", "xlsx"] {
            let path = dir.path().join(format!("test.{ext}"));
            export(&path, ext, &s, &s.profiles[0].id).unwrap();
            let b = read(&path).unwrap();
            assert_eq!(b.sheets[0].rows.len(), 140, "{ext}");
            assert_eq!(b.sheets[0].headers[0], "date");
            let mapping = Mapping {
                sheet: 0,
                date_column: 0,
                metric_column: Some(1),
                value_column: 2,
                unit_column: Some(3),
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
        assert!(parse_row(&row, &m, "p", "test").is_err());
        m.date_format = "dmy".into();
        assert_eq!(parse_row(&row, &m, "p", "test").unwrap().date, "2026-04-03");
        m.date_format = "mdy".into();
        assert_eq!(parse_row(&row, &m, "p", "test").unwrap().date, "2026-03-04");
    }
}
