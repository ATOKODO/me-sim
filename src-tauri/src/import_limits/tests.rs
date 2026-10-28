use super::excel_binary::sst;
use super::*;
use std::io::Cursor;
use std::io::Write;
// @spec TECH-RUST-113
fn zipped(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    for (name, data) in entries {
        zip.start_file(
            *name,
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated),
        )
        .unwrap();
        zip.write_all(data).unwrap();
    }
    zip.finish().unwrap().into_inner()
}
// @spec TECH-RUST-113
fn workbook(sheet: &str) -> Vec<u8> {
    zipped(&[
        (
            "xl/workbook.xml",
            b"<workbook><sheets><sheet name='S'/></sheets></workbook>",
        ),
        ("xl/worksheets/sheet1.xml", sheet.as_bytes()),
    ])
}
// @spec TECH-RUST-113
fn rejected(result: Result<()>) {
    let error = result.unwrap_err();
    assert_eq!(error.code, "INVALID_DATA");
}
// @spec TECH-RUST-113
#[test]
fn sparse_and_declared_xlsx_extents_are_rejected_before_range_loading() {
    for sheet in [
        "<worksheet><dimension ref='A1:IV50001'/><sheetData/></worksheet>",
        "<worksheet><dimension ref='A1'/><sheetData><row><c r='A1'><v>1</v></c><c r='IV50001'><v>2</v></c></row></sheetData></worksheet>",
        "<worksheet><sheetData><row r='1048577'><c><v>1</v></c></row></sheetData></worksheet>",
        "<worksheet><dimension ref='B2:A1'/><sheetData/></worksheet>",
    ] {
        let bytes=workbook(sheet);
        rejected(xlsx(&bytes));
        let dir=tempfile::tempdir().unwrap(); let path=dir.path().join("bad.xlsx");std::fs::write(&path,bytes).unwrap();
        assert_eq!(crate::exchange::read(&path).unwrap_err().code,"INVALID_DATA");
    }
}
// @spec TECH-RUST-113
#[test]
fn implicit_xlsx_cells_and_cumulative_grids_are_bounded() {
    let sheet = format!(
        "<worksheet><sheetData><row>{}</row></sheetData></worksheet>",
        "<c><v>1</v></c>".repeat(257)
    );
    rejected(xlsx(&workbook(&sheet)));
    let grid=b"<worksheet><sheetData><row><c r='A1'><v>1</v></c><c r='AX10000'><v>2</v></c></row></sheetData></worksheet>";
    rejected(xlsx(&zipped(&[
        ("xl/workbook.xml", b"<workbook/>"),
        ("a.xml", grid),
        ("b.xml", grid),
        ("c.xml", grid),
    ])));
}
// @spec TECH-RUST-113
#[test]
fn zip_metadata_is_bounded_before_archive_allocation() {
    let names: Vec<_> = (0..513).map(|i| format!("{i}.xml")).collect();
    let entries: Vec<_> = names
        .iter()
        .map(|n| (n.as_str(), b"<x/>".as_slice()))
        .collect();
    rejected(xlsx(&zipped(&entries)));
    let mut bytes = workbook("<worksheet/>");
    let central = bytes.windows(4).position(|v| v == b"PK\x01\x02").unwrap();
    bytes[central + 24..central + 28]
        .copy_from_slice(&((MAX_ENTRY_BYTES + 1) as u32).to_le_bytes());
    rejected(xlsx(&bytes));
    let mut bytes = zipped(&[("a.xml", b"<x/>"), ("b.xml", b"<x/>"), ("c.xml", b"<x/>")]);
    let offsets: Vec<_> = bytes
        .windows(4)
        .enumerate()
        .filter_map(|(i, v)| (v == b"PK\x01\x02").then_some(i))
        .collect();
    for offset in offsets {
        bytes[offset + 24..offset + 28].copy_from_slice(&(24u32 * 1024 * 1024).to_le_bytes());
    }
    rejected(xlsx(&bytes));
}
// @spec TECH-RUST-113
#[test]
fn dishonest_zip_sizes_duplicate_names_and_malformed_archives_fail() {
    let mut bytes = workbook("<worksheet/>");
    let central = bytes.windows(4).position(|v| v == b"PK\x01\x02").unwrap();
    bytes[central + 24..central + 28].copy_from_slice(&1u32.to_le_bytes());
    rejected(xlsx(&bytes));
    // Duplicate entries are checked even if the ZIP writer permits them.
    let bytes = zipped(&[("xl/workbook.xml", b"<a/>"), ("xl/workbook.xmx", b"<a/>")]);
    let mut duplicate = bytes.clone();
    for start in bytes
        .windows(15)
        .enumerate()
        .filter_map(|(i, v)| (v == b"xl/workbook.xmx").then_some(i))
    {
        duplicate[start + 14] = b'l';
    }
    rejected(xlsx(&duplicate));
    rejected(xlsx(b"not a zip"));
    let bytes = workbook("<worksheet><sheetData>");
    rejected(xlsx(&bytes));
}
// @spec TECH-RUST-113
#[test]
fn xml_counts_depth_attributes_formulas_and_entities_are_checked() {
    for sheet in [
        "<worksheet><sheetData><row><c><f>1+1</f></c></row></sheetData></worksheet>".to_string(),
        format!(
            "<worksheet {}><sheetData/></worksheet>",
            (0..65).map(|i| format!("a{i}='x' ")).collect::<String>()
        ),
        format!("{}{}", "<x>".repeat(65), "</x>".repeat(65)),
        "<!DOCTYPE worksheet [<!ENTITY x 'bad'>]><worksheet/>".to_string(),
    ] {
        rejected(xlsx(&workbook(&sheet)));
    }
    rejected(xlsx(&zipped(&[
        ("xl/workbook.xml", b"<workbook/>"),
        ("xl/sharedStrings.xml", b"<sst uniqueCount='4294967295'/>"),
    ])));
    let sheets = format!(
        "<workbook><sheets>{}</sheets></workbook>",
        "<sheet/>".repeat(17)
    );
    rejected(xlsx(&zipped(&[("xl/workbook.xml", sheets.as_bytes())])));
}
// @spec TECH-RUST-113
#[test]
fn shared_text_amplification_is_bounded_across_sheets() {
    let strings = format!("<sst><si><t>{}</t></si></sst>", "x".repeat(1024));
    let cells = (1..=35000)
        .map(|i| format!("<row r='{i}'><c t='s'><v>0</v></c></row>"))
        .collect::<String>();
    let sheet = format!("<worksheet><sheetData>{cells}</sheetData></worksheet>");
    rejected(xlsx(&zipped(&[
        ("xl/workbook.xml", b"<workbook/>"),
        ("xl/sharedStrings.xml", strings.as_bytes()),
        ("xl/worksheets/sheet.xml", sheet.as_bytes()),
    ])));
}
// @spec TECH-RUST-113
#[test]
fn csv_quotes_limits_and_exact_row_boundary() {
    csv(
        b"date;note;value\r\n2026-10-01;\"a; b\nline \"\"two\"\"\";75,5\r\n",
        b';',
    )
    .unwrap();
    rejected(csv(";".repeat(20000).as_bytes(), b';'));
    rejected(csv(
        format!("note\n\"{}\"\n", "x".repeat(MAX_CELL_BYTES + 1)).as_bytes(),
        b',',
    ));
    let accepted = format!("value\n{}", "1\n".repeat(50000));
    csv(accepted.as_bytes(), b',').unwrap();
    rejected(csv(format!("{accepted}1\n").as_bytes(), b','));
    let line = format!("{}\n", vec!["1"; 256].join(","));
    rejected(csv(line.repeat(2000).as_bytes(), b','));
}
// @spec TECH-RUST-113
#[test]
fn json_preflight_rejects_nested_values_and_large_tables() {
    json(br#"[{"date":"2026-10-01","value":75.5,"empty":null,"flag":true}]"#).unwrap();
    for bytes in [
        br#"[{"v":[1]}]"#.as_slice(),
        br#"[{"v":{"x":1}}]"#.as_slice(),
        b"[] trailing",
    ] {
        rejected(json(bytes));
    }
    let wide = format!(
        "[{{{}}}]",
        (0..257)
            .map(|i| format!("\"c{i}\":0"))
            .collect::<Vec<_>>()
            .join(",")
    );
    rejected(json(wide.as_bytes()));
    let large = format!("[{{\"v\":\"{}\"}}]", "x".repeat(MAX_CELL_BYTES + 1));
    rejected(json(large.as_bytes()));
    let accepted = format!("[{}]", vec!["{\"v\":1}"; 50000].join(","));
    json(accepted.as_bytes()).unwrap();
    rejected(json(
        format!("[{}]", vec!["{\"v\":1}"; 50001].join(",")).as_bytes(),
    ));
}
// @spec TECH-RUST-113
fn record(out: &mut Vec<u8>, kind: u16, data: &[u8]) {
    out.extend(kind.to_le_bytes());
    out.extend((data.len() as u16).to_le_bytes());
    out.extend(data);
}
// @spec TECH-RUST-113
fn biff_book(records: &[(u16, Vec<u8>)], globals: &[(u16, Vec<u8>)]) -> Vec<u8> {
    let mut out = Vec::new();
    record(&mut out, 0x0809, &[0, 6, 5, 0]);
    for (kind, data) in globals {
        record(&mut out, *kind, data);
    }
    let bound = out.len();
    record(&mut out, 0x0085, &[0, 0, 0, 0, 0, 0, 1, 0, b'S']);
    record(&mut out, 0x000A, &[]);
    let offset = out.len() as u32;
    out[bound + 4..bound + 8].copy_from_slice(&offset.to_le_bytes());
    record(&mut out, 0x0809, &[0, 6, 0x10, 0]);
    for (kind, data) in records {
        record(&mut out, *kind, data);
    }
    record(&mut out, 0x000A, &[]);
    out
}
// @spec TECH-RUST-113
fn compound(workbook: &[u8]) -> Vec<u8> {
    let mut file =
        cfb::CompoundFile::create_with_version(cfb::Version::V3, Cursor::new(Vec::new())).unwrap();
    file.create_stream("/Workbook")
        .unwrap()
        .write_all(workbook)
        .unwrap();
    file.into_inner().into_inner()
}
// @spec TECH-RUST-113
fn number(row: u16, col: u16) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend(row.to_le_bytes());
    out.extend(col.to_le_bytes());
    out.extend(0u16.to_le_bytes());
    out.extend(1f64.to_le_bytes());
    out
}
// @spec TECH-RUST-113
#[test]
fn xls_dimensions_sparse_cells_and_formulas_fail_before_calamine() {
    let mut dims = Vec::new();
    dims.extend(0u32.to_le_bytes());
    dims.extend(50001u32.to_le_bytes());
    dims.extend(0u16.to_le_bytes());
    dims.extend(256u16.to_le_bytes());
    dims.extend(0u16.to_le_bytes());
    for records in [
        vec![(0x0200, dims)],
        vec![(0x0203, number(0, 0)), (0x0203, number(50000, 255))],
        vec![(0x0006, vec![0; 20])],
    ] {
        let bytes = compound(&biff_book(&records, &[]));
        assert_eq!(xls(&bytes).unwrap_err().code, "INVALID_DATA");
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bad.xls");
        std::fs::write(&path, bytes).unwrap();
        assert_eq!(
            crate::exchange::read(&path).unwrap_err().code,
            "INVALID_DATA"
        );
    }
}
// @spec TECH-RUST-113
#[test]
fn xls_shared_strings_and_continuations_remain_supported() {
    let mut first = vec![1, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0];
    first.extend(b"ab");
    assert_eq!(sst(vec![&first, b"\0cd"], &mut 0).unwrap(), vec![16]);
    rejected(sst(vec![&first, b"\0c"], &mut 0).map(|_| ()));
    let sst_record = [1, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, b't', b'e', b's', b't'];
    let workbook = biff_book(&[(0x00FD, vec![0; 10])], &[(0x00FC, sst_record.to_vec())]);
    let bytes = compound(&workbook);
    xls(&bytes).unwrap();
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("sst.xls");
    std::fs::write(&path, bytes).unwrap();
    assert_eq!(
        crate::exchange::read(&path).unwrap().sheets[0].headers,
        vec!["test"]
    );
}
// @spec TECH-RUST-113
#[test]
fn entity_encoded_and_split_cell_text_cannot_bypass_text_budgets() {
    let strings = format!("<sst><si><t>{}</t></si></sst>", "&amp;".repeat(4096));
    let cells = (1..=9000)
        .map(|i| format!("<row r='{i}'><c t='s'><v>0</v></c></row>"))
        .collect::<String>();
    let sheet = format!("<worksheet><sheetData>{cells}</sheetData></worksheet>");
    rejected(xlsx(&zipped(&[
        ("xl/workbook.xml", b"<workbook/>"),
        ("extra.xml", b"<sst><si><t/></si></sst>"),
        ("xl/sharedStrings.xml", strings.as_bytes()),
        ("xl/worksheets/sheet.xml", sheet.as_bytes()),
    ])));
    let fragments = format!(
        "<worksheet><sheetData><row><c t='inlineStr'><is>{}</is></c></row></sheetData></worksheet>",
        format!("<t>{}</t>", "x".repeat(1024)).repeat(257)
    );
    rejected(xlsx(&workbook(&fragments)));
}
// @spec TECH-RUST-113
#[test]
fn escaped_unicode_xlsx_text_remains_readable() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("unicode.xlsx");
    let mut book = rust_xlsxwriter::Workbook::new();
    book.add_worksheet()
        .write_string(0, 0, "Été & repos < 5")
        .unwrap();
    book.save(&path).unwrap();
    assert_eq!(
        crate::exchange::read(&path).unwrap().sheets[0].headers,
        vec!["Été & repos < 5"]
    );
}
// @spec TECH-RUST-113
#[test]
fn compressed_xml_payload_is_rejected_without_loading_a_sheet() {
    let body = format!("<worksheet>{}</worksheet>", "x".repeat(2 * 1024 * 1024));
    let bytes = workbook(&body);
    assert!(bytes.len() < 10_000);
    rejected(xlsx(&bytes));
}
// @spec TECH-RUST-113
#[test]
fn xls_shared_text_amplification_and_malformed_cfb_are_rejected() {
    let mut table = vec![0x28, 0x23, 0, 0, 1, 0, 0, 0];
    table.extend(4096u16.to_le_bytes());
    table.push(0);
    table.extend(vec![b'x'; 4096]);
    let cells = vec![(0x00FD, vec![0; 10]); 9000];
    let bytes = compound(&biff_book(&cells, &[(0x00FC, table)]));
    assert_eq!(xls(&bytes).unwrap_err().code, "INVALID_DATA");
    let mut malformed = compound(&biff_book(&[], &[]));
    malformed[44..48].copy_from_slice(&u32::MAX.to_le_bytes());
    assert!(xls(&malformed).is_err());
}
// @spec TECH-RUST-113
#[test]
fn raw_file_size_is_bounded_without_loading_oversize_data() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("large.csv");
    let file = std::fs::File::create(&path).unwrap();
    file.set_len((MAX_FILE_BYTES + 1) as u64).unwrap();
    assert_eq!(read_file(&path).unwrap_err().code, "INVALID_DATA");
}

// @spec TECH-RUST-113
#[test]
fn exact_csv_record_limit_and_backup_guidance_are_preserved() {
    let record = format!("{}\n", vec!["x".repeat(256 * 1024); 4].join(","));
    csv(record.as_bytes(), b',').unwrap();
    let backup = json(br#" {"version":1,"profiles":[]}"#).unwrap_err();
    assert!(backup.message.contains("utilisez Restaurer"));
}
// @spec TECH-RUST-113
#[test]
fn exchange_checks_csv_and_json_before_building_tables() {
    let dir = tempfile::tempdir().unwrap();
    let csv_path = dir.path().join("wide.csv");
    std::fs::write(&csv_path, vec!["column"; 257].join(";")).unwrap();
    assert_eq!(
        crate::exchange::read(&csv_path).unwrap_err().code,
        "INVALID_DATA"
    );
    let json_path = dir.path().join("wide.json");
    let fields = (0..257)
        .map(|i| format!("\"field{i}\":0"))
        .collect::<Vec<_>>()
        .join(",");
    std::fs::write(&json_path, format!("[{{{fields}}}]")).unwrap();
    assert_eq!(
        crate::exchange::read(&json_path).unwrap_err().code,
        "INVALID_DATA"
    );
}

// @spec TECH-RUST-113
#[test]
fn compact_excel_tables_far_from_a1_retain_support() {
    let dir = tempfile::tempdir().unwrap();
    let xlsx_path = dir.path().join("offset.xlsx");
    let mut book = rust_xlsxwriter::Workbook::new();
    let sheet = book.add_worksheet();
    sheet.write_string(600000, 16000, "value").unwrap();
    sheet.write_number(600001, 16000, 1.).unwrap();
    book.save(&xlsx_path).unwrap();
    let table = crate::exchange::read(&xlsx_path).unwrap();
    assert_eq!(table.sheets[0].headers, vec!["value"]);
    assert_eq!(table.sheets[0].rows.len(), 1);
    let xls_path = dir.path().join("offset.xls");
    let cells = vec![(0x0203, number(60000, 255)), (0x0203, number(60001, 255))];
    std::fs::write(&xls_path, compound(&biff_book(&cells, &[]))).unwrap();
    let table = crate::exchange::read(&xls_path).unwrap();
    assert_eq!(table.sheets[0].headers, vec!["1"]);
    assert_eq!(table.sheets[0].rows.len(), 1);
}
