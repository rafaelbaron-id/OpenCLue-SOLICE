"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SoliceChatMessage } from "@/types/solice";

type OverlayPanel = {
  id: string;
  type: "chat" | "image";
  imageSrc?: string;
  messages: SoliceChatMessage[];
  x: number;
  y: number;
  w: number;
  h: number;
};

type ScreenOverlayProps = {
  initialMessages: SoliceChatMessage[];
  onExit: () => void;
};

function createMessage(role: SoliceChatMessage["role"], content: string): SoliceChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function ScreenOverlay({ initialMessages, onExit }: ScreenOverlayProps) {
  const [panels, setPanels] = useState<OverlayPanel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tell Electron to enable overlay mode
    (window as any).solice?.setOverlayMode?.(true);

    // Make html/body transparent
    document.documentElement.style.setProperty("--solice-bg", "transparent");
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    const initialPanels: OverlayPanel[] = [
      {
        id: crypto.randomUUID(),
        type: "chat",
        messages: initialMessages.length > 0
          ? initialMessages
          : [createMessage("assistant", "Overlay Mode Active. I can see your screen.")],
        x: 60,
        y: 100,
        w: 380,
        h: 420,
      },
    ];
    setPanels(initialPanels);

    return () => {
      (window as any).solice?.setOverlayMode?.(false);
      document.documentElement.style.setProperty("--solice-bg", "#000000");
      document.documentElement.style.background = "#000000";
      document.body.style.background = "#000000";
    };
  }, [initialMessages]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPanels(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "chat",
        messages: [createMessage("assistant", "What should I analyze?")],
        x: e.clientX,
        y: e.clientY,
        w: 360,
        h: 320,
      },
    ]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPanels(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "image",
              imageSrc: event.target?.result as string,
              messages: [createMessage("assistant", "Image received. What should I analyze?")],
              x: e.clientX - 180,
              y: e.clientY - 100,
              w: 400,
              h: 450,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removePanel = (id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  };

  const sendMessage = async (panelId: string, text: string) => {
    if (!text.trim()) return;

    const userMsg = createMessage("user", text);

    // Append user message
    setPanels(prev =>
      prev.map(p =>
        p.id === panelId
          ? { ...p, messages: [...p.messages, userMsg] }
          : p
      )
    );

    try {
      // Build FULL conversation history for this panel
      // Read current panels to get the complete message list
      let panelMessages: { role: string; content: string }[] = [];
      setPanels(prev => {
        const panel = prev.find(p => p.id === panelId);
        if (panel) {
          panelMessages = panel.messages.map(m => ({
            role: m.role,
            content: m.content,
          }));
        }
        return prev; // no mutation, just reading
      });

      const response = await window.solice?.sendMessage({
        messages: panelMessages.length > 0
          ? panelMessages
          : [{ role: "user", content: text }],
      });

      setPanels(prev =>
        prev.map(p =>
          p.id === panelId
            ? {
                ...p,
                messages: [
                  ...p.messages,
                  createMessage("assistant", response?.text || "Got it!"),
                ],
              }
            : p
        )
      );
    } catch (e) {
      console.error(e);
      setPanels(prev =>
        prev.map(p =>
          p.id === panelId
            ? {
                ...p,
                messages: [
                  ...p.messages,
                  createMessage(
                    "assistant",
                    `[Static crackle] ${e instanceof Error ? e.message : "Error processing request."}`
                  ),
                ],
              }
            : p
        )
      );
    }
  };

  // Enable mouse events when hovering over interactive areas
  const handleMouseEnter = () => {
    (window as any).solice?.setIgnoreMouseEvents?.(false);
  };

  const handleMouseLeave = () => {
    (window as any).solice?.setIgnoreMouseEvents?.(true, { forward: true });
  };

  return (
    <div
      ref={containerRef}
      className="overlay-root"
      onContextMenu={handleContextMenu}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* ── HUD Top Bar ── */}
      <div
        className="overlay-hud-bar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="overlay-hud-inner">
          <div className="overlay-hud-left">
            <div className="overlay-hud-dot" />
            <span className="overlay-hud-label">SOLICE Overlay</span>
          </div>
          <div className="overlay-hud-right">
            <span className="overlay-hud-shortcut">Ctrl + S to exit</span>
            <button
              className="overlay-hud-btn"
              onClick={onExit}
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* ── Panels ── */}
      <AnimatePresence>
        {panels.map((panel) => (
          <OverlayPanelBubble
            key={panel.id}
            panel={panel}
            onRemove={removePanel}
            onSend={sendMessage}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </AnimatePresence>

      {panels.length === 0 && (
        <div className="overlay-empty-hint">
          <p>Right click to add a panel, or drop an image.</p>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Individual Overlay Panel
   ═══════════════════════════════════════════ */

function OverlayPanelBubble({
  panel,
  onRemove,
  onSend,
  onMouseEnter,
  onMouseLeave,
}: {
  panel: OverlayPanel;
  onRemove: (id: string) => void;
  onSend: (id: string, text: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: panel.w, h: panel.h });
  const isResizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [panel.messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(panel.id, draft);
      setDraft("");
    }
  };

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };

    const handleMove = (ev: PointerEvent) => {
      if (!isResizing.current) return;
      const dw = ev.clientX - resizeStart.current.x;
      const dh = ev.clientY - resizeStart.current.y;
      setSize({
        w: Math.max(280, resizeStart.current.w + dw),
        h: Math.max(200, resizeStart.current.h + dh),
      });
    };

    const handleUp = () => {
      isResizing.current = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragListener={true}
      onDragEnd={(_, info) => {
        if (
          info.point.x < 30 ||
          info.point.x > window.innerWidth - 30 ||
          info.point.y < 30 ||
          info.point.y > window.innerHeight - 30
        ) {
          onRemove(panel.id);
        }
      }}
      initial={{ scale: 0.9, opacity: 0, x: panel.x, y: panel.y }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="overlay-panel"
      style={{ width: size.w, height: size.h }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Panel Header (draggable handle) ── */}
      <div className="overlay-panel-header">
        <div className="overlay-panel-title">
          <span className="overlay-panel-dot" />
          {panel.type === "image" ? "✨ Image Analysis" : "✨ Live insights"}
        </div>
        <button
          className="overlay-panel-close"
          onClick={() => onRemove(panel.id)}
        >
          ✕
        </button>
      </div>

      {/* ── Image Preview ── */}
      {panel.type === "image" && panel.imageSrc && (
        <img
          src={panel.imageSrc}
          alt="Overlay Attachment"
          className="overlay-panel-image"
          draggable={false}
        />
      )}

      {/* ── Messages ── */}
      <div className="overlay-panel-messages">
        {panel.messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === "user"
                ? "overlay-msg overlay-msg-user"
                : "overlay-msg overlay-msg-assistant"
            }
          >
            {msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="overlay-panel-input-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your screen..."
          className="overlay-panel-input"
        />
      </div>

      {/* ── Resize Handle ── */}
      <div
        className="overlay-panel-resize"
        onPointerDown={startResize}
      />
    </motion.div>
  );
}
