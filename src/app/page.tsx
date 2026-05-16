"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import SetupScreen from "@/components/SetupScreen";
import SoliceFace from "@/components/SoliceFace";
import VoiceEngine from "@/components/VoiceEngine";
import BrainstormMode, { Room as BrainstormRoom } from "@/components/BrainstormMode";
import ScreenOverlay from "@/components/ScreenOverlay";
import type { SoliceChatMessage, SoliceConfig } from "@/types/solice";

const fallbackConfig: SoliceConfig = {
  provider: "ollama",
  hasApiKey: true,
  model: "llama3.2:3b",
  baseUrl: "",
  shortcut: "Ctrl+Shift+Space",
  isLocal: true,
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
  const [isBrainstormMode, setIsBrainstormMode] = useState(false);
  const [brainstormImage, setBrainstormImage] = useState<string | undefined>();
  const [brainstormRooms, setBrainstormRooms] = useState<BrainstormRoom[]>([]);
  const [isOverlayMode, setIsOverlayMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const [nextConfig, savedHistory, savedRooms] = await Promise.all([
          window.solice?.getConfig(),
          window.solice?.getHistory(),
          (window as any).solice?.getBrainstormRooms?.(),
        ]);

        if (!mounted) {
          return;
        }

        setConfig(nextConfig ?? fallbackConfig);
        setHistory(savedHistory ?? []);
        setBrainstormRooms(savedRooms ?? []);
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

  // Ctrl+S shortcut to toggle overlay mode
  useEffect(() => {
    function handleOverlayShortcut(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setIsOverlayMode(prev => {
          if (prev) {
            // Exiting overlay
            return false;
          }
          // Entering overlay — close brainstorm if open
          setIsBrainstormMode(false);
          return true;
        });
      }
    }
    window.addEventListener("keydown", handleOverlayShortcut);
    return () => window.removeEventListener("keydown", handleOverlayShortcut);
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

  const handleRoomsChange = useCallback((newRooms: BrainstormRoom[]) => {
    setBrainstormRooms(newRooms);
    (window as any).solice?.saveBrainstormRooms?.(newRooms).catch(() => {});
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isBrainstormMode && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setBrainstormImage(event.target?.result as string);
          setIsBrainstormMode(true);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <main 
      className={isOverlayMode ? "solice-main solice-main--overlay" : "solice-main"}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <VoiceEngine
        enabled={voiceEnabled}
        text={lastAssistantText}
        onSpeakingChange={setIsSpeaking}
      />

      {/* Background layer */}
      {!isOverlayMode && <SoliceFace state={faceState} />}

      {/* UI layer */}
      <div style={{ display: (isBrainstormMode || isOverlayMode) ? "none" : "block" }}>
        <ChatInterface
          key={chatResetToken}
          initialMessages={history}
          imageSrc={brainstormImage}
          providerLabel={`${config.provider} / ${config.model}`}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled((enabled) => !enabled)}
          onClearChat={handleClearChat}
          onForgetKey={handleForgetKey}
          onMessagesChange={setHistory}
          onThinkingChange={setIsThinking}
          onAssistantUtterance={setLastAssistantText}
          onActivateBrainstorm={() => {
            setBrainstormImage(undefined);
            setIsBrainstormMode(true);
          }}
          onActivateOverlay={() => {
            setIsBrainstormMode(false);
            setIsOverlayMode(true);
          }}
        />
      </div>

      {isBrainstormMode && (
        <BrainstormMode 
          initialMessages={history}
          initialImage={brainstormImage} 
          rooms={brainstormRooms}
          onRoomsChange={handleRoomsChange}
          onSelectRoom={(room) => {
            setHistory(room.messages);
            setBrainstormImage(room.imageSrc);
            setChatResetToken((v) => v + 1);
            setIsBrainstormMode(false);
          }} 
        />
      )}

      {isOverlayMode && (
        <ScreenOverlay
          initialMessages={history}
          onExit={() => setIsOverlayMode(false)}
        />
      )}
    </main>
  );
}
