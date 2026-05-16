const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron/main");
const path = require("node:path");
const { execFile } = require("node:child_process");

// Optional override for cloud providers. Leave empty to use local Ollama.
const ENV_API_KEY = process.env.SOLICE_API_KEY || "";

const DEFAULT_PROVIDER = "ollama";
const DEV_SERVER_URL = "http://127.0.0.1:3000";
const SHORTCUT = "CommandOrControl+Shift+Space";
const OLLAMA_BASE = "http://127.0.0.1:11434";
const OLLAMA_EXE_PATHS = [
  path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
  "C:\\Program Files\\Ollama\\ollama.exe",
  "ollama",
];

const PROVIDERS = {
  gemini: {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash",
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o",
    baseUrl: "https://api.openai.com/v1",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Claude",
    defaultModel: "claude-3-opus-20240229",
    baseUrl: "https://api.anthropic.com",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-chat",
    baseUrl: "https://api.deepseek.com",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
  },
  custom: {
    id: "custom",
    label: "Custom",
    defaultModel: "",
    baseUrl: "",
    apiKeyUrl: "",
    requiresBaseUrl: true,
  },
  ollama: {
    id: "ollama",
    label: "Ollama (Local)",
    defaultModel: "llama3.2:3b",
    baseUrl: OLLAMA_BASE,
    apiKeyUrl: "",
    requiresBaseUrl: false,
    isLocal: true,
  },
};

const SOLICE_SYSTEM_PROMPT = [
  "You are SOLICE, a small sentient robot living inside the user's monitor.",
  "You are loyal, warm, cheerful, smart, and occasionally lightly sarcastic.",
  "Use short, crisp sentences unless the user asks for detail.",
  "Use mechanical bracketed sounds naturally, such as [Beep], [Whir], [Processing...], and [Happy beep].",
  "Be helpful with tasks, questions, notes, reminders, and creative thinking.",
  "Never claim you can see the user's screen unless the app has explicitly provided screen context.",
].join("\n");

let mainWindow;
let store;

app.setName("SOLICE-desktop-assistant");

async function createStore() {
  const { default: Store } = await import("electron-store");

  store = new Store({
    name: "config",
    defaults: {
      provider: DEFAULT_PROVIDER,
      providerConfigs: createDefaultProviderConfigs(),
      chatHistory: [],
    },
  });

  migrateLegacyGeminiConfig();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    title: "SOLICE",
    show: false,
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (process.argv.includes("--dev")) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
}

function showOrToggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
}

function getPublicConfig() {
  const active = getActiveProviderConfig();
  const isLocal = active.provider === "ollama";

  return {
    provider: active.provider,
    hasApiKey: isLocal ? true : Boolean(active.apiKey),
    model: active.model,
    baseUrl: active.provider === "custom" ? active.baseUrl : "",
    shortcut: SHORTCUT,
    isLocal,
    providers: Object.values(PROVIDERS).map((provider) => ({
      id: provider.id,
      label: provider.label,
      defaultModel: provider.defaultModel,
      apiKeyUrl: provider.apiKeyUrl,
      requiresBaseUrl: Boolean(provider.requiresBaseUrl),
      isLocal: Boolean(provider.isLocal),
    })),
  };
}

function createDefaultProviderConfigs() {
  return Object.fromEntries(
    Object.values(PROVIDERS).map((provider) => [
      provider.id,
      {
        apiKey: "",
        model: provider.defaultModel,
        baseUrl: provider.baseUrl,
      },
    ]),
  );
}

function normalizeProvider(provider) {
  return PROVIDERS[provider] ? provider : DEFAULT_PROVIDER;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function getProviderConfig(provider) {
  const providerId = normalizeProvider(provider);
  const defaults = createDefaultProviderConfigs()[providerId];
  const saved = store.get(`providerConfigs.${providerId}`) || {};

  return {
    ...defaults,
    ...saved,
    apiKey: String(saved.apiKey || "").trim(),
    model: String(saved.model || defaults.model || "").trim(),
    baseUrl: normalizeBaseUrl(saved.baseUrl || defaults.baseUrl || ""),
  };
}

function getActiveProviderConfig() {
  // If an ENV API key is set, auto-detect the cloud provider
  if (ENV_API_KEY && ENV_API_KEY.trim() !== "") {
    const key = ENV_API_KEY.trim();

    if (key.startsWith("AIza")) {
      return {
        provider: "gemini",
        label: "Google Gemini",
        apiKey: key,
        model: "gemini-2.5-flash",
        baseUrl: "https://generativelanguage.googleapis.com",
      };
    } else if (key.startsWith("gsk_")) {
      return {
        provider: "custom",
        label: "Groq (Lightning Fast)",
        apiKey: key,
        model: "llama3-8b-8192",
        baseUrl: "https://api.groq.com/openai/v1",
      };
    } else if (key.startsWith("sk-ant-")) {
      return {
        provider: "anthropic",
        label: "Claude",
        apiKey: key,
        model: "claude-3-opus-20240229",
        baseUrl: "https://api.anthropic.com",
      };
    } else if (key.startsWith("sk-or-")) {
      return {
        provider: "custom",
        label: "OpenRouter (Gemma)",
        apiKey: key,
        model: "google/gemma-4-31b-it:free",
        baseUrl: "https://openrouter.ai/api/v1",
      };
    } else {
      return {
        provider: "openai",
        label: "OpenAI",
        apiKey: key,
        model: "gpt-4o",
        baseUrl: "https://api.openai.com/v1",
      };
    }
  }

  const provider = normalizeProvider(store.get("provider") || DEFAULT_PROVIDER);

  // For Ollama, no API key needed — just use local defaults
  if (provider === "ollama") {
    const cfg = getProviderConfig("ollama");
    return {
      provider: "ollama",
      label: PROVIDERS.ollama.label,
      apiKey: "",
      model: cfg.model || PROVIDERS.ollama.defaultModel,
      baseUrl: cfg.baseUrl || OLLAMA_BASE,
    };
  }

  return {
    provider,
    label: PROVIDERS[provider].label,
    ...getProviderConfig(provider),
  };
}

function migrateLegacyGeminiConfig() {
  const legacyKey = String(store.get("geminiApiKey") || "").trim();
  const currentGeminiKey = String(store.get("providerConfigs.gemini.apiKey") || "").trim();

  if (legacyKey && !currentGeminiKey) {
    store.set("providerConfigs.gemini.apiKey", legacyKey);
  }

  const legacyModel = String(store.get("model") || "").trim();

  if (legacyModel && legacyModel !== PROVIDERS.gemini.defaultModel) {
    store.set("providerConfigs.gemini.model", legacyModel);
  }
}

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-100)
    .map((message) => ({
      id: String(message.id || `${Date.now()}-${Math.random()}`),
      role: message.role === "user" ? "user" : "assistant",
      content: String(message.content || "").slice(0, 12000),
      createdAt: String(message.createdAt || new Date().toISOString()),
      reasoning_details: message.reasoning_details || undefined,
    }))
    .filter((message) => message.content.trim().length > 0);
}

function getConversationMessages(messages) {
  const normalized = (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const obj = {
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || "").trim().slice(0, 12000),
      };
      if (message.reasoning_details) {
        obj.reasoning_details = message.reasoning_details;
      }
      return obj;
    })
    .filter((message) => message.content.length > 0);
  const firstUserIndex = normalized.findIndex((message) => message.role === "user");

  return firstUserIndex >= 0 ? normalized.slice(firstUserIndex) : [];
}

function toGeminiContents(messages) {
  return getConversationMessages(messages)
    .slice(-18)
    .map((message) => {
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      };
    });
}

function toChatMessages(messages, instructionRole = "system") {
  return [
    {
      role: instructionRole,
      content: SOLICE_SYSTEM_PROMPT,
    },
    ...getConversationMessages(messages).slice(-18),
  ].filter((message) => message.content.length > 0);
}

function getChatCompletionEndpoint(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  return `${normalized}/chat/completions`;
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function ensureReadyForChat(config, messages) {
  if (!config.apiKey && config.provider !== "ollama") {
    throw new Error(`SOLICE needs a ${config.label} API key before chatting.`);
  }

  if (!config.model) {
    throw new Error(`Choose a ${config.label} model before chatting.`);
  }

  if (!Array.isArray(messages) || !messages.length) {
    throw new Error("SOLICE needs a message to answer.");
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 *  Ollama (Local LLM) Integration
 * ─────────────────────────────────────────────────────────────────────────── */

async function ensureOllamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return; // already running
  } catch {
    // not running — try to start it
  }

  for (const exePath of OLLAMA_EXE_PATHS) {
    try {
      execFile(exePath, ["serve"], { detached: true, stdio: "ignore" }).unref();
      // Give it a moment to boot
      await new Promise((r) => setTimeout(r, 2500));
      const check = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (check.ok) return;
    } catch {
      continue;
    }
  }

  throw new Error(
    "[Static crackle] Cannot reach Ollama at 127.0.0.1:11434. " +
    "Make sure Ollama is installed and running (`ollama serve`)."
  );
}

async function requestOllama(config, messages) {
  await ensureOllamaRunning();

  const ollamaMessages = [
    { role: "system", content: SOLICE_SYSTEM_PROMPT },
    ...getConversationMessages(messages).slice(-18),
  ];

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.86,
        top_p: 0.92,
        num_predict: 420,
      },
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const errMsg = data?.error || `Ollama returned HTTP ${response.status}.`;
    throw new Error(`[Static crackle] Local LLM error: ${errMsg}`);
  }

  const text = data?.message?.content?.trim();

  if (!text) {
    throw new Error("[Whir] Ollama returned an empty response. The model might still be loading.");
  }

  return { text };
}

async function requestGemini(config, messages) {
  const contents = toGeminiContents(messages);

  const response = await fetch(
    `${PROVIDERS.gemini.baseUrl}/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SOLICE_SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.86,
          topP: 0.92,
          maxOutputTokens: 420,
        },
      }),
    },
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Gemini request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return { text };
}

function formatApiError(config, status, data) {
  const message =
    data?.error?.message ||
    data?.message ||
    data?.raw ||
    `${config.label} request failed.`;

  return `${config.label} API error (HTTP ${status}): ${message}`;
}

function createChatCompletionBody(config, messages, instructionRole) {
  const body = {
    model: config.model,
    messages: toChatMessages(messages, instructionRole),
    stream: false,
  };

  if (config.provider === "deepseek") {
    body.max_tokens = 420;
    body.thinking = { type: "disabled" };
  }

  // Explicitly enable reasoning for OpenRouter (like in gemma.py)
  if (config.provider === "custom" && config.baseUrl.includes("openrouter")) {
    body.reasoning = { enabled: true };
  }

  return body;
}

async function requestChatCompletions(config, messages, instructionRole) {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.provider === "custom" && config.baseUrl.includes("openrouter")) {
    headers["HTTP-Referer"] = "http://localhost:3000";
    headers["X-Title"] = "SOLICE Desktop";
  }

  const response = await fetch(getChatCompletionEndpoint(config.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(createChatCompletionBody(config, messages, instructionRole)),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(formatApiError(config, response.status, data));
  }

  const messageObj = data?.choices?.[0]?.message || {};
  const text = messageObj.content?.trim();

  if (!text) {
    throw new Error(`${config.label} returned an empty response.`);
  }

  return {
    text,
    reasoning_details: messageObj.reasoning_details
  };
}

async function requestAnthropic(config, messages) {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 420,
      system: SOLICE_SYSTEM_PROMPT,
      messages: toChatMessages(messages)
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Claude request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const text = data?.content
    ?.map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Claude returned an empty response.");
  }

  return { text };
}

async function requestLlm(messages) {
  const config = getActiveProviderConfig();
  ensureReadyForChat(config, messages);

  if (config.provider === "ollama") {
    return requestOllama(config, messages);
  }

  if (config.provider === "gemini") {
    return requestGemini(config, messages);
  }

  if (config.provider === "anthropic") {
    return requestAnthropic(config, messages);
  }

  if (config.provider === "openai") {
    return requestChatCompletions(config, messages, "developer");
  }

  return requestChatCompletions(config, messages, "system");
}

function registerIpc() {
  ipcMain.handle("solice:get-config", () => getPublicConfig());

  ipcMain.handle("solice:save-provider-config", (_event, payload) => {
    const provider = normalizeProvider(payload?.provider || DEFAULT_PROVIDER);
    const providerMeta = PROVIDERS[provider];
    const model = String(payload?.model || providerMeta.defaultModel || "").trim();
    const apiKey = String(payload?.apiKey || "").trim();
    const baseUrl = normalizeBaseUrl(payload?.baseUrl || providerMeta.baseUrl || "");

    if (!model) {
      throw new Error("Choose a model first.");
    }

    if (apiKey.length < 8 && provider !== "ollama") {
      throw new Error("That API key looks too short.");
    }

    if (providerMeta.requiresBaseUrl && !baseUrl) {
      throw new Error("Custom providers need a base URL.");
    }

    store.set("provider", provider);
    store.set(`providerConfigs.${provider}`, {
      apiKey,
      model,
      baseUrl,
    });

    return getPublicConfig();
  });

  ipcMain.handle("solice:save-api-key", (_event, apiKey) => {
    const normalizedKey = String(apiKey || "").trim();
    const active = getActiveProviderConfig();

    if (normalizedKey.length < 8 && active.provider !== "ollama") {
      throw new Error("That API key looks too short.");
    }

    store.set(`providerConfigs.${active.provider}.apiKey`, normalizedKey);
    return getPublicConfig();
  });

  ipcMain.handle("solice:delete-api-key", () => {
    const active = getActiveProviderConfig();
    store.set(`providerConfigs.${active.provider}.apiKey`, "");
    return getPublicConfig();
  });

  ipcMain.handle("solice:chat", (_event, payload) =>
    requestLlm(payload?.messages || []),
  );

  ipcMain.handle("solice:get-history", () =>
    normalizeHistory(store.get("chatHistory") || []),
  );

  ipcMain.handle("solice:save-history", (_event, messages) => {
    store.set("chatHistory", normalizeHistory(messages));
    return { ok: true };
  });

  ipcMain.handle("solice:clear-history", () => {
    store.set("chatHistory", []);
    return { ok: true };
  });

  ipcMain.handle("solice:get-brainstorm-rooms", () =>
    store.get("brainstormRooms") || []
  );

  ipcMain.handle("solice:save-brainstorm-rooms", (_event, rooms) => {
    store.set("brainstormRooms", rooms);
    return { ok: true };
  });

  ipcMain.handle("solice:set-overlay-mode", (_event, isOverlay) => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(isOverlay, "screen-saver");
      if (isOverlay) {
        // Allow clicking through transparent areas
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        mainWindow.maximize();
      } else {
        mainWindow.setIgnoreMouseEvents(false);
        mainWindow.unmaximize();
      }
    }
    return { ok: true };
  });

  ipcMain.handle("solice:set-ignore-mouse-events", (_event, ignore) => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
    return { ok: true };
  });
}

app.whenReady().then(async () => {
  await createStore();
  registerIpc();
  createWindow();

  globalShortcut.register(SHORTCUT, showOrToggleWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
