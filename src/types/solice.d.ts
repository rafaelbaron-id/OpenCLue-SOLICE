export type SoliceChatRole = "user" | "assistant";

export type SoliceChatMessage = {
  id: string;
  role: SoliceChatRole;
  content: string;
  createdAt: string;
  reasoning_details?: any;
};

export type SoliceBridgeMessage = {
  role: SoliceChatRole;
  content: string;
  reasoning_details?: any;
};

export type SoliceProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "deepseek"
  | "custom"
  | "ollama";

export type SoliceProvider = {
  id: SoliceProviderId;
  label: string;
  defaultModel: string;
  apiKeyUrl: string;
  requiresBaseUrl: boolean;
  isLocal?: boolean;
};

export type SoliceConfig = {
  provider: SoliceProviderId;
  hasApiKey: boolean;
  model: string;
  baseUrl: string;
  shortcut: string;
  isLocal?: boolean;
  providers: SoliceProvider[];
};

export type SoliceChatRequest = {
  messages: SoliceBridgeMessage[];
};

export type SoliceChatResponse = {
  text: string;
  reasoning_details?: any;
};

export type SoliceProviderConfigRequest = {
  provider: SoliceProviderId;
  apiKey: string;
  model: string;
  baseUrl?: string;
};

export type SoliceApi = {
  getConfig: () => Promise<SoliceConfig>;
  saveProviderConfig: (
    payload: SoliceProviderConfigRequest,
  ) => Promise<SoliceConfig>;
  saveApiKey: (apiKey: string) => Promise<SoliceConfig>;
  deleteApiKey: () => Promise<SoliceConfig>;
  sendMessage: (payload: SoliceChatRequest) => Promise<SoliceChatResponse>;
  getHistory: () => Promise<SoliceChatMessage[]>;
  saveHistory: (messages: SoliceChatMessage[]) => Promise<{ ok: true }>;
  clearHistory: () => Promise<{ ok: true }>;
};

declare global {
  interface Window {
    solice?: SoliceApi;
  }
}

export {};
