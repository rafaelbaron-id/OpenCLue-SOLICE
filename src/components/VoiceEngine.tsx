"use client";

import { useEffect } from "react";

type VoiceEngineProps = {
  enabled: boolean;
  text: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
};

export default function VoiceEngine({
  enabled,
  text,
  onSpeakingChange,
}: VoiceEngineProps) {
  useEffect(() => {
    if (!enabled || !text || !("speechSynthesis" in window)) {
      onSpeakingChange?.(false);
      return;
    }

    const spokenText = text.replace(/\[[^\]]+\]/g, "").trim();

    if (!spokenText) {
      onSpeakingChange?.(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.96;
    utterance.pitch = 1.08;
    utterance.volume = 0.86;
    utterance.onstart = () => onSpeakingChange?.(true);
    utterance.onend = () => onSpeakingChange?.(false);
    utterance.onerror = () => onSpeakingChange?.(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      onSpeakingChange?.(false);
    };
  }, [enabled, onSpeakingChange, text]);

  return null;
}
