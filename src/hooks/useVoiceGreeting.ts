import { useEffect, useRef } from 'react';

export function useVoiceGreeting(displayName: string | null | undefined) {
  const hasGreeted = useRef(false);

  useEffect(() => {
    if (hasGreeted.current || !displayName) return;
    if (!('speechSynthesis' in window)) return;

    hasGreeted.current = true;

    const hour = new Date().getHours();
    let greeting: string;
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    const text = `${greeting}, ${displayName}. Welcome back!`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    // Small delay for smoother UX
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 800);
  }, [displayName]);
}
