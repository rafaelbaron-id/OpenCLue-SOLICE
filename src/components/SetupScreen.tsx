"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type {
  SoliceConfig,
  SoliceLocalModel,
  SoliceProviderId,
} from "@/types/solice";

type SetupScreenProps = {
  initialConfig?: SoliceConfig | null;
  onComplete: () => void | Promise<void>;
};

type SetupStage = "selecting" | "ready";
type SetupMode = "api" | "local";

type ProviderOption = {
  id: Exclude<SoliceProviderId, "ollama">;
  label: string;
  defaultModel: string;
  apiKeyUrl: string;
  baseUrl: string;
  keyPlaceholder: string;
  requiresBaseUrl?: boolean;
};

type LocalModelOption = {
  label: string;
  model: string;
  detected?: boolean;
};

const soliceBackgroundPath = "/ASSETS/ILLUSTRATION/SOLICE/SOLICE.png";

const apiProviderOptions: ProviderOption[] = [
  {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    baseUrl: "",
    keyPlaceholder: "AIza...",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-3-opus-20240229",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    baseUrl: "",
    keyPlaceholder: "sk-ant-...",
  },
  {
    id: "openai",
    label: "Open AI",
    defaultModel: "gpt-4o",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "",
    keyPlaceholder: "sk-...",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-chat",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    baseUrl: "",
    keyPlaceholder: "sk-...",
  },
  {
    id: "custom",
    label: "Custom",
    defaultModel: "llama3-8b-8192",
    apiKeyUrl: "",
    baseUrl: "https://api.example.com/v1",
    keyPlaceholder: "provider key",
    requiresBaseUrl: true,
  },
];

const localModelOptions: LocalModelOption[] = [
  { label: "Qwen2.5", model: "qwen2.5:7b" },
  { label: "Llama3.2", model: "llama3.2:3b" },
  { label: "Llama4", model: "llama4" },
  { label: "DeepSeekR1", model: "deepseek-r1:7b" },
];

function toLocalOption(model: SoliceLocalModel): LocalModelOption {
  return {
    label: model.label,
    model: model.model,
    detected: model.detected,
  };
}

function mergeLocalOptions(
  scanned: LocalModelOption[],
  selectedModel: string,
): LocalModelOption[] {
  const byModel = new Map<string, LocalModelOption>();

  for (const option of scanned.length ? scanned : localModelOptions) {
    byModel.set(option.model, option);
  }

  if (selectedModel && !byModel.has(selectedModel)) {
    byModel.set(selectedModel, {
      label: selectedModel,
      model: selectedModel,
      detected: false,
    });
  }

  return [...byModel.values()];
}

function getApiOption(provider: SoliceProviderId) {
  return (
    apiProviderOptions.find((option) => option.id === provider) ??
    apiProviderOptions[0]
  );
}

export default function SetupScreen({
  initialConfig,
  onComplete,
}: SetupScreenProps) {
  const initialApiProvider =
    initialConfig?.provider && initialConfig.provider !== "ollama"
      ? initialConfig.provider
      : "gemini";
  const initialApiOption = getApiOption(initialApiProvider);
  const initialLocalModel = initialConfig?.isLocal
    ? initialConfig.model || localModelOptions[1].model
    : localModelOptions[1].model;

  const [setupStage, setSetupStage] = useState<SetupStage>("selecting");
  const [mode, setMode] = useState<SetupMode>("api");
  const [provider, setProvider] =
    useState<Exclude<SoliceProviderId, "ollama">>(initialApiOption.id);
  const [apiKey, setApiKey] = useState("");
  const [apiModel, setApiModel] = useState(
    !initialConfig?.isLocal && initialConfig?.model
      ? initialConfig.model
      : initialApiOption.defaultModel,
  );
  const [baseUrl, setBaseUrl] = useState(initialApiOption.baseUrl);
  const [localModel, setLocalModel] = useState(initialLocalModel);
  const [detectedLocalModels, setDetectedLocalModels] = useState<
    LocalModelOption[]
  >([]);
  const [localScanState, setLocalScanState] = useState<
    "idle" | "scanning" | "detected" | "empty" | "offline"
  >("idle");
  const [localScanRequest, setLocalScanRequest] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const selectedProvider = useMemo(() => getApiOption(provider), [provider]);
  const visibleLocalModels = useMemo(
    () => mergeLocalOptions(detectedLocalModels, localModel),
    [detectedLocalModels, localModel],
  );
  const localScanLabel = useMemo(() => {
    if (localScanState === "scanning") {
      return "scanning local LLMs";
    }

    if (localScanState === "detected") {
      return "detected on this machine";
    }

    if (localScanState === "offline") {
      return "local scan unavailable";
    }

    return "recommended local models";
  }, [localScanState]);

  const handleStart = useCallback(async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    await onComplete();
  }, [isStarting, onComplete]);

  useEffect(() => {
    if (setupStage !== "ready") {
      return;
    }

    function startSolice() {
      void handleStart();
    }

    window.addEventListener("keydown", startSolice, { once: true });
    return () => window.removeEventListener("keydown", startSolice);
  }, [handleStart, setupStage]);

  useEffect(() => {
    if (mode !== "local") {
      return;
    }

    let cancelled = false;

    async function scanLocalModels() {
      if (!window.solice?.scanLocalModels) {
        setLocalScanState("offline");
        return;
      }

      setLocalScanState("scanning");

      try {
        const scan = await window.solice.scanLocalModels();

        if (cancelled) {
          return;
        }

        const detected = scan.models.map(toLocalOption);
        const recommended = scan.recommended.map(toLocalOption);
        const nextOptions = detected.length ? detected : recommended;

        setDetectedLocalModels(detected.length ? detected : []);
        setLocalModel((currentModel) => {
          if (nextOptions.some((option) => option.model === currentModel)) {
            return currentModel;
          }

          return nextOptions[0]?.model || currentModel;
        });
        setLocalScanState(detected.length ? "detected" : "empty");
      } catch {
        if (!cancelled) {
          setLocalScanState("offline");
        }
      }
    }

    scanLocalModels();

    return () => {
      cancelled = true;
    };
  }, [localScanRequest, mode]);

  function handleProviderChange(nextProvider: SoliceProviderId) {
    const nextOption = getApiOption(nextProvider);

    setProvider(nextOption.id);
    setApiModel(nextOption.defaultModel);
    setBaseUrl(nextOption.baseUrl);
    setError("");
  }

  async function saveSelection(modelOverride?: string) {
    setError("");
    const selectedModel =
      modelOverride?.trim() ||
      (mode === "local" ? localModel.trim() : apiModel.trim());

    if (!selectedModel) {
      setError("Choose a model first.");
      return;
    }

    if (!window.solice) {
      setError("Electron bridge is offline. Start SOLICE with npm run dev.");
      return;
    }

    try {
      setIsSaving(true);
      await window.solice.saveProviderConfig({
        provider: mode === "local" ? "ollama" : provider,
        apiKey: mode === "local" ? "" : apiKey,
        model: selectedModel,
        baseUrl: mode === "local" ? "http://127.0.0.1:11434" : baseUrl,
      });
      setSetupStage("ready");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "SOLICE could not store that model.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await saveSelection();
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-black px-5 py-8 text-white"
      onClick={setupStage === "ready" ? () => void handleStart() : undefined}
    >
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={soliceBackgroundPath}
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover opacity-75 blur-2xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,211,248,0.34),rgba(40,124,184,0.2)_31%,rgba(4,15,28,0.58)_63%,rgba(0,0,0,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.42)_78%,rgba(0,0,0,0.82))]" />
      </div>

      {setupStage === "ready" ? (
        <section className="relative z-10 grid min-h-[calc(100vh-4rem)] place-items-center text-center">
          <div>
            <h1 className="text-4xl font-light italic leading-none text-white sm:text-5xl md:text-6xl">
              GET STARTED
            </h1>
            <p className="mt-2 text-lg font-light italic text-white/85">
              {isStarting ? "STARTING SOLICE" : "PRESS ANY KEY"}
            </p>
          </div>
        </section>
      ) : (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
          <div className="w-full flex flex-col items-center">
            <h1 className="text-5xl font-light italic leading-tight text-white sm:text-6xl md:text-7xl">
              HELLO THERE
            </h1>
            <p className="mt-2 text-sm font-light italic text-white/70 sm:text-base">
              enter your chosen API key to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-12 w-full flex flex-col items-center">
            {mode === "local" ? (
              <div className="flex flex-col items-center w-full">
                <p className="mb-4 text-sm font-light italic text-white/70 sm:text-base">
                  LOCAL LLM detected on your machine
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  {visibleLocalModels.map((option) => (
                    <button
                      key={option.model}
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setLocalModel(option.model);
                        void saveSelection(option.model);
                      }}
                      className={
                        option.model === localModel
                          ? "rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-light italic text-white shadow-sm sm:text-base"
                          : "rounded-full border border-transparent px-4 py-1 text-sm font-light italic text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLocalScanRequest((value) => value + 1)}
                    disabled={localScanState === "scanning"}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Rescan local models"
                    aria-label="Rescan local models"
                  >
                    <RefreshCw
                      size={16}
                      className={
                        localScanState === "scanning" ? "animate-spin" : ""
                      }
                    />
                  </button>
                </div>
                {visibleLocalModels.length === 0 ? (
                  <input
                    value={localModel}
                    onChange={(event) => setLocalModel(event.target.value)}
                    placeholder="ollama model id"
                    spellCheck={false}
                    autoComplete="off"
                    className="mt-6 h-10 w-full max-w-md rounded-full border border-white/10 bg-white/[0.03] px-5 text-center text-sm font-light italic text-white/80 outline-none backdrop-blur-sm transition placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.05]"
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                  {apiProviderOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleProviderChange(option.id)}
                      className={
                        option.id === provider
                          ? "rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-light italic text-white shadow-sm sm:text-base"
                          : "rounded-full border border-transparent px-4 py-1 text-sm font-light italic text-white/60 transition hover:text-white sm:text-base"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 w-full max-w-md">
                  <input
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={selectedProvider.keyPlaceholder}
                    spellCheck={false}
                    autoComplete="off"
                    className="h-10 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 text-center text-sm font-light italic text-white/80 outline-none backdrop-blur-sm transition placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.05]"
                  />
                </div>

                {provider === "custom" && (
                  <div className="mt-3 flex w-full max-w-md flex-col gap-2">
                    <input
                      value={apiModel}
                      onChange={(event) => setApiModel(event.target.value)}
                      placeholder="model id"
                      spellCheck={false}
                      autoComplete="off"
                      className="h-9 w-full rounded-full border border-white/10 bg-white/[0.02] px-5 text-center text-xs font-light italic text-white/60 outline-none transition placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.04]"
                    />
                    {selectedProvider.requiresBaseUrl && (
                      <input
                        value={baseUrl}
                        onChange={(event) => setBaseUrl(event.target.value)}
                        placeholder="https://api.provider.com/v1"
                        spellCheck={false}
                        autoComplete="off"
                        className="h-9 w-full rounded-full border border-white/10 bg-white/[0.02] px-5 text-center text-xs font-light italic text-white/60 outline-none transition placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.04]"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {error ? (
              <p className="mt-5 text-sm font-light italic text-red-100/80">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col items-center justify-center gap-12">
              <button
                type="submit"
                disabled={isSaving}
                className="text-base font-light italic text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    continue
                  </span>
                ) : (
                  "continue"
                )}
              </button>

              <div className="flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "api" ? "local" : "api");
                    setError("");
                  }}
                  className="text-sm font-light italic text-white/60 transition hover:text-white sm:text-base"
                >
                  {mode === "api"
                    ? "go with local LLM"
                    : "go with API key"}
                </button>
                
                {mode === "api" && selectedProvider.apiKeyUrl ? (
                  <a
                    href={selectedProvider.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-light italic text-white/30 transition hover:text-white/60"
                  >
                    get api key
                    <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
