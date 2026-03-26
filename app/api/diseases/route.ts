import { NextResponse } from "next/server";

import { searchDiseasesByName } from "@/plugins/healthcare-db";

export const runtime = "nodejs";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "q query parameter is required" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    query,
    results: searchDiseasesByName(query),
  });
}
