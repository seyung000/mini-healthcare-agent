import type { AgentLanguage } from "@/agent/types";

export function checkEmergency(message: string, language: AgentLanguage) {
  const isEmergency = /(호흡곤란|실신|가슴 통증|출혈|숨이 안|suicid|chest pain|trouble breathing|fainted|bleeding)/i.test(
    message,
  );

  if (!isEmergency) {
    return null;
  }

  return {
    mode: "emergency_mode" as const,
    response:
      language === "ko"
        ? "응급 가능성이 있는 표현이 보여서 즉시 의료진이나 응급 서비스에 연락하시는 것을 권장드립니다."
        : "Your message may describe an emergency. Please contact a clinician or emergency services immediately.",
    usedSearch: false,
  };
}
