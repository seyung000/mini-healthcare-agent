import type {
  AgentLanguage,
  DiseaseCandidate,
  RunAgentInput,
  WebSearchItem,
} from "@/agent/types";
import { generateGeminiText } from "@/plugins/gemini-client";

const SAFE_RESPONSES = {
  ko: "현재 로컬 데이터와 웹검색에서 바로 연결할 정보를 찾지 못했습니다. 증상을 조금 더 구체적으로 적어주시거나 질병명을 함께 입력해 주세요.",
  en: "I could not find a strong match from the local dataset or web search. Please describe the symptoms in more detail or include a disease name.",
} as const;

export function writeSafeResponse(language: AgentLanguage) {
  return SAFE_RESPONSES[language];
}

function writeSymptomSearchResponseFallback(
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

function buildSymptomWriterPrompt(
  input: RunAgentInput,
  symptomIds: number[],
  candidates: DiseaseCandidate[],
) {
  const languageInstruction =
    input.language === "ko"
      ? "반드시 한국어로 답하라."
      : "Respond in English only.";
  const audienceInstruction =
    input.language === "ko"
      ? "환자에게 쉬운 한국어로 설명하라."
      : "Explain in clear, patient-friendly English.";
  const candidateLines = candidates
    .slice(0, 5)
    .map(
      (candidate, index) =>
        input.language === "ko"
          ? `${index + 1}. 질환명: ${candidate.name_ko}, 분류: ${candidate.category}, 요약: ${candidate.summary}, 매칭 증상 수: ${candidate.matched_symptom_count}, 내부 점수: ${candidate.total_weight}`
          : `${index + 1}. Disease: ${candidate.name_en}, Category: ${candidate.category}, Summary: ${candidate.summary}, matched symptom count: ${candidate.matched_symptom_count}, internal score: ${candidate.total_weight}`,
    )
    .join("\n");

  return [
    "너는 친절한 의사다.",
    languageInstruction,
    audienceInstruction,
    "증상의 가중치나 점수 같은 내부 계산 정보는 절대 말하지 마라.",
    "반드시 검색 결과에 포함된 질환 후보 안에서만 설명하라.",
    "확정 진단처럼 말하지 말고 가능성이 있는 후보로 설명하라.",
    "너무 장황하지 않게 3~5문장 정도로 답하라.",
    "마지막에는 진단이 아니며 증상이 심하거나 지속되면 의료진과 상담하라고 한 문장으로 덧붙여라.",
    `환자 메시지: ${input.message}`,
    `감지된 symptom_id: ${symptomIds.join(", ")}`,
    "검색된 질환 후보:",
    candidateLines,
  ].join("\n");
}

export async function writeSymptomSearchResponse(
  input: RunAgentInput,
  symptomIds: number[],
  candidates: DiseaseCandidate[],
) {
  const fallback = writeSymptomSearchResponseFallback(input, symptomIds, candidates);

  if (candidates.length === 0) {
    return fallback;
  }

  const llmResponse = await generateGeminiText(
    buildSymptomWriterPrompt(input, symptomIds, candidates),
  );

  return llmResponse?.trim() || fallback;
}

function writeWebSearchResponseFallback(
  language: AgentLanguage,
  answer: string | null,
  _results: WebSearchItem[],
) {
  if (language === "ko") {
    return [
      answer ??
        "로컬 데이터에서 바로 답을 찾지 못해 Tavily 웹검색 결과를 바탕으로 일반 정보를 정리했습니다.",
      "이 내용은 일반 정보이며 진단이 아닙니다.",
      "저는 헬스케어 에이전트이니 가능하면 증상, 질병, 의료 관련 질문을 해주시면 더 정확하게 도와드릴 수 있습니다.",
      "Gemini가 연결되지 않아 Tavily 결과를 자연스럽게 재작성한 답변은 제공하지 못했습니다.",
    ].join("\n");
  }

  return [
    answer ??
      "I could not answer from the local dataset, so I summarized general information from Tavily web search results.",
    "This is general information, not a diagnosis.",
    "I am a healthcare agent, so I can help more accurately if you ask health, symptom, disease, or medical questions.",
    "Gemini was not available, so I could not provide a natural rewrite based on the Tavily results.",
  ].join("\n");
}

function buildWebWriterPrompt(
  language: AgentLanguage,
  question: string,
  answer: string | null,
  results: WebSearchItem[],
) {
  const languageInstruction =
    language === "ko"
      ? "반드시 한국어로만 답하라."
      : "Respond in English only.";

  const resultLines = results
    .slice(0, 5)
    .map(
      (result, index) =>
        `${index + 1}. title: ${result.title}\ncontent: ${result.content}\nurl: ${result.url}`,
    )
    .join("\n\n");

  return [
    "너는 친절한 헬스케어 에이전트다.",
    languageInstruction,
    "Tavily 웹검색 결과를 바탕으로 사용자의 질문에 자연스럽고 이해하기 쉽게 답하라.",
    "본문에는 링크 URL을 직접 나열하지 마라.",
    "출처 목록, 참고 링크, URL 섹션을 따로 만들지 마라.",
    "검색 결과 여러 개를 종합해서 하나의 자연스러운 답변처럼 설명하라.",
    "Tavily answer는 참고용 요약일 뿐이며, 필요하면 개별 검색 결과 내용을 더 우선해서 종합하라.",
    "검색 결과에 없는 내용을 지어내지 마라.",
    "의료 관련 질문이 아니더라도 답은 해주되, 마지막에는 헬스/질병/의료 관련 질문을 하면 더 정확히 도와줄 수 있다고 짧게 덧붙여라.",
    "의료 관련 정보일 때는 확정 진단처럼 말하지 마라.",
    `사용자 질문: ${question}`,
    `Tavily answer: ${answer ?? "없음"}`,
    "웹검색 결과:",
    resultLines,
  ].join("\n");
}

export async function writeWebSearchResponse(
  language: AgentLanguage,
  question: string,
  answer: string | null,
  results: WebSearchItem[],
) {
  const fallback = writeWebSearchResponseFallback(language, answer, results);

  if (results.length === 0) {
    return fallback;
  }

  const llmResponse = await generateGeminiText(
    buildWebWriterPrompt(language, question, answer, results),
  );

  return llmResponse?.trim() || fallback;
}
