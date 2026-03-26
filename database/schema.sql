PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS diseases (
    id INTEGER PRIMARY KEY,
    name_ko TEXT NOT NULL,
    name_en TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    severity_level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY,
    name_ko TEXT NOT NULL,
    name_en TEXT NOT NULL,
    body_part TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disease_symptoms (
    id INTEGER PRIMARY KEY,
    disease_id INTEGER NOT NULL,
    symptom_id INTEGER NOT NULL,
    weight REAL NOT NULL,
    FOREIGN KEY (disease_id) REFERENCES diseases (id),
    FOREIGN KEY (symptom_id) REFERENCES symptoms (id),
    UNIQUE (disease_id, symptom_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diseases_name_ko ON diseases (name_ko);
CREATE INDEX IF NOT EXISTS idx_symptoms_name_ko ON symptoms (name_ko);
CREATE INDEX IF NOT EXISTS idx_disease_symptoms_disease_id ON disease_symptoms (disease_id);
CREATE INDEX IF NOT EXISTS idx_disease_symptoms_symptom_id ON disease_symptoms (symptom_id);
