// Speech recognition and synthesis utilities

export interface SpeechConfig {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
}

let recognitionInstance: any = null;

export function initializeSpeechRecognition(): any {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported');
    return null;
  }

  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = false;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = 'en-US';

  return recognitionInstance;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
}

export function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  
  // Prefer natural, high-quality English voices
  const preferredVoices = [
    'Google US English',
    'Microsoft Zira Desktop',
    'Alex',
    'Samantha',
  ];

  for (const preferred of preferredVoices) {
    const voice = voices.find((v) => v.name.includes(preferred));
    if (voice) return voice;
  }

  // Fallback to first English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en'));
  return englishVoice || voices[0] || null;
}

export function speak(
  text: string,
  config: SpeechConfig,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): void {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  if (config.voice) {
    utterance.voice = config.voice;
  }
  
  utterance.rate = config.rate;
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;

  utterance.onstart = () => {
    console.log('Speech started:', text);
    onStart?.();
  };

  utterance.onend = () => {
    console.log('Speech ended');
    onEnd?.();
  };

  utterance.onerror = (error) => {
    console.error('Speech error:', error);
    onError?.(error);
  };

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  window.speechSynthesis.cancel();
}

export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
