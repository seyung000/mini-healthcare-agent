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
  const emergencyResult = checkEmergency(input.message, input.language);

  if (emergencyResult) {
    return emergencyResult;
  }

  const decision = detectSymptoms(input.message);

  if (decision.shouldSearch && decision.symptomIds.length > 0) {
    const localSearch = runSymptomSearch(decision.symptomIds, 5);

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
      };
    }
  }

  const webResult = await runWebSearch(input.message, input.language);

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
    };
  }

  return {
    mode: "safe_mode",
    response: writeSafeResponse(input.language),
    usedSearch: false,
  };
}
