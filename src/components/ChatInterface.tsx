"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import type { SoliceChatMessage } from "@/types/solice";

type ChatInterfaceProps = {
  initialMessages: SoliceChatMessage[];
  imageSrc?: string;
  providerLabel: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onClearChat: () => void | Promise<void>;
  onOpenConfiguration: () => void | Promise<void>;
  onMessagesChange?: (messages: SoliceChatMessage[]) => void;
  onThinkingChange?: (isThinking: boolean) => void;
  onAssistantUtterance?: (text: string) => void;
  onActivateBrainstorm?: () => void;
  onActivateOverlay?: () => void;
};

const greeting: SoliceChatMessage = {
  id: "solice-greeting",
  role: "assistant",
  content: "Hello there,\nMy name is Solice",
  createdAt: new Date().toISOString(),
};

function createMessage(
  role: SoliceChatMessage["role"],
  content: string,
  reasoning_details?: any
): SoliceChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    reasoning_details,
  };
}

function toBridgeMessages(messages: SoliceChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    image: message.image,
    reasoning_details: message.reasoning_details,
  }));
}

export default function ChatInterface({
  initialMessages,
  imageSrc,
  providerLabel,
  voiceEnabled,
  onToggleVoice,
  onClearChat,
  onOpenConfiguration,
  onAssistantUtterance,
  onMessagesChange,
  onThinkingChange,
  onActivateBrainstorm,
  onActivateOverlay,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<SoliceChatMessage[]>(
    initialMessages.length ? initialMessages : [greeting],
  );
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const visibleMessages = useMemo(
    () => messages.slice(-3),
    [messages],
  );

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === ",") {
        event.preventDefault();
        setSettingsOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function persist(nextMessages: SoliceChatMessage[]) {
    setMessages(nextMessages);
    onMessagesChange?.(nextMessages);
    window.solice?.saveHistory(nextMessages).catch(() => undefined);
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const content = draft.trim();

    if (!content || isSending) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", content)];
    setDraft("");
    persist(nextMessages);
    setIsSending(true);
    onThinkingChange?.(true);

    try {
      const response = await window.solice?.sendMessage({
        messages: toBridgeMessages(nextMessages),
      });
      const assistantMessage = createMessage(
        "assistant",
        response?.text ||
          "[Beep] I can only talk from inside the Electron app right now.",
        response?.reasoning_details
      );
      const withAssistant = [...nextMessages, assistantMessage];
      persist(withAssistant);
      onAssistantUtterance?.(assistantMessage.content);
    } catch (chatError) {
      const message =
        chatError instanceof Error
          ? chatError.message
          : "Unknown provider problem.";
      persist([
        ...nextMessages,
        createMessage(
          "assistant",
          `[Static crackle] The AI provider rejected the request: ${message}`,
        ),
      ]);
    } finally {
      setIsSending(false);
      onThinkingChange?.(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === "Escape") {
      inputRef.current?.blur();
    }
  }

  return (
    <>
      {/* ── Dynamic Island ── */}
      <div className="solice-dynamic-island-container">
        <div className="solice-dynamic-island">
          <div className="solice-island-content">
            <svg className="solice-island-gear" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="solice-island-text">Settings</span>
            <button
              type="button"
              className="solice-island-action"
              onClick={onToggleVoice}
            >
              {voiceEnabled ? "Mute" : "Voice"}
            </button>
            <button
              type="button"
              className="solice-island-action"
              onClick={onClearChat}
            >
              Clear
            </button>
            <button
              type="button"
              className="solice-island-action"
              onClick={onOpenConfiguration}
            >
              Configuration
            </button>
            <button
              type="button"
              className="solice-island-action"
              onClick={onActivateOverlay}
              title="Ctrl + S"
            >
              Overlay
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat area (plain text, bottom-anchored) ── */}
      <div className="solice-chat-area">
        <div className="solice-chat-scroll">
          {imageSrc && (
            <div className="mb-4 flex w-full justify-center">
              <img
                src={imageSrc}
                alt="Context"
                className="max-h-32 w-auto rounded-lg object-contain border border-white/10 shadow-lg"
              />
            </div>
          )}
          {visibleMessages.map((message) => (
            <div key={message.id} className="solice-msg-wrapper flex flex-col mb-4">
              {message.image && (
                <div className={`mb-2 flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <img
                    src={`data:image/jpeg;base64,${message.image}`}
                    alt="Snippet Region"
                    className="max-h-40 w-auto rounded-lg object-contain border border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                  />
                </div>
              )}
              <p
                className={
                  message.role === "user"
                    ? "solice-msg solice-msg-user"
                    : "solice-msg solice-msg-assistant"
                }
              >
                {message.content}
              </p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Invisible input area ── */}
      <motion.div
        className="solice-input-area cursor-grab active:cursor-grabbing"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.y < -150) {
            onActivateBrainstorm?.();
          }
        }}
      >
        <form onSubmit={handleSubmit} className="solice-input-form">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={isSending ? "Thinking..." : "Type a message..."}
            aria-label="Message SOLICE"
            rows={1}
            className="solice-input"
          />
        </form>
      </motion.div>
    </>
  );
}
