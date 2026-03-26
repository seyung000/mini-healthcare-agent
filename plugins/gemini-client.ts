const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

function extractText(response: GeminiResponse): string | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();
  return text.length > 0 ? text : null;
}

async function generateContent(
  prompt: string,
  {
    model = DEFAULT_MODEL,
    responseMimeType,
    temperature = 0.2,
  }: {
    model?: string;
    responseMimeType?: "application/json" | "text/plain";
    temperature?: number;
  } = {},
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GeminiResponse;
}

export async function generateGeminiText(prompt: string) {
  const response = await generateContent(prompt, {
    responseMimeType: "text/plain",
    temperature: 0.4,
  });

  if (!response) {
    return null;
  }

  return extractText(response);
}

export async function generateGeminiJson<T>(prompt: string) {
  const response = await generateContent(prompt, {
    responseMimeType: "application/json",
    temperature: 0.1,
  });

  if (!response) {
    return null;
  }

  const text = extractText(response);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
