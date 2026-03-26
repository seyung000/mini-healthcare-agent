import { NextResponse } from "next/server";

import { runHealthcareAgent } from "@/agent/healthcare-agent";
import { saveMessage } from "@/plugins/healthcare-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  message?: string;
  language?: "ko" | "en";
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatBody;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

  saveMessage("user", message, "chat");

  const result = await runHealthcareAgent({
    message,
    language: body.language ?? "ko",
  });

  saveMessage("assistant", result.response, result.mode);

  return NextResponse.json(result);
}
