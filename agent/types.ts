export type AgentLanguage = "ko" | "en";

export type RunAgentInput = {
  message: string;
  language: AgentLanguage;
};

export type DiseaseCandidate = {
  id: number;
  name_ko: string;
  name_en: string;
  category: string;
  summary: string;
  matched_symptom_count: number;
  total_weight: number;
};

export type WebSearchItem = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export type SkillTraceItem = {
  id: string;
  label: string;
  status: "completed" | "skipped" | "running";
  detail?: string;
};

export type AgentResult = {
  mode: "safe_mode" | "symptom_search" | "emergency_mode" | "web_search";
  response: string;
  language?: AgentLanguage;
  usedSearch?: boolean;
  detectedSymptomIds?: number[];
  candidates?: DiseaseCandidate[];
  webResults?: WebSearchItem[];
  trace?: SkillTraceItem[];
};
