import { NextResponse } from "next/server";

import { listSymptoms } from "@/lib/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    symptoms: listSymptoms(),
  });
}
