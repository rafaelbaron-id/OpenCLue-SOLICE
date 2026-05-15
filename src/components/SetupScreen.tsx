"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { Cpu, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import type { SoliceProviderId } from "@/types/solice";

type SetupScreenProps = {
  onComplete: () => void | Promise<void>;
};

type ProviderOption = {
  id: SoliceProviderId;
  label: string;
  defaultModel: string;
  apiKeyUrl: string;
  baseUrl: string;
  keyPlaceholder: string;
  requiresBaseUrl?: boolean;
};

const solicePngPath = "/ASSETS/ILLUSTRATION/SOLICE/SOLICE PNG.png";

const providerOptions: ProviderOption[] = [
  {
    id: "gemini",
    label: "Gemini",
    defaultModel: "gemini-2.5-flash",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    baseUrl: "",
    keyPlaceholder: "AIza...",
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "",
    keyPlaceholder: "sk-...",
  },
  {
    id: "anthropic",
    label: "Claude",
    defaultModel: "claude-3-opus-20240229",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    baseUrl: "",
    keyPlaceholder: "sk-ant-...",
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
    defaultModel: "",
    apiKeyUrl: "",
    baseUrl: "https://api.example.com/v1",
    keyPlaceholder: "provider key",
    requiresBaseUrl: true,
  },
];

export default function SetupScreen({ onComplete }: SetupScreenProps) {
  const [provider, setProvider] = useState<SoliceProviderId>("gemini");
  const selectedProvider = useMemo(
    () =>
      providerOptions.find((option) => option.id === provider) ??
      providerOptions[0],
    [provider],
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(selectedProvider.defaultModel);
  const [baseUrl, setBaseUrl] = useState(selectedProvider.baseUrl);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleProviderChange(nextProvider: SoliceProviderId) {
    const nextOption =
      providerOptions.find((option) => option.id === nextProvider) ??
      providerOptions[0];

    setProvider(nextOption.id);
    setModel(nextOption.defaultModel);
    setBaseUrl(nextOption.baseUrl);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!window.solice) {
      setError("Electron bridge is offline. Start SOLICE with npm run dev.");
      return;
    }

    try {
      setIsSaving(true);
      await window.solice.saveProviderConfig({
        provider,
        apiKey,
        model,
        baseUrl,
      });
      await onComplete();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "SOLICE could not store that provider.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="getting-started-surface relative grid min-h-screen place-items-center overflow-hidden bg-black px-5 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.18)_0_25%,rgba(5,20,36,0.78)_25%_65%,rgba(0,92,196,0.62)_65%_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,22,39,0.72)_0_30%,rgba(0,0,0,0.1)_30%_76%,rgba(0,57,117,0.58)_76%_100%)]" />
        <div className="absolute left-1/2 top-[43%] h-[46vh] w-[82vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
          <Image
            src={solicePngPath}
            alt=""
            fill
            priority
            sizes="82vw"
            className="object-contain opacity-55 blur-xl"
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.36),rgba(14,116,181,0.18)_32%,rgba(0,0,0,0.08)_58%,rgba(0,0,0,0.48)_100%)]" />
      </div>

      <section className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        <div className="mb-8 grid h-12 w-12 place-items-center rounded-md border border-white/20 bg-white/10 text-sky-100 shadow-solice-blue backdrop-blur">
          <KeyRound size={22} />
        </div>

        <h1 className="text-4xl font-light italic leading-none text-white sm:text-5xl">
          HELLO THERE
        </h1>
        <p className="mt-3 text-sm italic text-white/84 sm:text-base">
          enter your chosen AI provider key to get started
        </p>

        <form onSubmit={handleSubmit} className="mt-12 w-full max-w-xl">
          <div className="grid gap-3 rounded-lg border border-white/12 bg-black/18 p-3 text-left backdrop-blur-md sm:grid-cols-[0.92fr_1.08fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase text-white/72">
                Provider
              </span>
              <select
                value={provider}
                onChange={(event) =>
                  handleProviderChange(event.target.value as SoliceProviderId)
                }
                className="h-12 w-full rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
              >
                {providerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase text-white/72">
                Model
              </span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="provider model id"
                spellCheck={false}
                autoComplete="off"
                className="h-12 w-full rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
              />
            </label>

            {selectedProvider.requiresBaseUrl ? (
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-medium uppercase text-white/72">
                  Base URL
                </span>
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://api.provider.com/v1"
                  spellCheck={false}
                  autoComplete="off"
                  className="h-12 w-full rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60"
                />
              </label>
            ) : null}

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-medium uppercase text-white/72">
                API Key
              </span>
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={selectedProvider.keyPlaceholder}
                spellCheck={false}
                autoComplete="off"
                className="h-14 w-full rounded-full border border-white/10 bg-white px-6 text-center text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-200/50"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-100">[Static crackle] {error}</p>
          ) : (
            <p className="mt-4 text-sm text-white/72">
              [Whir] Provider keys stay local in Electron storage.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            {selectedProvider.apiKeyUrl ? (
              <a
                href={selectedProvider.apiKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/16 bg-black/16 px-3 text-sm text-white/82 transition hover:border-sky-200/50 hover:bg-sky-300/10 hover:text-white"
              >
                {selectedProvider.label} keys
                <ExternalLink size={15} />
              </a>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Cpu size={16} />
              )}
              Begin
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
