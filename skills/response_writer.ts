import type {
  AgentLanguage,
  DiseaseCandidate,
  RunAgentInput,
  WebSearchItem,
} from "@/agent/types";

const SAFE_RESPONSES = {
  ko: "현재 로컬 데이터와 웹검색에서 바로 연결할 정보를 찾지 못했습니다. 증상을 조금 더 구체적으로 적어주시거나 질병명을 함께 입력해 주세요.",
  en: "I could not find a strong match from the local dataset or web search. Please describe the symptoms in more detail or include a disease name.",
} as const;

export function writeSafeResponse(language: AgentLanguage) {
  return SAFE_RESPONSES[language];
}

export function writeSymptomSearchResponse(
  input: RunAgentInput,
  symptomIds: number[],
  candidates: DiseaseCandidate[],
) {
  if (candidates.length === 0) {
    return input.language === "ko"
      ? `입력하신 증상(${symptomIds.join(", ")})에 대해 현재 더미 데이터에서 뚜렷한 후보 질환을 찾지 못했습니다.`
      : `I could not find a clear disease candidate for symptom IDs ${symptomIds.join(", ")} in the current demo dataset.`;
  }

  if (input.language === "ko") {
    const topCandidates = candidates
      .slice(0, 3)
      .map((candidate) => `${candidate.name_ko}(${candidate.category})`)
      .join(", ");

    return [
      `입력하신 내용을 보면 ${topCandidates} 같은 질환이 후보로 보입니다.`,
      `현재 더미 데이터 기준으로 겹치는 증상은 ${symptomIds.length}개가 감지되었습니다.`,
      "이 결과는 참고용 후보 검색이며 실제 진단은 아닙니다. 증상이 심하거나 지속되면 의료진과 상담해 주세요.",
    ].join(" ");
  }

  const topCandidates = candidates
    .slice(0, 3)
    .map((candidate) => `${candidate.name_en} (${candidate.category})`)
    .join(", ");

  return [
    `Based on the detected symptoms, likely demo candidates include ${topCandidates}.`,
    `The current dataset matched ${symptomIds.length} symptom signals.`,
    "This is only a demo ranking and not a diagnosis. Please contact a clinician for medical advice.",
  ].join(" ");
}

export function writeWebSearchResponse(
  language: AgentLanguage,
  answer: string | null,
  results: WebSearchItem[],
) {
  if (language === "ko") {
    const sourceLines = results
      .slice(0, 3)
      .map((result, index) => `${index + 1}. ${result.title} - ${result.url}`);

    return [
      answer ?? "로컬 데이터에서 바로 답을 찾지 못해 웹 검색 결과를 바탕으로 일반 정보를 정리했습니다.",
      ...(sourceLines.length > 0 ? ["참고 출처:", ...sourceLines] : []),
      "이 내용은 일반 정보이며 진단이 아닙니다.",
    ].join("\n");
  }

  const sourceLines = results
    .slice(0, 3)
    .map((result, index) => `${index + 1}. ${result.title} - ${result.url}`);

  return [
    answer ?? "I could not answer from the local dataset, so I used web search for general information.",
    ...(sourceLines.length > 0 ? ["Sources:", ...sourceLines] : []),
    "This is general information, not a diagnosis.",
  ].join("\n");
}
