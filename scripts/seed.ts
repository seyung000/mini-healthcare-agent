import fs from "node:fs";
import path from "node:path";

import { parseCsv } from "../lib/csv";
import {
  insertDiseases,
  insertDiseaseSymptoms,
  insertSymptoms,
  resetHealthcareTables,
} from "../plugins/healthcare-db";

const projectRoot = process.cwd();

function readCsv(fileName: string) {
  return fs.readFileSync(path.join(projectRoot, "data", fileName), "utf8");
}

function rowsToObjects<T>(text: string, mapRow: (row: string[]) => T): T[] {
  const [header, ...rows] = parseCsv(text);

  if (!header) {
    throw new Error("CSV header is missing");
  }

  return rows.filter((row) => row.length > 1).map(mapRow);
}

function main() {
  const diseases = rowsToObjects(readCsv("diseases.csv"), (row) => ({
    id: Number(row[0]),
    name_ko: row[1],
    name_en: row[2],
    summary: row[3],
    category: row[4],
    severity_level: row[5],
  }));

  const symptoms = rowsToObjects(readCsv("symptoms.csv"), (row) => ({
    id: Number(row[0]),
    name_ko: row[1],
    name_en: row[2],
    body_part: row[3],
    description: row[4],
  }));

  const diseaseSymptoms = rowsToObjects(readCsv("disease_symptoms.csv"), (row) => ({
    id: Number(row[0]),
    disease_id: Number(row[1]),
    symptom_id: Number(row[2]),
    weight: Number(row[3]),
  }));

  resetHealthcareTables();
  insertDiseases(diseases);
  insertSymptoms(symptoms);
  insertDiseaseSymptoms(diseaseSymptoms);

  console.log(
    `Seed complete: ${diseases.length} diseases, ${symptoms.length} symptoms, ${diseaseSymptoms.length} links`,
  );
}

main();
