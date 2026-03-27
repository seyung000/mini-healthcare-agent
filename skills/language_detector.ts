import type { AgentLanguage } from "@/agent/types";

export function detectLanguage(message: string): AgentLanguage {
  const hasHangul = /[가-힣]/.test(message);
  return hasHangul ? "ko" : "en";
}
