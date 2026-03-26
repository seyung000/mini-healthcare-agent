import { listSymptoms } from "@/plugins/healthcare-db";

export type SymptomDecision = {
  shouldSearch: boolean;
  symptomIds: number[];
};

export function detectSymptoms(message: string): SymptomDecision {
  const lowered = message.toLowerCase();
  const matched = listSymptoms()
    .filter((symptom) => {
      return (
        lowered.includes(symptom.name_ko.toLowerCase()) ||
        lowered.includes(symptom.name_en.toLowerCase())
      );
    })
    .map((symptom) => symptom.id);

  return {
    shouldSearch: matched.length > 0,
    symptomIds: matched.slice(0, 5),
  };
}
