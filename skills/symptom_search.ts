import { searchDiseasesBySymptoms } from "@/plugins/healthcare-db";

export function runSymptomSearch(symptomIds: number[], limit = 5) {
  const deduped = Array.from(new Set(symptomIds)).slice(0, 5);

  return {
    symptomIds: deduped,
    candidates: searchDiseasesBySymptoms(deduped, limit),
  };
}
