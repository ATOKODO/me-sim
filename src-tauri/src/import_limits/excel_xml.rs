use super::Extent;
use super::{
    add, invalid, rect, u16_at, u32_at, Result, LIMIT, MAX_CELL_BYTES, MAX_ENTRIES,
    MAX_ENTRY_BYTES, MAX_EVENTS, MAX_EXPANDED_BYTES, MAX_SHEETS, MAX_TEXT_BYTES, MAX_TOTAL_CELLS,
};
use quick_xml::{events::Event, Reader};
use std::{
    collections::{HashMap, HashSet},
    io::{Cursor, Read},
};

// Validate the central directory before ZipArchive allocates entry metadata. ZIP64
// is unnecessary for this 25 MiB input budget and is deliberately unsupported.
fn zip_directory(bytes: &[u8]) -> Result<()> {
    let start = bytes.len().saturating_sub(65_557);
    let end = (start..bytes.len().saturating_sub(21))
        .rev()
        .find(|&i| {
            bytes.get(i..i + 4) == Some(b"PK\x05\x06")
                && u16_at(bytes, i + 20).is_ok_and(|n| i + 22 + n == bytes.len())
        })
        .ok_or_else(|| invalid("Archive XLSX invalide."))?;
    let count = u16_at(bytes, end + 10)?;
    if count == 0
        || count > MAX_ENTRIES
        || u16_at(bytes, end + 4)? != 0
        || u16_at(bytes, end + 6)? != 0
        || u16_at(bytes, end + 8)? != count
    {
        return Err(invalid(LIMIT));
    }
    let size = u32_at(bytes, end + 12)?;
    let mut offset = u32_at(bytes, end + 16)?;
    if offset.checked_add(size) != Some(end) {
        return Err(invalid("Archive XLSX ou ZIP64 non prise en charge."));
    }
    let mut expanded = 0;
    let mut names = HashSet::new();
    for _ in 0..count {
        if bytes.get(offset..offset + 4) != Some(b"PK\x01\x02") {
            return Err(invalid("Répertoire ZIP invalide."));
        }
        let flags = u16_at(bytes, offset + 8)?;
        let method = u16_at(bytes, offset + 10)?;
        let length = u32_at(bytes, offset + 24)?;
        if flags & 1 != 0
            || ![0, 8].contains(&method)
            || length > MAX_ENTRY_BYTES
            || u16_at(bytes, offset + 34)? != 0
        {
            return Err(invalid(LIMIT));
        }
        add(&mut expanded, length, MAX_EXPANDED_BYTES)?;
        let name_len = u16_at(bytes, offset + 28)?;
        let name = bytes
            .get(offset + 46..offset + 46 + name_len)
            .ok_or_else(|| invalid("Nom ZIP tronqué."))?;
        if !names.insert(name.to_vec()) {
            return Err(invalid("Entrée ZIP dupliquée."));
        }
        let extra_len = u16_at(bytes, offset + 30)?;
        let comment_len = u16_at(bytes, offset + 32)?;
        let mut extra = offset + 46 + name_len;
        let extra_end = extra.checked_add(extra_len).ok_or_else(|| invalid(LIMIT))?;
        while extra < extra_end {
            let tag = u16_at(bytes, extra)?;
            let len = u16_at(bytes, extra + 2)?;
            if tag == 1 {
                return Err(invalid("ZIP64 non pris en charge pour les imports."));
            }
            extra = extra.checked_add(4 + len).ok_or_else(|| invalid(LIMIT))?;
        }
        if extra != extra_end {
            return Err(invalid("Extra ZIP invalide."));
        }
        offset = extra_end
            .checked_add(comment_len)
            .ok_or_else(|| invalid(LIMIT))?;
        if offset > end {
            return Err(invalid("Répertoire ZIP tronqué."));
        }
    }
    if offset != end {
        return Err(invalid("Nombre d’entrées ZIP incohérent."));
    }
    Ok(())
}
#[derive(Default)]
struct XmlBudget {
    events: usize,
    cells: usize,
    dense: usize,
    text: usize,
    sheets: usize,
    strings: Vec<usize>,
    refs: HashMap<usize, usize>,
}
fn coordinate(value: &[u8]) -> Result<(usize, usize)> {
    let mut column = 0usize;
    let mut index = 0;
    while index < value.len() && value[index].is_ascii_alphabetic() {
        column = column
            .checked_mul(26)
            .and_then(|n| n.checked_add((value[index].to_ascii_uppercase() - b'A' + 1) as usize))
            .ok_or_else(|| invalid(LIMIT))?;
        index += 1;
    }
    let row = std::str::from_utf8(&value[index..])
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .ok_or_else(|| invalid("Coordonnée XLSX invalide."))?;
    if row == 0 || column == 0 {
        return Err(invalid("Coordonnée XLSX invalide."));
    }
    if row > 1_048_576 || column > 16_384 {
        return Err(invalid("Coordonnée XLSX hors feuille."));
    }
    Ok((row - 1, column - 1))
}
fn decimal(value: &[u8]) -> Result<usize> {
    std::str::from_utf8(value)
        .ok()
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| invalid("Entier XML invalide."))
}
fn xml(bytes: &[u8], budget: &mut XmlBudget, collect_strings: bool) -> Result<()> {
    let mut reader = Reader::from_reader(bytes);
    let (mut depth, mut worksheet, mut row, mut col) = (0usize, false, 0usize, 0usize);
    let mut extent = Extent::default();
    let (mut shared_strings, mut in_si, mut si_bytes, mut shared_cell, mut in_value) =
        (false, false, 0usize, false, false);
    let mut value = Vec::new();
    let mut roots = 0;
    let mut cell_bytes = 0;
    let mut in_cell = false;
    loop {
        let event = reader.read_event().map_err(|e| invalid(&e.to_string()))?;
        add(&mut budget.events, 1, MAX_EVENTS)?;
        match event {
            Event::Start(ref tag) | Event::Empty(ref tag) => {
                let empty = matches!(event, Event::Empty(_));
                if tag.len() > 64 * 1024 || depth >= 64 {
                    return Err(invalid(LIMIT));
                }
                let local = tag.local_name();
                let name = local.as_ref();
                let mut attrs = HashMap::new();
                for attr in tag.attributes() {
                    let attr = attr.map_err(|e| invalid(&e.to_string()))?;
                    if attrs.len() >= 64 {
                        return Err(invalid(LIMIT));
                    }
                    if matches!(attr.key.as_ref(), b"count" | b"uniqueCount")
                        && decimal(&attr.value)? > MAX_TOTAL_CELLS
                    {
                        return Err(invalid(LIMIT));
                    }
                    attrs.insert(attr.key.as_ref().to_vec(), attr.value.into_owned());
                }
                if depth == 0 {
                    roots += 1;
                    if roots > 1 || (collect_strings && name != b"sst") {
                        return Err(invalid("Racine XML invalide."));
                    }
                }
                let level = depth + 1;
                if !empty {
                    depth += 1;
                }
                if name == b"worksheet" {
                    worksheet = true;
                }
                if collect_strings && name == b"sst" {
                    shared_strings = true;
                }
                if name == b"sheet" {
                    add(&mut budget.sheets, 1, MAX_SHEETS)?;
                }
                if shared_strings && name == b"si" {
                    if in_si || level != 2 {
                        return Err(invalid("Structure SST invalide."));
                    }
                    if empty {
                        budget.strings.push(0);
                    } else {
                        in_si = true;
                        si_bytes = 0;
                    }
                    if budget.strings.len() > MAX_TOTAL_CELLS {
                        return Err(invalid(LIMIT));
                    }
                }
                if worksheet {
                    match name {
                        b"dimension" => {
                            if let Some(reference) = attrs.get(b"ref".as_slice()) {
                                let mut bounds = reference.split(|&b| b == b':');
                                let first = coordinate(bounds.next().unwrap_or_default())?;
                                let last = if let Some(last) = bounds.next() {
                                    coordinate(last)?
                                } else {
                                    first
                                };
                                if bounds.next().is_some() || last.0 < first.0 || last.1 < first.1 {
                                    return Err(invalid("Dimension XLSX invalide."));
                                }
                                rect(last.0 - first.0 + 1, last.1 - first.1 + 1)?;
                            }
                        }
                        b"row" => {
                            if let Some(r) = attrs.get(b"r".as_slice()) {
                                row = decimal(r)?
                                    .checked_sub(1)
                                    .ok_or_else(|| invalid("Ligne XLSX invalide."))?;
                            }
                            if row >= 1_048_576 {
                                return Err(invalid("Ligne XLSX hors feuille."));
                            }
                            if empty {
                                row += 1;
                                col = 0;
                            }
                        }
                        b"c" => {
                            if in_cell {
                                return Err(invalid("Cellule XLSX imbriquée."));
                            }
                            in_cell = !empty;
                            cell_bytes = 0;
                            let pos = if let Some(r) = attrs.get(b"r".as_slice()) {
                                coordinate(r)?
                            } else {
                                (row, col)
                            };
                            if pos.0 >= 1_048_576 || pos.1 >= 16_384 {
                                return Err(invalid("Coordonnée XLSX hors feuille."));
                            }
                            extent.include(pos.0, pos.1)?;
                            add(&mut budget.cells, 1, MAX_TOTAL_CELLS)?;
                            col = pos.1 + 1;
                            shared_cell = attrs.get(b"t".as_slice()).is_some_and(|t| t == b"s");
                            value.clear();
                        }
                        b"f" => return Err(invalid(
                            "La feuille contient des formules. Exportez ses valeurs uniquement.",
                        )),
                        b"v" => {
                            in_value = !empty;
                            value.clear();
                        }
                        _ => {}
                    }
                }
            }
            Event::Text(text) => {
                if text.len() > MAX_CELL_BYTES {
                    return Err(invalid(LIMIT));
                }
                add(&mut budget.text, text.len(), MAX_TEXT_BYTES)?;
                if in_si {
                    add(&mut si_bytes, text.len(), MAX_CELL_BYTES)?;
                }
                if in_cell {
                    add(&mut cell_bytes, text.len(), MAX_CELL_BYTES)?;
                }
                if shared_cell && in_value {
                    value.extend_from_slice(text.as_ref());
                }
            }
            Event::CData(text) => {
                if text.len() > MAX_CELL_BYTES {
                    return Err(invalid(LIMIT));
                }
                add(&mut budget.text, text.len(), MAX_TEXT_BYTES)?;
                if in_si {
                    add(&mut si_bytes, text.len(), MAX_CELL_BYTES)?;
                }
                if in_cell {
                    add(&mut cell_bytes, text.len(), MAX_CELL_BYTES)?;
                }
                if shared_cell && in_value {
                    value.extend_from_slice(text.as_ref());
                }
            }
            Event::End(tag) => {
                depth = depth
                    .checked_sub(1)
                    .ok_or_else(|| invalid("Structure XML invalide."))?;
                match tag.local_name().as_ref() {
                    b"row" if worksheet => {
                        row += 1;
                        col = 0;
                    }
                    b"si" if shared_strings => {
                        budget.strings.push(si_bytes);
                        in_si = false;
                        if budget.strings.len() > MAX_TOTAL_CELLS {
                            return Err(invalid(LIMIT));
                        }
                    }
                    b"v" if worksheet => {
                        if shared_cell {
                            let index = decimal(&value)?;
                            *budget.refs.entry(index).or_default() += 1;
                        }
                        in_value = false;
                    }
                    b"c" => {
                        shared_cell = false;
                        in_cell = false;
                    }
                    _ => {}
                }
            }
            Event::GeneralRef(reference) => {
                let name = std::str::from_utf8(reference.as_ref())
                    .map_err(|_| invalid("Entité XML invalide."))?;
                let escaped = format!("&{name};");
                let decoded =
                    quick_xml::escape::unescape(&escaped).map_err(|e| invalid(&e.to_string()))?;
                add(&mut budget.text, decoded.len(), MAX_TEXT_BYTES)?;
                if in_si {
                    add(&mut si_bytes, decoded.len(), MAX_CELL_BYTES)?;
                }
                if in_cell {
                    add(&mut cell_bytes, decoded.len(), MAX_CELL_BYTES)?;
                }
                if shared_cell && in_value {
                    value.extend_from_slice(decoded.as_bytes());
                }
            }
            Event::Decl(declaration) => {
                if let Some(encoding) = declaration.encoding() {
                    let encoding = encoding.map_err(|e| invalid(&e.to_string()))?;
                    if !encoding.eq_ignore_ascii_case(b"UTF-8")
                        && !encoding.eq_ignore_ascii_case(b"UTF8")
                        && !encoding.eq_ignore_ascii_case(b"US-ASCII")
                    {
                        return Err(invalid("XML : encodage UTF-8 requis."));
                    }
                }
            }
            Event::DocType(_) => {
                return Err(invalid(
                    "DTD et entités XML personnalisées non prises en charge.",
                ))
            }
            Event::Eof => break,
            _ => {}
        }
    }
    if depth != 0 || roots != 1 {
        return Err(invalid("XML tronqué."));
    }
    if worksheet {
        add(&mut budget.dense, extent.cells()?, MAX_TOTAL_CELLS)?;
    }
    Ok(())
}
pub fn xlsx(bytes: &[u8]) -> Result<()> {
    zip_directory(bytes)?;
    let mut archive =
        zip::ZipArchive::new(Cursor::new(bytes)).map_err(|e| invalid(&e.to_string()))?;
    if archive.len() > MAX_ENTRIES {
        return Err(invalid(LIMIT));
    }
    let mut expanded = 0;
    let mut names = HashSet::new();
    let mut budget = XmlBudget::default();
    for index in 0..archive.len() {
        let entry = archive
            .by_index(index)
            .map_err(|e| invalid(&e.to_string()))?;
        let name = entry.name().to_string();
        if !names.insert(name.clone()) {
            return Err(invalid("Entrée ZIP dupliquée."));
        }
        let declared = entry.size() as usize;
        if declared > MAX_ENTRY_BYTES {
            return Err(invalid(LIMIT));
        }
        let mut data = Vec::new();
        entry
            .take(MAX_ENTRY_BYTES as u64 + 1)
            .read_to_end(&mut data)
            .map_err(|e| invalid(&e.to_string()))?;
        if data.len() != declared || data.len() > MAX_ENTRY_BYTES {
            return Err(invalid(LIMIT));
        }
        add(&mut expanded, data.len(), MAX_EXPANDED_BYTES)?;
        if name.ends_with(".xml") || name.ends_with(".rels") {
            xml(&data, &mut budget, name == "xl/sharedStrings.xml")?;
        }
    }
    if !names.contains("xl/workbook.xml") {
        return Err(invalid("Classeur XLSX manquant."));
    }
    for (index, count) in budget.refs {
        let length = *budget
            .strings
            .get(index)
            .ok_or_else(|| invalid("Référence de texte XLSX invalide."))?;
        add(
            &mut budget.text,
            length.checked_mul(count).ok_or_else(|| invalid(LIMIT))?,
            MAX_TEXT_BYTES,
        )?;
    }
    Ok(())
}
