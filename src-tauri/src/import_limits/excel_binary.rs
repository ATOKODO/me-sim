use super::Extent;
use super::{
    add, invalid, rect, u16_at, u32_at, Result, LIMIT, MAX_CELL_BYTES, MAX_EVENTS, MAX_FILE_BYTES,
    MAX_SHEETS, MAX_TEXT_BYTES, MAX_TOTAL_CELLS,
};
use std::io::{Cursor, Read};

struct BiffRecord<'a> {
    kind: usize,
    data: &'a [u8],
}
// @spec TECH-RUST-108
fn biff_record<'a>(bytes: &'a [u8], position: &mut usize) -> Result<BiffRecord<'a>> {
    let kind = u16_at(bytes, *position)?;
    let length = u16_at(bytes, *position + 2)?;
    *position += 4;
    let data = bytes
        .get(*position..*position + length)
        .ok_or_else(|| invalid("Enregistrement XLS tronqué."))?;
    *position += length;
    Ok(BiffRecord { kind, data })
}
// SST continuation records change character encoding only while inside string
// characters. Rich-text/extension bytes have ordinary continuation semantics.
struct SstCursor<'a> {
    segments: Vec<&'a [u8]>,
    segment: usize,
    position: usize,
}
impl SstCursor<'_> {
    // @spec TECH-RUST-108
    fn advance(&mut self) -> bool {
        while self.segment < self.segments.len()
            && self.position == self.segments[self.segment].len()
        {
            self.segment += 1;
            self.position = 0;
        }
        self.segment < self.segments.len()
    }
    // @spec TECH-RUST-108
    fn contiguous(&mut self, n: usize) -> Result<()> {
        if !self.advance() || self.segments[self.segment].len() - self.position < n {
            return Err(invalid("En-tête SST tronqué."));
        }
        Ok(())
    }
    // @spec TECH-RUST-108
    fn byte(&mut self) -> Result<u8> {
        self.contiguous(1)?;
        let value = self.segments[self.segment][self.position];
        self.position += 1;
        Ok(value)
    }
    // @spec TECH-RUST-108
    fn short(&mut self) -> Result<usize> {
        let low = self.byte()? as usize;
        Ok(low | ((self.byte()? as usize) << 8))
    }
    // @spec TECH-RUST-108
    fn long(&mut self) -> Result<usize> {
        let low = self.short()?;
        Ok(low | (self.short()? << 16))
    }
    // @spec TECH-RUST-108
    fn skip(&mut self, mut n: usize) -> Result<()> {
        while n > 0 {
            if !self.advance() {
                return Err(invalid("Texte SST tronqué."));
            }
            let amount = n.min(self.segments[self.segment].len() - self.position);
            self.position += amount;
            n -= amount;
        }
        Ok(())
    }
    // @spec TECH-RUST-108
    fn characters(&mut self, mut n: usize, mut wide: bool) -> Result<()> {
        while n > 0 {
            if self.position == self.segments[self.segment].len() {
                if !self.advance() {
                    return Err(invalid("Texte SST tronqué."));
                }
                let flag = self.byte()?;
                if flag > 1 {
                    return Err(invalid("Continuation SST invalide."));
                }
                wide = flag == 1;
            }
            let unit = if wide { 2 } else { 1 };
            let available = self.segments[self.segment].len() - self.position;
            if available < unit {
                return Err(invalid("Caractère SST tronqué."));
            }
            let count = n.min(available / unit);
            self.position += count * unit;
            n -= count;
        }
        Ok(())
    }
}
// @spec TECH-RUST-108
pub(super) fn sst(segments: Vec<&[u8]>, budget: &mut usize) -> Result<Vec<usize>> {
    let mut cursor = SstCursor {
        segments,
        segment: 0,
        position: 0,
    };
    cursor.contiguous(8)?;
    cursor.long()?;
    let declared = cursor.long()?;
    if declared > MAX_TOTAL_CELLS {
        return Err(invalid(LIMIT));
    }
    let mut lengths = Vec::new();
    while cursor.advance() {
        cursor.contiguous(3)?;
        let chars = cursor.short()?;
        let flags = cursor.byte()?;
        let header_bytes = usize::from(flags & 8 != 0) * 2 + usize::from(flags & 4 != 0) * 4;
        if header_bytes > 0 {
            cursor.contiguous(header_bytes)?;
        }
        let rich = if flags & 8 != 0 { cursor.short()? } else { 0 };
        let extended = if flags & 4 != 0 { cursor.long()? } else { 0 };
        let length = chars.checked_mul(4).ok_or_else(|| invalid(LIMIT))?;
        if length > MAX_CELL_BYTES {
            return Err(invalid(LIMIT));
        }
        add(budget, length, MAX_TEXT_BYTES)?;
        cursor.characters(chars, flags & 1 != 0)?;
        cursor.skip(rich * 4)?;
        cursor.skip(extended)?;
        lengths.push(length);
        if lengths.len() > MAX_TOTAL_CELLS {
            return Err(invalid(LIMIT));
        }
    }
    if lengths.len() != declared {
        return Err(invalid("Nombre de textes SST incohérent."));
    }
    Ok(lengths)
}
// @spec TECH-RUST-108
fn xls_dimensions(data: &[u8]) -> Result<usize> {
    let (first_row, last_row, first_col, last_col) = match data.len() {
        10 => (
            u16_at(data, 0)?,
            u16_at(data, 2)?,
            u16_at(data, 4)?,
            u16_at(data, 6)?,
        ),
        14 => (
            u32_at(data, 0)?,
            u32_at(data, 4)?,
            u16_at(data, 8)?,
            u16_at(data, 10)?,
        ),
        _ => return Err(invalid("Dimension XLS invalide.")),
    };
    if first_row >= 65_536 || first_col >= 256 || last_row > 65_536 || last_col > 256 {
        return Err(invalid("Dimension XLS hors feuille."));
    }
    if last_row == 0 && last_col == 0 {
        return rect(1, 1);
    }
    if last_row <= first_row || last_col <= first_col {
        return Err(invalid("Dimension XLS inversée."));
    }
    rect(last_row - first_row, last_col - first_col)
}
// @spec TECH-RUST-108
fn biff(bytes: &[u8]) -> Result<()> {
    let mut position = 0;
    let mut events = 0;
    let mut text = 0;
    let mut total_cells = 0;
    let mut dense = 0;
    let mut offsets = Vec::new();
    let mut strings = Vec::new();
    let mut globals_end = false;
    while position < bytes.len() {
        add(&mut events, 1, MAX_EVENTS)?;
        let record = biff_record(bytes, &mut position)?;
        match record.kind {
            0x0809 => {
                if record.data.len() < 4 {
                    return Err(invalid("BOF XLS invalide."));
                }
            }
            0x0085 => {
                if record.data.len() < 7 {
                    return Err(invalid("Feuille XLS tronquée."));
                }
                offsets.push(u32_at(record.data, 0)?);
                if offsets.len() > MAX_SHEETS {
                    return Err(invalid(LIMIT));
                }
            }
            0x002F => return Err(invalid("Classeur XLS chiffré non pris en charge.")),
            0x00FC => {
                let mut segments = vec![record.data];
                while bytes.get(position..position + 2) == Some(&[0x3c, 0]) {
                    add(&mut events, 1, MAX_EVENTS)?;
                    segments.push(biff_record(bytes, &mut position)?.data);
                }
                strings = sst(segments, &mut text)?;
            }
            0x000A => {
                globals_end = true;
                break;
            }
            _ => {}
        }
    }
    if !globals_end {
        return Err(invalid("Fin du classeur XLS manquante."));
    }
    for offset in offsets {
        let mut position = offset;
        let first = biff_record(bytes, &mut position)?;
        if first.kind != 0x0809 || first.data.len() < 4 {
            return Err(invalid("Offset de feuille XLS invalide."));
        }
        let mut extent = Extent::default();
        let mut end = false;
        while position < bytes.len() {
            add(&mut events, 1, MAX_EVENTS)?;
            let record = biff_record(bytes, &mut position)?;
            if record.kind == 0x000A {
                end = true;
                break;
            }
            if record.kind == 0x0200 {
                xls_dimensions(record.data)?;
            }
            if record.kind == 0x0006 || record.kind == 0x0207 {
                return Err(invalid(
                    "La feuille contient des formules. Exportez ses valeurs uniquement.",
                ));
            }
            if matches!(
                record.kind,
                0x0203 | 0x0204 | 0x00D6 | 0x0205 | 0x027E | 0x00FD | 0x00BD
            ) {
                let row = u16_at(record.data, 0)?;
                let col = u16_at(record.data, 2)?;
                let last_col = if record.kind == 0x00BD {
                    if record.data.len() < 12 {
                        return Err(invalid("Cellules XLS tronquées."));
                    }
                    let last = u16_at(record.data, record.data.len() - 2)?;
                    if last < col || record.data.len() != 6 + 6 * (last - col + 1) {
                        return Err(invalid("Colonnes XLS incohérentes."));
                    }
                    last
                } else {
                    col
                };
                if last_col >= 256 {
                    return Err(invalid("Colonne XLS hors feuille."));
                }
                extent.include(row, col)?;
                extent.include(row, last_col)?;
                add(&mut total_cells, last_col - col + 1, MAX_TOTAL_CELLS)?;
                if record.kind == 0x00FD {
                    let length = *strings
                        .get(u32_at(record.data, 6)?)
                        .ok_or_else(|| invalid("Référence SST invalide."))?;
                    add(&mut text, length, MAX_TEXT_BYTES)?;
                } else if matches!(record.kind, 0x0204 | 0x00D6) {
                    let length = u16_at(record.data, 6)?
                        .checked_mul(4)
                        .ok_or_else(|| invalid(LIMIT))?;
                    if length > MAX_CELL_BYTES {
                        return Err(invalid(LIMIT));
                    }
                    add(&mut text, length, MAX_TEXT_BYTES)?;
                }
            }
        }
        if !end {
            return Err(invalid("Fin de feuille XLS manquante."));
        }
        add(&mut dense, extent.cells()?, MAX_TOTAL_CELLS)?;
    }
    Ok(())
}
// @spec TECH-RUST-108
/// Decode with the validated CFB implementation, check BIFF records, then create
/// a canonical workbook-only container. Calamine never sees untrusted FAT chains
/// or macro streams; all offsets in the unchanged workbook stream are preserved.
pub fn xls(bytes: &[u8]) -> Result<Vec<u8>> {
    if bytes.len() < 512 || !bytes.starts_with(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1") {
        return Err(invalid("En-tête XLS invalide."));
    }
    let shift = u16_at(bytes, 30)?;
    if ![9, 12].contains(&shift) {
        return Err(invalid("En-tête XLS invalide."));
    }
    let sectors = bytes.len() / (1usize << shift);
    for field in [40, 44, 64, 72] {
        if u32_at(bytes, field)? > sectors {
            return Err(invalid("En-tête XLS invalide."));
        }
    }
    let mut compound =
        cfb::CompoundFile::open(Cursor::new(bytes)).map_err(|e| invalid(&e.to_string()))?;
    let path = ["/Workbook", "/Book", "/WORKBOOK", "/BOOK"]
        .into_iter()
        .find(|name| compound.is_stream(name))
        .ok_or_else(|| invalid("Flux Workbook XLS manquant."))?;
    let stream = compound
        .open_stream(path)
        .map_err(|e| invalid(&e.to_string()))?;
    let mut workbook = Vec::new();
    stream
        .take(MAX_FILE_BYTES as u64 + 1)
        .read_to_end(&mut workbook)
        .map_err(|e| invalid(&e.to_string()))?;
    if workbook.len() > MAX_FILE_BYTES {
        return Err(invalid(LIMIT));
    }
    biff(&workbook)?;
    let mut canonical =
        cfb::CompoundFile::create_with_version(cfb::Version::V3, Cursor::new(Vec::new()))?;
    std::io::Write::write_all(&mut canonical.create_stream("/Workbook")?, &workbook)?;
    Ok(canonical.into_inner().into_inner())
}
