import { listSymptoms } from "@/plugins/healthcare-db";

export type SymptomDecision = {
  shouldSearch: boolean;
  symptomIds: number[];
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function stemKoreanSymptom(value: string) {
  return value.replace(/(증|통|감|움|림|함)$/u, "");
}

export function detectSymptoms(message: string): SymptomDecision {
  const normalizedMessage = normalizeText(message);
  const matched = listSymptoms()
    .filter((symptom) => {
      const koName = normalizeText(symptom.name_ko);
      const enName = normalizeText(symptom.name_en);
      const koStem = stemKoreanSymptom(koName);

      return (
        normalizedMessage.includes(koName) ||
        normalizedMessage.includes(enName) ||
        (koStem.length >= 2 && normalizedMessage.includes(koStem))
      );
    })
    .map((symptom) => symptom.id);

  return {
    shouldSearch: matched.length > 0,
    symptomIds: matched.slice(0, 5),
  };
}
