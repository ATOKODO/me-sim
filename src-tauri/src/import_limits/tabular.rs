use super::{
    add, invalid, rect, Result, LIMIT, MAX_CELL_BYTES, MAX_COLUMNS, MAX_ROWS, MAX_SHEET_CELLS,
    MAX_TEXT_BYTES, MAX_TOTAL_CELLS,
};
use serde::de::{DeserializeSeed, MapAccess, SeqAccess, Visitor};
use std::fmt;

pub fn csv(bytes: &[u8], delimiter: u8) -> Result<()> {
    let mut parser = csv_core::ReaderBuilder::new().delimiter(delimiter).build();
    let record_limit = 1024 * 1024;
    let mut output = vec![0; record_limit + 1];
    let mut ends = [0; MAX_COLUMNS + 1];
    let (mut pos, mut written, mut fields, mut rows, mut text, mut width) = (0, 0, 0, 0, 0, 0);
    loop {
        let (result, consumed, count, end_count) =
            parser.read_record(&bytes[pos..], &mut output[written..], &mut ends[fields..]);
        pos += consumed;
        written += count;
        fields += end_count;
        match result {
            csv_core::ReadRecordResult::OutputFull | csv_core::ReadRecordResult::OutputEndsFull => {
                return Err(invalid(LIMIT))
            }
            csv_core::ReadRecordResult::Record => {
                if fields > MAX_COLUMNS || written > record_limit {
                    return Err(invalid(LIMIT));
                }
                let mut start = 0;
                for &end in &ends[..fields] {
                    if end - start > MAX_CELL_BYTES {
                        return Err(invalid(LIMIT));
                    }
                    start = end;
                }
                width = width.max(fields);
                rows += 1;
                rect(rows, width)?;
                add(&mut text, written, MAX_TEXT_BYTES)?;
                written = 0;
                fields = 0;
            }
            csv_core::ReadRecordResult::End => return Ok(()),
            csv_core::ReadRecordResult::InputEmpty => {}
        }
    }
}

#[derive(Default)]
struct JsonBudget {
    rows: usize,
    width: usize,
    cells: usize,
    text: usize,
}
struct JsonRows<'a>(&'a mut JsonBudget);
struct JsonRow<'a>(&'a mut JsonBudget);
struct JsonCell<'a>(&'a mut JsonBudget);
impl<'de> DeserializeSeed<'de> for JsonRows<'_> {
    type Value = ();
    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> std::result::Result<(), D::Error> {
        d.deserialize_seq(self)
    }
}
impl<'de> Visitor<'de> for JsonRows<'_> {
    type Value = ();
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("un tableau de mesures")
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> std::result::Result<(), A::Error> {
        while seq.next_element_seed(JsonRow(self.0))?.is_some() {
            self.0.rows += 1;
            if self.0.rows >= MAX_ROWS || self.0.rows * self.0.width > MAX_SHEET_CELLS {
                return Err(serde::de::Error::custom(LIMIT));
            }
        }
        Ok(())
    }
}
impl<'de> DeserializeSeed<'de> for JsonRow<'_> {
    type Value = ();
    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> std::result::Result<(), D::Error> {
        d.deserialize_map(self)
    }
}
impl<'de> Visitor<'de> for JsonRow<'_> {
    type Value = ();
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("un objet de valeurs scalaires")
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> std::result::Result<(), A::Error> {
        let mut columns = 0;
        while let Some(key) = map.next_key::<String>()? {
            columns += 1;
            self.0.cells += 1;
            if columns > MAX_COLUMNS || self.0.cells > MAX_TOTAL_CELLS {
                return Err(serde::de::Error::custom(LIMIT));
            }
            if key.len() > MAX_CELL_BYTES {
                return Err(serde::de::Error::custom(LIMIT));
            }
            add(&mut self.0.text, key.len(), MAX_TEXT_BYTES)
                .map_err(|e| serde::de::Error::custom(e.message))?;
            map.next_value_seed(JsonCell(self.0))?;
        }
        self.0.width = self.0.width.max(columns);
        Ok(())
    }
}
impl<'de> DeserializeSeed<'de> for JsonCell<'_> {
    type Value = ();
    fn deserialize<D: serde::Deserializer<'de>>(self, d: D) -> std::result::Result<(), D::Error> {
        d.deserialize_any(self)
    }
}
impl<'de> Visitor<'de> for JsonCell<'_> {
    type Value = ();
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("une chaîne, un nombre, un booléen ou null")
    }
    fn visit_str<E: serde::de::Error>(self, s: &str) -> std::result::Result<(), E> {
        if s.len() > MAX_CELL_BYTES {
            return Err(E::custom(LIMIT));
        }
        add(&mut self.0.text, s.len(), MAX_TEXT_BYTES).map_err(|e| E::custom(e.message))
    }
    fn visit_string<E: serde::de::Error>(self, s: String) -> std::result::Result<(), E> {
        self.visit_str(&s)
    }
    fn visit_i64<E: serde::de::Error>(self, _: i64) -> std::result::Result<(), E> {
        Ok(())
    }
    fn visit_u64<E: serde::de::Error>(self, _: u64) -> std::result::Result<(), E> {
        Ok(())
    }
    fn visit_f64<E: serde::de::Error>(self, _: f64) -> std::result::Result<(), E> {
        Ok(())
    }
    fn visit_bool<E: serde::de::Error>(self, _: bool) -> std::result::Result<(), E> {
        Ok(())
    }
    fn visit_unit<E: serde::de::Error>(self) -> std::result::Result<(), E> {
        Ok(())
    }
}
pub fn json(bytes: &[u8]) -> Result<()> {
    if bytes.iter().find(|b| !b.is_ascii_whitespace()) == Some(&b'{') {
        return Err(invalid("Pour une sauvegarde complète, utilisez Restaurer. L’import de mesures attend un tableau JSON."));
    }
    let mut reader = serde_json::Deserializer::from_slice(bytes);
    JsonRows(&mut JsonBudget::default())
        .deserialize(&mut reader)
        .map_err(|e| invalid(&e.to_string()))?;
    reader.end().map_err(|e| invalid(&e.to_string()))
}
