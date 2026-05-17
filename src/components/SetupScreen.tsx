"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Loader2, RefreshCw } from "lucide-react";
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
            <h1 className="text-5xl font-light italic leading-none text-white sm:text-6xl">
              GET STARTED
            </h1>
            <p className="mt-2 text-lg font-light italic text-white/85">
              {isStarting ? "STARTING SOLICE" : "PRESS ANY KEY"}
            </p>
          </div>
        </section>
      ) : (
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col items-center justify-center text-center">
          <h1 className="text-6xl font-light italic leading-none text-white sm:text-8xl">
            HELLO THERE
          </h1>
          <p className="mt-2 text-base font-light italic text-white/65 sm:text-lg">
            {mode === "api"
              ? "enter your chosen API key to get started"
              : "choose the local mind SOLICE should wake up with"}
          </p>

          <form onSubmit={handleSubmit} className="mt-20 w-full max-w-2xl">
            {mode === "local" ? (
              <div className="flex flex-col items-center">
                <div className="mb-4 inline-flex items-center gap-3">
                  <p className="text-lg font-light italic tracking-wide text-white/80">
                    LOCAL LLM
                  </p>
                  <button
                    type="button"
                    onClick={() => setLocalScanRequest((value) => value + 1)}
                    disabled={localScanState === "scanning"}
                    className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-white/55 transition hover:border-sky-100/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                    title="Rescan local models"
                    aria-label="Rescan local models"
                  >
                    <RefreshCw
                      size={13}
                      className={
                        localScanState === "scanning" ? "animate-spin" : ""
                      }
                    />
                  </button>
                </div>
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
                          ? "rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-lg font-light italic text-white shadow-[0_0_20px_rgba(186,230,253,0.18)]"
                          : "rounded-full border border-transparent px-3 py-0.5 text-lg font-light italic text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input
                  value={localModel}
                  onChange={(event) => setLocalModel(event.target.value)}
                  placeholder="ollama model id"
                  spellCheck={false}
                  autoComplete="off"
                  className="mt-5 h-9 w-full max-w-sm rounded-full border border-white/10 bg-white/5 px-4 text-center text-sm font-light italic text-white/60 outline-none backdrop-blur-md transition placeholder:text-white/25 focus:border-sky-100/30 focus:bg-white/10"
                />
                <p className="mt-3 min-h-5 text-xs font-light italic text-white/40">
                  {localScanLabel}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
                  {apiProviderOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleProviderChange(option.id)}
                      className={
                        option.id === provider
                          ? "rounded-full border border-white/30 bg-white/10 px-3 py-0.5 text-lg font-light italic text-white shadow-[0_0_20px_rgba(186,230,253,0.18)]"
                          : "rounded-full border border-transparent px-3 py-0.5 text-lg font-light italic text-white/70 transition hover:text-white"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={selectedProvider.keyPlaceholder}
                  spellCheck={false}
                  autoComplete="off"
                  className="mt-3 h-10 w-full max-w-lg rounded-full border border-white/10 bg-white/5 px-5 text-center text-sm font-light italic text-white/85 outline-none backdrop-blur-md transition placeholder:text-white/25 focus:border-sky-100/40 focus:bg-white/10 focus:ring-2 focus:ring-sky-200/10"
                />

                <input
                  value={apiModel}
                  onChange={(event) => setApiModel(event.target.value)}
                  placeholder="model id"
                  spellCheck={false}
                  autoComplete="off"
                  className="mt-3 h-9 w-full max-w-md rounded-full border border-transparent bg-transparent px-4 text-center text-sm font-light italic text-white/60 outline-none transition placeholder:text-white/25 focus:border-white/10 focus:bg-white/5"
                />

                {selectedProvider.requiresBaseUrl ? (
                  <input
                    value={baseUrl}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    placeholder="https://api.provider.com/v1"
                    spellCheck={false}
                    autoComplete="off"
                    className="mt-2 h-9 w-full max-w-md rounded-full border border-transparent bg-transparent px-4 text-center text-sm font-light italic text-white/60 outline-none transition placeholder:text-white/25 focus:border-white/10 focus:bg-white/5"
                  />
                ) : null}
              </div>
            )}

            {error ? (
              <p className="mt-6 text-sm font-light italic text-red-100/80">
                {error}
              </p>
            ) : null}

            <div className="mt-12 flex flex-col items-center justify-center gap-5">
              <button
                type="submit"
                disabled={isSaving}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white/85 shadow-[0_0_26px_rgba(125,211,252,0.14)] backdrop-blur-md transition hover:border-sky-100/50 hover:bg-sky-100/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                title="Continue"
                aria-label="Continue"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>

              <div className="flex min-h-6 flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {mode === "api" && selectedProvider.apiKeyUrl ? (
                  <a
                    href={selectedProvider.apiKeyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-light italic text-white/50 transition hover:text-white/80"
                  >
                    key
                    <ExternalLink size={13} />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "api" ? "local" : "api");
                    setError("");
                  }}
                  className="text-lg font-light italic text-white/65 transition hover:text-white"
                >
                  {mode === "api"
                    ? "Select or continue with Local LLM"
                    : "Select or continue with API"}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
