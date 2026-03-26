import { listSymptoms, searchDiseasesBySymptoms } from "@/lib/db";
import { searchWeb } from "@/lib/tavily";

type RunAgentInput = {
  message: string;
  language: "ko" | "en";
};

type AgentResult = {
  mode: "safe_mode" | "symptom_search" | "emergency_mode" | "web_search";
  response: string;
  usedSearch?: boolean;
  detectedSymptomIds?: number[];
  candidates?: Array<{
    id: number;
    name_ko: string;
    name_en: string;
    category: string;
    summary: string;
    matched_symptom_count: number;
    total_weight: number;
  }>;
  webResults?: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
};

const SAFE_RESPONSES = {
  ko: "일반적인 건강 정보는 도와드릴 수 있지만, 진단이나 응급 대응은 제공할 수 없습니다. 급한 증상이 있으면 의료진이나 응급 서비스에 바로 연락하세요.",
  en: "I can share general health information, but I cannot provide diagnosis or emergency care. Please contact a clinician or local emergency services for urgent issues.",
} as const;

type SearchDecision = {
  should_search: boolean;
  symptom_ids: number[];
};

function detectSymptoms(message: string): SearchDecision {
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
    should_search: matched.length > 0,
    symptom_ids: matched.slice(0, 5),
  };
}

function formatSearchResponse(
  input: RunAgentInput,
  symptomIds: number[],
  candidates: ReturnType<typeof searchDiseasesBySymptoms>,
): string {
  if (candidates.length === 0) {
    return input.language === "ko"
      ? `입력하신 증상(${symptomIds.join(", ")})에 대해 현재 더미 데이터에서 뚜렷한 후보 질환을 찾지 못했습니다.`
      : `I could not find a clear disease candidate for symptom IDs ${symptomIds.join(", ")} in the current demo dataset.`;
  }

  if (input.language === "ko") {
    const lines = candidates.slice(0, 3).map((candidate, index) => {
      return `${index + 1}. ${candidate.name_ko} (${candidate.category}) - 일치 증상 ${candidate.matched_symptom_count}개, 점수 ${candidate.total_weight}`;
    });

    return [
      "입력하신 내용을 기준으로 더미 데이터에서 관련 질환 후보를 찾았습니다.",
      ...lines,
      "이 결과는 데모용 후보 검색이며 진단이 아닙니다. 증상이 심하거나 지속되면 의료진과 상담해 주세요.",
    ].join("\n");
  }

  const lines = candidates.slice(0, 3).map((candidate, index) => {
    return `${index + 1}. ${candidate.name_en} (${candidate.category}) - ${candidate.matched_symptom_count} matched symptoms, score ${candidate.total_weight}`;
  });

  return [
    "I found possible disease candidates from the demo dataset.",
    ...lines,
    "This is only a demo ranking, not a diagnosis. Please contact a clinician for medical advice.",
  ].join("\n");
}

function buildWebQuery(message: string, language: "ko" | "en") {
  if (language === "ko") {
    return `헬스케어 일반 정보 검색: ${message}`;
  }

  return `healthcare general information search: ${message}`;
}

function formatWebResponse(
  input: RunAgentInput,
  answer: string | null,
  results: Array<{ title: string; url: string; content: string; score?: number }>,
) {
  if (input.language === "ko") {
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

export async function runAgent(input: RunAgentInput): Promise<AgentResult> {
  const isEmergency = /(호흡곤란|실신|가슴 통증|출혈|숨이 안|suicid|chest pain|trouble breathing|fainted|bleeding)/i.test(
    input.message,
  );

  if (isEmergency) {
    return {
      mode: "emergency_mode",
      response:
        input.language === "ko"
          ? "응급 가능성이 있는 표현이 보여서 즉시 의료진이나 응급 서비스에 연락하시는 것을 권장드립니다."
          : "Your message may describe an emergency. Please contact a clinician or emergency services immediately.",
      usedSearch: false,
    };
  }

  const decision = detectSymptoms(input.message);

  if (decision.should_search && decision.symptom_ids.length > 0) {
    const symptomIds = Array.from(new Set(decision.symptom_ids)).slice(0, 5);
    const candidates = searchDiseasesBySymptoms(symptomIds, 5);

    if (candidates.length > 0) {
      return {
        mode: "symptom_search",
        response: formatSearchResponse(input, symptomIds, candidates),
        usedSearch: true,
        detectedSymptomIds: symptomIds,
        candidates,
      };
    }
  }

  const webResult = await searchWeb(buildWebQuery(input.message, input.language));

  if (webResult) {
    return {
      mode: "web_search",
      response: formatWebResponse(input, webResult.answer, webResult.results),
      usedSearch: true,
      webResults: webResult.results,
    };
  }

  return {
    mode: "safe_mode",
    response: SAFE_RESPONSES[input.language],
    usedSearch: false,
  };
}
