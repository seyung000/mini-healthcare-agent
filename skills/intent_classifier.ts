import type { AgentLanguage } from "@/agent/types";
import { generateGeminiJson } from "@/plugins/gemini-client";

type IntentClassification = {
  healthcare_related: boolean;
  confidence: "low" | "medium" | "high";
  reason: string;
};

function buildIntentPrompt(message: string, language: AgentLanguage) {
  return [
    "You are classifying whether a user message is related to healthcare.",
    "Return strict JSON only.",
    'JSON schema: {"healthcare_related": boolean, "confidence": "low" | "medium" | "high", "reason": string}',
    "A healthcare-related message includes disease, symptoms, medicine, hospitals, diagnosis, treatment, medical guidance, or wellness questions.",
    "If the user asks about a clearly unrelated topic such as coding, travel, finance, entertainment, school homework, or general trivia, set healthcare_related to false.",
    `User language: ${language}`,
    `User message: ${message}`,
  ].join("\n");
}

export async function classifyHealthcareIntent(
  message: string,
  language: AgentLanguage,
) {
  return generateGeminiJson<IntentClassification>(buildIntentPrompt(message, language));
}
