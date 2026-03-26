const TAVILY_API_URL = "https://api.tavily.com/search";

type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilySearchResult[];
};

export async function searchWeb(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      topic: "general",
      search_depth: "basic",
      max_results: 5,
      include_answer: "basic",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as TavilyResponse;

  return {
    answer: payload.answer ?? null,
    results: payload.results ?? [],
  };
}
