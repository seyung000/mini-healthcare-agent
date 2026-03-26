import type { AgentLanguage } from "@/agent/types";
import { searchTavily } from "@/plugins/tavily-search";

function buildWebQuery(message: string, language: AgentLanguage) {
  if (language === "ko") {
    return `헬스케어 일반 정보 검색: ${message}`;
  }

  return `healthcare general information search: ${message}`;
}

export async function runWebSearch(message: string, language: AgentLanguage) {
  return searchTavily(buildWebQuery(message, language));
}
