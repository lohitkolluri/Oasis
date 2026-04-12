import { getAppUrl, getOpenRouterApiKey } from "@/lib/config/env";
import { fetchWithRetry } from "@/lib/utils/retry";

export interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function getOpenRouterKey(): string | null {
  return getOpenRouterApiKey();
}

export async function callOpenRouterChat(payload: unknown): Promise<OpenRouterChatResponse> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // App attribution headers are optional per OpenRouter docs; never break
  // runtime if app URL is missing or misconfigured (e.g. in preview envs).
  try {
    const appUrl = getAppUrl();
    headers["HTTP-Referer"] = appUrl;
    headers["X-OpenRouter-Title"] = "Oasis - Parametric Income Protection";
  } catch {
    // Safe to ignore; attribution is nice-to-have only.
  }

  return fetchWithRetry<OpenRouterChatResponse>("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

