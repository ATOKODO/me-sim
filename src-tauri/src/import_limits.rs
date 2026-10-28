//! Resource checks on a bounded immutable snapshot, before range allocation.
use crate::domain::{invalid, Result};
use std::{io::Read, path::Path};
mod excel_binary;
mod excel_xml;
mod tabular;
pub use excel_binary::xls;
pub use excel_xml::xlsx;
pub use tabular::{csv, json};

pub const MAX_FILE_BYTES: usize = 25 * 1024 * 1024;
pub const MAX_ROWS: usize = 50_001;
pub const MAX_COLUMNS: usize = 256;
pub const MAX_SHEETS: usize = 16;
pub const MAX_SHEET_CELLS: usize = 500_010;
pub const MAX_TOTAL_CELLS: usize = 1_000_020;
const MAX_TEXT_BYTES: usize = 32 * 1024 * 1024;
const MAX_CELL_BYTES: usize = 256 * 1024;
const MAX_ENTRY_BYTES: usize = 32 * 1024 * 1024;
const MAX_EXPANDED_BYTES: usize = 64 * 1024 * 1024;
const MAX_ENTRIES: usize = 512;
const MAX_EVENTS: usize = 1_000_000;
const LIMIT: &str = "Import trop volumineux : limite de ressources dépassée. Divisez le fichier en plusieurs imports.";

// @spec TECH-RUST-107
pub fn read_file(path: &Path) -> Result<Vec<u8>> {
    let file = std::fs::File::open(path)?;
    if file.metadata()?.len() > MAX_FILE_BYTES as u64 {
        return Err(invalid(LIMIT));
    }
    // The file may grow after metadata: bound the actual read as well.
    let mut bytes = Vec::new();
    file.take(MAX_FILE_BYTES as u64 + 1)
        .read_to_end(&mut bytes)?;
    if bytes.len() > MAX_FILE_BYTES {
        return Err(invalid(LIMIT));
    }
    Ok(bytes)
}
// @spec TECH-RUST-107
fn add(total: &mut usize, amount: usize, limit: usize) -> Result<()> {
    *total = total.checked_add(amount).ok_or_else(|| invalid(LIMIT))?;
    if *total > limit {
        return Err(invalid(LIMIT));
    }
    Ok(())
}
// @spec TECH-RUST-107
fn rect(rows: usize, columns: usize) -> Result<usize> {
    let cells = rows.checked_mul(columns).ok_or_else(|| invalid(LIMIT))?;
    if rows > MAX_ROWS || columns > MAX_COLUMNS || cells > MAX_SHEET_CELLS {
        return Err(invalid(LIMIT));
    }
    Ok(cells)
}
#[derive(Default)]
struct Extent {
    first: Option<(usize, usize)>,
    last: (usize, usize),
}
impl Extent {
    // @spec TECH-RUST-107
    fn include(&mut self, row: usize, col: usize) -> Result<()> {
        self.first = Some(match self.first {
            Some((r, c)) => (r.min(row), c.min(col)),
            None => (row, col),
        });
        self.last = (self.last.0.max(row), self.last.1.max(col));
        self.cells().map(|_| ())
    }
    // @spec TECH-RUST-107
    fn cells(&self) -> Result<usize> {
        match self.first {
            Some((row, col)) => rect(self.last.0 - row + 1, self.last.1 - col + 1),
            None => Ok(0),
        }
    }
}
// @spec TECH-RUST-107
fn u16_at(bytes: &[u8], offset: usize) -> Result<usize> {
    let b = bytes
        .get(offset..offset + 2)
        .ok_or_else(|| invalid("Fichier tronqué."))?;
    Ok(u16::from_le_bytes([b[0], b[1]]) as usize)
}
// @spec TECH-RUST-107
fn u32_at(bytes: &[u8], offset: usize) -> Result<usize> {
    let b = bytes
        .get(offset..offset + 4)
        .ok_or_else(|| invalid("Fichier tronqué."))?;
    Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]) as usize)
}

#[cfg(test)]
mod tests;
