"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import SetupScreen from "@/components/SetupScreen";
import SoliceFace from "@/components/SoliceFace";
import VoiceEngine from "@/components/VoiceEngine";
import type { SoliceChatMessage, SoliceConfig } from "@/types/solice";

const fallbackConfig: SoliceConfig = {
  provider: "gemini",
  hasApiKey: false,
  model: "gemini-2.5-flash",
  baseUrl: "",
  shortcut: "Ctrl+Shift+Space",
  providers: [],
};

export default function Home() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<SoliceConfig | null>(null);
  const [history, setHistory] = useState<SoliceChatMessage[]>([]);
  const [chatResetToken, setChatResetToken] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [lastAssistantText, setLastAssistantText] = useState("");

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const [nextConfig, savedHistory] = await Promise.all([
          window.solice?.getConfig(),
          window.solice?.getHistory(),
        ]);

        if (!mounted) {
          return;
        }

        setConfig(nextConfig ?? fallbackConfig);
        setHistory(savedHistory ?? []);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const faceState = useMemo(() => {
    if (isThinking) {
      return "thinking";
    }

    if (isSpeaking) {
      return "speaking";
    }

    return "idle";
  }, [isSpeaking, isThinking]);

  const handleSetupComplete = useCallback(async () => {
    const nextConfig = await window.solice?.getConfig();
    setConfig(nextConfig ?? { ...fallbackConfig, hasApiKey: true });
  }, []);

  const handleClearChat = useCallback(async () => {
    await window.solice?.clearHistory();
    setHistory([]);
    setLastAssistantText("");
    setChatResetToken((value) => value + 1);
  }, []);

  const handleForgetKey = useCallback(async () => {
    const nextConfig = await window.solice?.deleteApiKey();
    setConfig(nextConfig ?? fallbackConfig);
  }, []);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-white">
        <div className="h-12 w-12 animate-pulse rounded-full border border-sky-200/40 bg-sky-200/10 shadow-solice-blue" />
      </main>
    );
  }

  if (!config?.hasApiKey) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  return (
    <main className="solice-main">
      <VoiceEngine
        enabled={voiceEnabled}
        text={lastAssistantText}
        onSpeakingChange={setIsSpeaking}
      />

      {/* Background layer */}
      <SoliceFace state={faceState} />

      {/* UI layer */}
      <ChatInterface
        key={chatResetToken}
        initialMessages={history}
        providerLabel={`${config.provider} / ${config.model}`}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
        onClearChat={handleClearChat}
        onForgetKey={handleForgetKey}
        onMessagesChange={setHistory}
        onThinkingChange={setIsThinking}
        onAssistantUtterance={setLastAssistantText}
      />
    </main>
  );
}
