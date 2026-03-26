import type { AgentResult, RunAgentInput } from "@/agent/types";
import { checkEmergency } from "@/skills/emergency_guard";
import {
  writeSafeResponse,
  writeSymptomSearchResponse,
  writeWebSearchResponse,
} from "@/skills/response_writer";
import { detectSymptoms } from "@/skills/symptom_detector";
import { runSymptomSearch } from "@/skills/symptom_search";
import { runWebSearch } from "@/skills/web_search";

export async function runHealthcareAgent(input: RunAgentInput): Promise<AgentResult> {
  const trace: AgentResult["trace"] = [
    {
      id: "emergency_guard",
      label: "응급 표현 확인",
      status: "completed",
    },
  ];

  const emergencyResult = checkEmergency(input.message, input.language);

  if (emergencyResult) {
    return {
      ...emergencyResult,
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
      return {
        mode: "symptom_search",
        response: writeSymptomSearchResponse(
          input,
          localSearch.symptomIds,
          localSearch.candidates,
        ),
        usedSearch: true,
        detectedSymptomIds: localSearch.symptomIds,
        candidates: localSearch.candidates,
        trace: [
          ...trace,
          {
            id: "response_writer",
            label: "검색 결과 응답 생성",
            status: "completed",
          },
          {
            id: "web_search",
            label: "웹 검색",
            status: "skipped",
            detail: "로컬 데이터로 충분해 실행하지 않았습니다",
          },
        ],
      };
    }
  } else {
    trace.push({
      id: "symptom_search",
      label: "로컬 질병 후보 검색",
      status: "skipped",
      detail: "검색 가능한 증상이 없어 건너뛰었습니다",
    });
  }

  const webResult = await runWebSearch(input.message, input.language);
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
      response: writeWebSearchResponse(
        input.language,
        webResult.answer,
        webResult.results,
      ),
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
    response: writeSafeResponse(input.language),
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
