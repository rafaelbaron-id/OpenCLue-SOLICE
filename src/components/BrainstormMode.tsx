"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SoliceChatMessage } from "@/types/solice";

export type Room = {
  id: string;
  type: "text" | "image";
  imageSrc?: string;
  messages: SoliceChatMessage[];
  x: number;
  y: number;
};

type BrainstormModeProps = {
  initialMessages: SoliceChatMessage[];
  initialImage?: string;
  rooms: Room[];
  onRoomsChange: (rooms: Room[]) => void;
  onSelectRoom: (room: Room) => void;
};

function createMessage(role: SoliceChatMessage["role"], content: string): SoliceChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function BrainstormMode({ initialMessages, initialImage, rooms, onRoomsChange, onSelectRoom }: BrainstormModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingRoom, setIsDraggingRoom] = useState(false);
  const [sendingRooms, setSendingRooms] = useState<Set<string>>(new Set());
  const startPan = useRef({ x: 0, y: 0 });

  // Keep a ref to the latest rooms so async callbacks never use stale data
  const roomsRef = useRef(rooms);
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Stable helper: update a single room's data by ID
  const updateRoom = useCallback((roomId: string, updater: (room: Room) => Room) => {
    const latest = roomsRef.current;
    const updated = latest.map((r) => (r.id === roomId ? updater(r) : r));
    onRoomsChange(updated);
  }, [onRoomsChange]);

  useEffect(() => {
    const newRooms = [...rooms];
    
    const currentLastMessageId = initialMessages[initialMessages.length - 1]?.id;
    let foundRoom = false;
    
    if (currentLastMessageId) {
      for (let i = 0; i < newRooms.length; i++) {
         const roomLastId = newRooms[i].messages[newRooms[i].messages.length - 1]?.id;
         if (roomLastId === currentLastMessageId) {
            foundRoom = true;
            break;
         }
      }
    }
    
    if (!foundRoom && initialMessages.length > 0) {
      newRooms.push({
        id: crypto.randomUUID(),
        type: "text",
        messages: initialMessages,
        x: window.innerWidth / 2 - 180 - pan.x,
        y: window.innerHeight / 2 - 150 - pan.y,
      });
    }

    if (initialImage) {
      newRooms.push({
        id: crypto.randomUUID(),
        type: "image",
        imageSrc: initialImage,
        messages: [createMessage("assistant", "What would you like to know about this image?")],
        x: window.innerWidth / 2 + 180 - pan.x,
        y: window.innerHeight / 2 - 150 - pan.y,
      });
    }

    if (newRooms.length !== rooms.length) {
      onRoomsChange(newRooms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onRoomsChange([
      ...roomsRef.current,
      {
        id: crypto.randomUUID(),
        type: "text",
        messages: [createMessage("assistant", "New idea?")],
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
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
          onRoomsChange([
            ...roomsRef.current,
            {
              id: crypto.randomUUID(),
              type: "image",
              imageSrc: event.target?.result as string,
              messages: [createMessage("assistant", "Image received. What do we do with it?")],
              x: e.clientX - pan.x,
              y: e.clientY - pan.y,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeRoom = useCallback((id: string) => {
    onRoomsChange(roomsRef.current.filter((r) => r.id !== id));
  }, [onRoomsChange]);

  const sendMessage = useCallback(async (roomId: string, text: string) => {
    if (!text.trim()) return;

    const userMsg = createMessage("user", text);

    // Step 1: Append the user message to the room (using ref for freshness)
    updateRoom(roomId, (room) => ({
      ...room,
      messages: [...room.messages, userMsg],
    }));

    // Mark this room as sending
    setSendingRooms((prev) => new Set(prev).add(roomId));

    try {
      // Step 2: Build full conversation history for this room (read fresh state)
      // We need to wait a tick so the state updates from step 1 are reflected in the ref
      await new Promise((r) => setTimeout(r, 50));

      const currentRoom = roomsRef.current.find((r) => r.id === roomId);
      const roomMessages = currentRoom?.messages || [];

      // Send the FULL room conversation to the AI, not just the latest message
      const bridgeMessages = roomMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await window.solice?.sendMessage({
        messages: bridgeMessages,
      });

      const assistantMsg = createMessage(
        "assistant",
        response?.text || "[Beep] Got it!"
      );

      // Step 3: Append assistant reply (using ref for freshness)
      updateRoom(roomId, (room) => ({
        ...room,
        messages: [...room.messages, assistantMsg],
      }));
    } catch (e) {
      console.error("Brainstorm chat error:", e);
      const errorMsg = createMessage(
        "assistant",
        `[Static crackle] ${e instanceof Error ? e.message : "Error processing request."}`
      );
      updateRoom(roomId, (room) => ({
        ...room,
        messages: [...room.messages, errorMsg],
      }));
    } finally {
      setSendingRooms((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }
  }, [updateRoom]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1) { // Middle click
      e.preventDefault();
      setIsPanning(true);
      startPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.current.x,
        y: e.clientY - startPan.current.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.button === 1) {
      setIsPanning(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-room-scroll='true']")) {
      return;
    }

    // Disable wheel-based canvas navigation in brainstorm mode.
    // Panning is intentionally middle-click only.
    e.preventDefault();
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onContextMenu={handleContextMenu}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`absolute inset-0 z-40 touch-none overflow-hidden bg-black/10 ${isPanning ? "cursor-grabbing" : "cursor-crosshair"}`}
    >
      <div 
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        <AnimatePresence>
          {rooms.map((room) => (
            <RoomBubble 
              key={room.id} 
              room={room} 
              isSending={sendingRooms.has(room.id)}
              onRemove={removeRoom} 
              onSend={sendMessage}
              onSelect={() => onSelectRoom(room)}
              onUpdatePosition={(id, x, y) => {
                updateRoom(id, (r) => ({ ...r, x, y }));
              }}
              onDragStart={() => setIsDraggingRoom(true)}
              onDragEnd={() => setIsDraggingRoom(false)}
            />
          ))}
        </AnimatePresence>
      </div>

      {rooms.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/40">
          <p>Right click to add a text room, or drop an image.</p>
        </div>
      )}

      {isDraggingRoom && (
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 flex justify-center">
          <p className="text-sm font-medium text-white/50 animate-pulse">
            Drag the chat room into any edge to remove
          </p>
        </div>
      )}
    </motion.div>
  );
}

function RoomBubble({
  room,
  isSending,
  onRemove,
  onSend,
  onSelect,
  onUpdatePosition,
  onDragStart,
  onDragEnd,
}: {
  room: Room;
  isSending: boolean;
  onRemove: (id: string) => void;
  onSend: (id: string, text: string) => void;
  onSelect: () => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room.messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && draft.trim()) {
        onSend(room.id, draft);
        setDraft("");
      }
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={(e, info) => {
        onDragEnd();
        // Remove if dragged far out of bounds relative to the room's current local position
        // info.point is relative to the viewport.
        if (
          info.point.x < 50 ||
          info.point.x > window.innerWidth - 50 ||
          info.point.y < 50 ||
          info.point.y > window.innerHeight - 50
        ) {
          onRemove(room.id);
        } else {
          // Update the room's persistent coordinates
          onUpdatePosition(room.id, room.x + info.offset.x, room.y + info.offset.y);
        }
      }}
      initial={{ scale: 0.8, opacity: 0, x: room.x, y: room.y }}
      animate={{ scale: 1, opacity: 1, x: room.x, y: room.y }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute flex w-80 flex-col gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 text-white shadow-2xl backdrop-blur-xl"
    >
      {room.type === "image" && room.imageSrc && (
        <img
          src={room.imageSrc}
          alt="Brainstorm Attachment"
          className="h-40 w-full rounded-xl object-cover"
          draggable={false}
        />
      )}
      
      <div
        ref={scrollRef}
        data-room-scroll="true"
        onWheel={(e) => e.stopPropagation()}
        className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1"
      >
        {room.messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm ${
              msg.role === "user" ? "text-white/60 italic" : "text-white/90"
            }`}
          >
            {msg.content}
          </div>
        ))}
        {isSending && (
          <div className="text-sm text-sky-300/70 animate-pulse">
            [Processing...]
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isSending ? "Thinking..." : "Type a message..."}
          disabled={isSending}
          className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:bg-white/20 focus:ring-1 focus:ring-sky-400 disabled:opacity-50"
        />
        <button
          onClick={onSelect}
          title="Continue here"
          className="flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-white transition hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}
