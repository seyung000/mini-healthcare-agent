import { NextResponse } from "next/server";

import { searchDiseasesBySymptoms } from "@/plugins/healthcare-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchBody = {
  symptomIds?: number[];
  limit?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SearchBody;
  const symptomIds = Array.from(
    new Set((body.symptomIds ?? []).filter((value) => Number.isInteger(value))),
  );

  if (symptomIds.length === 0) {
    return NextResponse.json(
      { error: "symptomIds must contain at least one integer" },
      { status: 400 },
    );
  }

  const results = searchDiseasesBySymptoms(symptomIds, body.limit ?? 5);

  return NextResponse.json({
    symptomIds,
    count: results.length,
    results,
  });
}
