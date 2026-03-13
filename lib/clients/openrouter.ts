import { getAppUrl, getOpenRouterApiKey } from "@/lib/config/env";
import { fetchWithRetry } from "@/lib/utils/retry";

export interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function getOpenRouterKey(): string | null {
  return getOpenRouterApiKey();
}

export async function callOpenRouterChat(payload: unknown): Promise<OpenRouterChatResponse> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return fetchWithRetry<OpenRouterChatResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // Optional attribution headers per OpenRouter quickstart docs:
      // https://openrouter.ai/docs/quickstart#using-the-openrouter-api-directly
      "HTTP-Referer": getAppUrl(),
      "X-OpenRouter-Title": "Oasis – Parametric Income Protection",
    },
    body: JSON.stringify(payload),
  });
}

