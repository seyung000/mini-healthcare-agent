import type { AgentResult, RunAgentInput } from "@/agent/types";
import { checkEmergency } from "@/skills/emergency_guard";
import { classifyHealthcareIntent } from "@/skills/intent_classifier";
import { detectLanguage } from "@/skills/language_detector";
import {
  writeSafeResponse,
  writeSymptomSearchResponse,
  writeWebSearchResponse,
} from "@/skills/response_writer";
import { detectSymptoms } from "@/skills/symptom_detector";
import { runSymptomSearch } from "@/skills/symptom_search";
import { runWebSearch } from "@/skills/web_search";

export async function runHealthcareAgent(input: RunAgentInput): Promise<AgentResult> {
  const language = detectLanguage(input.message);
  const trace: AgentResult["trace"] = [
    {
      id: "language_detector",
      label: "질문 언어 감지",
      status: "completed",
      detail: language === "ko" ? "한국어로 감지했습니다" : "English detected",
    },
    {
      id: "emergency_guard",
      label: "응급 표현 확인",
      status: "completed",
    },
  ];

  const agentInput: RunAgentInput = {
    ...input,
    language,
  };

  const emergencyResult = checkEmergency(input.message, language);

  if (emergencyResult) {
    return {
      ...emergencyResult,
      language,
      trace: [
        ...trace,
        {
          id: "response_writer",
          label: "긴급 안내 응답 생성",
          status: "completed",
        },
      ],
    };
  }

  const intent = await classifyHealthcareIntent(input.message, language);
  trace.push({
    id: "intent_classifier",
    label: "의료 도메인 의도 분류",
    status: intent ? "completed" : "skipped",
    detail: intent
      ? intent.healthcare_related
        ? `의료 관련 질문으로 분류됨 (${intent.confidence})`
        : `비의료 질문으로 분류됨 (${intent.confidence})`
      : "Gemini 분류에 실패해 기본 흐름으로 진행했습니다",
  });

  if (intent && !intent.healthcare_related) {
    const webResult = await runWebSearch(input.message, language);
    trace.push({
      id: "web_search",
      label: "Tavily 웹 검색",
      status: webResult ? "completed" : "skipped",
      detail: webResult
        ? `${webResult.results.length}개 웹 결과를 확인했습니다`
        : "웹 검색 결과를 가져오지 못했습니다",
    });

    if (webResult) {
      return {
        mode: "web_search",
        response: await writeWebSearchResponse(
          language,
          input.message,
          webResult.answer,
          webResult.results,
        ),
        language,
        usedSearch: true,
        webResults: webResult.results,
        trace: [
          ...trace,
          {
            id: "response_writer",
            label: "웹 검색 응답 생성",
            status: "completed",
          },
        ],
      };
    }
  }

  const decision = detectSymptoms(input.message);
  trace.push({
    id: "symptom_detector",
    label: "증상 감지",
    status: "completed",
    detail: decision.shouldSearch
      ? `감지된 symptom_id: ${decision.symptomIds.join(", ")}`
      : "감지된 증상이 없습니다",
  });

  if (decision.shouldSearch && decision.symptomIds.length > 0) {
    const localSearch = runSymptomSearch(decision.symptomIds, 5);
    trace.push({
      id: "symptom_search",
      label: "로컬 질병 후보 검색",
      status: "completed",
      detail:
        localSearch.candidates.length > 0
          ? `${localSearch.candidates.length}개 후보를 찾았습니다`
          : "로컬 후보를 찾지 못했습니다",
    });

    if (localSearch.candidates.length > 0) {
      const response = await writeSymptomSearchResponse(
        agentInput,
        localSearch.symptomIds,
        localSearch.candidates,
      );

      return {
        mode: "symptom_search",
        response,
        language,
        usedSearch: true,
        detectedSymptomIds: localSearch.symptomIds,
        candidates: localSearch.candidates,
        trace: [
          ...trace,
          {
            id: "response_writer",
            label: "Gemini 또는 규칙 기반 응답 생성",
            status: "completed",
          },
        ],
      };
    }
  }

  const webResult = await runWebSearch(input.message, language);
  trace.push({
    id: "web_search",
    label: "Tavily 웹 검색",
    status: webResult ? "completed" : "skipped",
    detail: webResult
      ? `${webResult.results.length}개 웹 결과를 확인했습니다`
      : "웹 검색 결과를 가져오지 못했습니다",
  });

  if (webResult) {
    return {
      mode: "web_search",
      response: await writeWebSearchResponse(
        language,
        input.message,
        webResult.answer,
        webResult.results,
      ),
      language,
      usedSearch: true,
      webResults: webResult.results,
      trace: [
        ...trace,
        {
          id: "response_writer",
          label: "웹 검색 응답 생성",
          status: "completed",
        },
      ],
    };
  }

  return {
    mode: "safe_mode",
    response: writeSafeResponse(language),
    language,
    usedSearch: false,
    trace: [
      ...trace,
      {
        id: "response_writer",
        label: "기본 안내 응답 생성",
        status: "completed",
      },
    ],
  };
}
