import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

const projectRoot = process.cwd();
const schemaPath = path.join(projectRoot, "database", "schema.sql");
const localDbPath = path.join(projectRoot, "data", "app.db");
const vercelDbPath = path.join(os.tmpdir(), "mini-healthcare-agent.db");
const dbPath = process.env.VERCEL ? vercelDbPath : localDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(schemaPath, "utf8"));

type DiseaseRow = {
  id: number;
  name_ko: string;
  name_en: string;
  summary: string;
  category: string;
  severity_level: string;
};

type SymptomRow = {
  id: number;
  name_ko: string;
  name_en: string;
  body_part: string;
  description: string;
};

type DiseaseSymptomRow = {
  id: number;
  disease_id: number;
  symptom_id: number;
  weight: number;
};

export type MessageRow = {
  id: number;
  role: string;
  content: string;
  source: string;
  created_at: string;
};

export function saveMessage(role: string, content: string, source: string) {
  db.prepare(
    `
      INSERT INTO messages (role, content, source)
      VALUES (?, ?, ?)
    `,
  ).run(role, content, source);
}

export function getRecentMessages(limit = 10): MessageRow[] {
  return db
    .prepare(
      `
        SELECT id, role, content, source, created_at
        FROM messages
        ORDER BY id DESC
        LIMIT ?
      `,
    )
    .all(limit) as MessageRow[];
}

export function resetHealthcareTables() {
  db.exec(`
    DELETE FROM disease_symptoms;
    DELETE FROM symptoms;
    DELETE FROM diseases;
  `);
}

export function insertDiseases(rows: DiseaseRow[]) {
  const statement = db.prepare(`
    INSERT INTO diseases (id, name_ko, name_en, summary, category, severity_level)
    VALUES (@id, @name_ko, @name_en, @summary, @category, @severity_level)
  `);

  const transaction = db.transaction((items: DiseaseRow[]) => {
    for (const item of items) {
      statement.run(item);
    }
  });

  transaction(rows);
}

export function insertSymptoms(rows: SymptomRow[]) {
  const statement = db.prepare(`
    INSERT INTO symptoms (id, name_ko, name_en, body_part, description)
    VALUES (@id, @name_ko, @name_en, @body_part, @description)
  `);

  const transaction = db.transaction((items: SymptomRow[]) => {
    for (const item of items) {
      statement.run(item);
    }
  });

  transaction(rows);
}

export function insertDiseaseSymptoms(rows: DiseaseSymptomRow[]) {
  const statement = db.prepare(`
    INSERT INTO disease_symptoms (id, disease_id, symptom_id, weight)
    VALUES (@id, @disease_id, @symptom_id, @weight)
  `);

  const transaction = db.transaction((items: DiseaseSymptomRow[]) => {
    for (const item of items) {
      statement.run(item);
    }
  });

  transaction(rows);
}

export function searchDiseasesByName(query: string, limit = 10): DiseaseRow[] {
  const keyword = `%${query.trim()}%`;

  return db
    .prepare(
      `
        SELECT id, name_ko, name_en, summary, category, severity_level
        FROM diseases
        WHERE name_ko LIKE ? OR name_en LIKE ?
        ORDER BY name_ko ASC
        LIMIT ?
      `,
    )
    .all(keyword, keyword, limit) as DiseaseRow[];
}

export function listSymptoms(limit = 100): SymptomRow[] {
  return db
    .prepare(
      `
        SELECT id, name_ko, name_en, body_part, description
        FROM symptoms
        ORDER BY id ASC
        LIMIT ?
      `,
    )
    .all(limit) as SymptomRow[];
}

export type DiseaseSearchResult = DiseaseRow & {
  matched_symptom_count: number;
  total_weight: number;
};

export function searchDiseasesBySymptoms(
  symptomIds: number[],
  limit = 5,
): DiseaseSearchResult[] {
  const placeholders = symptomIds.map(() => "?").join(", ");

  return db
    .prepare(
      `
        SELECT
          d.id,
          d.name_ko,
          d.name_en,
          d.summary,
          d.category,
          d.severity_level,
          COUNT(ds.symptom_id) AS matched_symptom_count,
          ROUND(SUM(ds.weight), 3) AS total_weight
        FROM disease_symptoms ds
        INNER JOIN diseases d ON d.id = ds.disease_id
        WHERE ds.symptom_id IN (${placeholders})
        GROUP BY
          d.id,
          d.name_ko,
          d.name_en,
          d.summary,
          d.category,
          d.severity_level
        ORDER BY matched_symptom_count DESC, total_weight DESC, d.id ASC
        LIMIT ?
      `,
    )
    .all(...symptomIds, limit) as DiseaseSearchResult[];
}
