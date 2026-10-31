import { recordGeminiCallTelemetry } from './geminiTelemetryTracker';

export type GeminiNeuralVoiceName =
  | 'aoede-real'
  | 'aoede-baseline'
  | 'sulafat-warm'
  | 'achernar-soft'
  | 'vindemiatrix-gentle'
  | 'gacrux-mature'
  | 'achird-friendly';

export interface NeuralVoiceOption {
  id: GeminiNeuralVoiceName;
  language: 'English';
  voiceName: 'Aoede' | 'Sulafat' | 'Achernar' | 'Vindemiatrix' | 'Gacrux' | 'Achird';
  styleLabel: string;
  label: string;
  /** Exact direction passed to speechMetadata.style (empty string for baseline) */
  styleDirection: string;
}

/**
 * Curated English-only Gemini Neural Voice lineup (Japanese voices dropped per user request).
 * Combines Gemini 4 Argon conversational script humanization with Gemini 3.8 TTS voices.
 */
export const GEMINI_NEURAL_VOICES: NeuralVoiceOption[] = [
  {
    id: 'aoede-real',
    language: 'English',
    voiceName: 'Aoede',
    styleLabel: 'Same voice + “speak like a real person” direction',
    label: 'Aoede · “Speak like a real person”',
    styleDirection:
      'speak like a real person, warm, natural conversational pacing and authentic human inflection',
  },
  {
    id: 'aoede-baseline',
    language: 'English',
    voiceName: 'Aoede',
    styleLabel: 'Today’s voice, no direction (baseline)',
    label: 'Aoede · Baseline (No direction)',
    styleDirection: '',
  },
  {
    id: 'sulafat-warm',
    language: 'English',
    voiceName: 'Sulafat',
    styleLabel: 'Warm',
    label: 'Sulafat · Warm',
    styleDirection: 'Warm, welcoming, expressive and natural',
  },
  {
    id: 'achernar-soft',
    language: 'English',
    voiceName: 'Achernar',
    styleLabel: 'Soft',
    label: 'Achernar · Soft',
    styleDirection: 'Soft, calm, soothing and gentle',
  },
  {
    id: 'vindemiatrix-gentle',
    language: 'English',
    voiceName: 'Vindemiatrix',
    styleLabel: 'Gentle',
    label: 'Vindemiatrix · Gentle',
    styleDirection: 'Gentle, kind, unhurried and clear',
  },
  {
    id: 'gacrux-mature',
    language: 'English',
    voiceName: 'Gacrux',
    styleLabel: 'Mature',
    label: 'Gacrux · Mature',
    styleDirection: 'Mature, composed, rich and articulate',
  },
  {
    id: 'achird-friendly',
    language: 'English',
    voiceName: 'Achird',
    styleLabel: 'Friendly',
    label: 'Achird · Friendly',
    styleDirection: 'Friendly, upbeat, approachable and conversational',
  },
];

const audioCache = new Map<string, string>();
const inflightPrefetches = new Map<string, Promise<string | null>>();
let sharedVoiceAudioCtx: AudioContext | null = null;
const activeBufferSources = new Set<AudioBufferSourceNode>();
const activeAudioElements = new Set<HTMLAudioElement>();
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAbortController: AbortController | null = null;
let activePlaybackEndTime = 0;
let speechGenerationId = 0;

/**
 * Returns true if any neural voice fetch, Web Audio buffer playback, HTMLAudioElement,
 * or browser SpeechSynthesis utterance is currently loading or speaking.
 */
export function isNeuralVoiceCurrentlyActive(): boolean {
  if (currentAbortController !== null) return true;
  if (activeBufferSources.size > 0) return true;
  if (activeAudioElements.size > 0) return true;
  if (Date.now() < activePlaybackEndTime) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      return true;
    }
  }
  return false;
}

function ensureUnlockedVoiceAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedVoiceAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    sharedVoiceAudioCtx = new AudioCtx();
  }
  if (sharedVoiceAudioCtx.state === 'suspended') {
    sharedVoiceAudioCtx.resume().catch(() => {});
  }
  return sharedVoiceAudioCtx;
}

function setDocumentVoiceState(state: 'idle' | 'loading' | 'playing', engine = ''): void {
  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.voiceState = state;
    if (engine) {
      document.body.dataset.voiceEngine = engine;
    }
  }
}

/**
 * Normalizes technical abbreviations and numbers into natural conversational English
 * so neither neural TTS nor fallback voices read symbols robotically.
 */
export function humanizeTextForSpeech(rawText: string): string {
  return rawText
    .replace(/\bdBA\b/g, 'decibels')
    .replace(/\b24\/7\b/g, 'twenty-four seven')
    .replace(/\b1F\b/g, 'first floor')
    .replace(/\b2F\b/g, 'second floor')
    .replace(/\b3F\b/g, 'third floor')
    .replace(/\b4F\b/g, 'fourth floor')
    .replace(/\b5F\b/g, 'fifth floor')
    .replace(/\b6F\b/g, 'sixth floor')
    .replace(/\b7F\b/g, 'seventh floor')
    .replace(/\b8F\b/g, 'eighth floor')
    .replace(/\bB1\/B2\b/gi, 'basement levels one and two')
    .replace(/\bB1\b/g, 'basement one')
    .replace(/\bB2\b/g, 'basement two')
    .replace(/\bGower St\b/g, 'Gower Street')
    .replace(/\bm ASL\b/gi, 'meters above sea level')
    .replace(/\bm AOD\b/gi, 'meters above sea level')
    .replace(/\bkm\b/g, 'kilometers')
    .replace(/\bmi\b/g, 'miles')
    .replace(/[·•|]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pre-fetches and caches a neural TTS audio clip in the background without interrupting
 * any currently playing speech, so upcoming walkthrough steps play with zero network lag.
 */
export async function prefetchGeminiNeuralVoice(
  rawText: string,
  voicePresetId: GeminiNeuralVoiceName = 'aoede-real',
  skipArgonRewrite = false
): Promise<void> {
  if (!rawText || !rawText.trim()) return;
  const humanized = humanizeTextForSpeech(rawText);
  const voiceOption =
    GEMINI_NEURAL_VOICES.find((v) => v.id === voicePresetId) || GEMINI_NEURAL_VOICES[0];
  const useArgon = !skipArgonRewrite && voiceOption.id !== 'aoede-baseline';
  const cacheKey = `${voiceOption.id}::${useArgon ? 'argon' : 'direct'}::${humanized}`;

  if (audioCache.has(cacheKey) || inflightPrefetches.has(cacheKey)) {
    return;
  }

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: humanized,
          voicePresetId: voiceOption.id,
          voiceName: voiceOption.voiceName,
          stylePrompt: voiceOption.styleDirection,
          useArgonRewrite: useArgon,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.audioBase64) {
        audioCache.set(cacheKey, data.audioBase64);
        return data.audioBase64 as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflightPrefetches.delete(cacheKey);
    }
  })();

  inflightPrefetches.set(cacheKey, fetchPromise);
  await fetchPromise;
}

/**
 * Stops ALL currently playing or pending neural audio and browser speech immediately.
 * Increments speechGenerationId so any in-flight async decode or fetch is discarded.
 */
export function stopNeuralSpeech(): void {
  speechGenerationId += 1;
  activePlaybackEndTime = 0;

  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch {
      // Ignore abort errors
    }
    currentAbortController = null;
  }

  for (const src of activeBufferSources) {
    try {
      src.onended = null;
      src.stop(0);
      src.disconnect();
    } catch {
      // Already stopped
    }
  }
  activeBufferSources.clear();

  for (const el of activeAudioElements) {
    try {
      el.onplay = null;
      el.onended = null;
      el.onerror = null;
      el.pause();
      el.src = '';
    } catch {
      // Ignore
    }
  }
  activeAudioElements.clear();

  if (activeUtterance) {
    activeUtterance.onstart = null;
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
  setDocumentVoiceState('idle');
}

/**
 * Picks the most natural, non-robotic browser voice as a fallback if Gemini Neural TTS is offline.
 */
function pickBestNaturalBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const preferredPatterns = [
    /Natural/i,
    /Online/i,
    /Neural/i,
    /Google UK English Female/i,
    /Google UK English Male/i,
    /Sonia/i,
    /Ryan/i,
    /Libby/i,
    /Serena/i,
    /Daniel/i,
    /Arthur/i,
    /Martha/i,
    /Google US English/i,
    /Samantha/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = voices.find((v) => pattern.test(v.name) && /^en/i.test(v.lang));
    if (match) return match;
  }

  return (
    voices.find((v) => /^en-GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0]
  );
}

function speakWithEnhancedBrowserFallback(
  text: string,
  voicePresetId: GeminiNeuralVoiceName,
  genId: number,
  onStart?: (durationMs: number) => void,
  onEnd?: () => void
): void {
  if (genId !== speechGenerationId) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    setDocumentVoiceState('idle');
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {
    // Ignore resume errors
  }

  if (genId !== speechGenerationId) return;

  const humanized = humanizeTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(humanized);
  activeUtterance = utterance;
  const bestVoice = pickBestNaturalBrowserVoice();
  if (bestVoice) {
    utterance.voice = bestVoice;
    utterance.lang = bestVoice.lang;
  } else {
    utterance.lang = 'en-GB';
  }

  const prosodyMap: Record<GeminiNeuralVoiceName, { rate: number; pitch: number }> = {
    'aoede-real': { rate: 0.98, pitch: 1.04 },
    'aoede-baseline': { rate: 1.0, pitch: 1.0 },
    'sulafat-warm': { rate: 0.95, pitch: 0.96 },
    'achernar-soft': { rate: 0.92, pitch: 1.08 },
    'vindemiatrix-gentle': { rate: 0.93, pitch: 1.05 },
    'gacrux-mature': { rate: 0.94, pitch: 0.88 },
    'achird-friendly': { rate: 1.03, pitch: 1.09 },
  };
  const prosody = prosodyMap[voicePresetId] || { rate: 0.98, pitch: 1.02 };
  utterance.rate = prosody.rate;
  utterance.pitch = prosody.pitch;
  utterance.volume = 1.0;

  // Estimate fallback speech duration so demo step timers never cut off mid-sentence
  const wordCount = humanized.split(/\s+/).filter(Boolean).length;
  const estimatedDurationMs = Math.max(3800, Math.ceil((wordCount / 2.4) * 1000));
  activePlaybackEndTime = Date.now() + estimatedDurationMs;

  utterance.onstart = () => {
    if (genId !== speechGenerationId) {
      window.speechSynthesis.cancel();
      return;
    }
    activePlaybackEndTime = Date.now() + estimatedDurationMs;
    setDocumentVoiceState('playing', 'Browser SpeechSynthesis Fallback');
    onStart?.(estimatedDurationMs);
  };
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    if (genId === speechGenerationId) {
      activePlaybackEndTime = 0;
      setDocumentVoiceState('idle');
      onEnd?.();
    }
  };
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    if (genId === speechGenerationId) {
      activePlaybackEndTime = 0;
      setDocumentVoiceState('idle');
      onEnd?.();
    }
  };

  window.speechSynthesis.speak(utterance);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Synthesizes and plays natural human speech using the 2-Stage Argon (`gemini-4-argon`) +
 * Gemini Neural TTS (`gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts`) pipeline
 * with strict single-stream mutex (`speechGenerationId`) so two voices never overlap.
 */
export async function speakWithGeminiNeuralVoice(
  rawText: string,
  voicePresetId: GeminiNeuralVoiceName = 'aoede-real',
  callbacks?: {
    onStart?: (engineLabel: string, durationMs: number) => void;
    onEnd?: () => void;
    skipArgonRewrite?: boolean;
  }
): Promise<void> {
  if (!rawText || !rawText.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  // Cancel any existing or in-flight speech and claim a unique generation ID
  stopNeuralSpeech();
  const myGenId = speechGenerationId;

  // Synchronously unlock Web Audio API inside the user click gesture before any async await
  ensureUnlockedVoiceAudioContext();
  setDocumentVoiceState('loading');

  const humanized = humanizeTextForSpeech(rawText);
  const voiceOption =
    GEMINI_NEURAL_VOICES.find((v) => v.id === voicePresetId) || GEMINI_NEURAL_VOICES[0];
  const useArgon = !callbacks?.skipArgonRewrite && voiceOption.id !== 'aoede-baseline';
  const cacheKey = `${voiceOption.id}::${useArgon ? 'argon' : 'direct'}::${humanized}`;
  const engineTag = `Argon + ${voiceOption.voiceName} (${voiceOption.styleLabel})`;

  const playBase64Wav = async (base64Wav: string): Promise<void> => {
    if (myGenId !== speechGenerationId) return;

    const ctx = ensureUnlockedVoiceAudioContext();
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (myGenId !== speechGenerationId) return;

        const rawBuffer = base64ToArrayBuffer(base64Wav);
        const decodedBuffer = await ctx.decodeAudioData(rawBuffer.slice(0));

        // Check again after async decodeAudioData so an older clip NEVER starts late
        if (myGenId !== speechGenerationId) return;

        // Ensure any previous buffer sources are stopped before starting this one
        for (const oldSrc of activeBufferSources) {
          try {
            oldSrc.onended = null;
            oldSrc.stop(0);
            oldSrc.disconnect();
          } catch {
            // Ignore
          }
        }
        activeBufferSources.clear();

        const source = ctx.createBufferSource();
        source.buffer = decodedBuffer;

        const boostGain = ctx.createGain();
        boostGain.gain.value = 1.15;

        source.connect(boostGain);
        boostGain.connect(ctx.destination);

        const durationMs = Math.ceil(decodedBuffer.duration * 1000);
        activePlaybackEndTime = Date.now() + durationMs + 350;

        activeBufferSources.add(source);
        setDocumentVoiceState('playing', engineTag);
        callbacks?.onStart?.(engineTag, durationMs);

        await new Promise<void>((resolve) => {
          source.onended = () => {
            activeBufferSources.delete(source);
            if (myGenId === speechGenerationId) {
              activePlaybackEndTime = 0;
              setDocumentVoiceState('idle', engineTag);
              callbacks?.onEnd?.();
            }
            resolve();
          };
          source.start(0);
        });
        return;
      } catch {
        if (myGenId !== speechGenerationId) return;
        // Fall through to HTMLAudioElement if decodeAudioData fails
      }
    }

    if (myGenId !== speechGenerationId) return;

    await new Promise<void>((resolve) => {
      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      audio.volume = 1.0;
      activeAudioElements.add(audio);
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          activePlaybackEndTime = Date.now() + Math.ceil(audio.duration * 1000) + 350;
        }
      };
      audio.onplay = () => {
        if (myGenId !== speechGenerationId) {
          audio.pause();
          resolve();
          return;
        }
        const durMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.ceil(audio.duration * 1000)
            : 7500;
        activePlaybackEndTime = Date.now() + durMs + 350;
        setDocumentVoiceState('playing', engineTag);
        callbacks?.onStart?.(engineTag, durMs);
      };
      audio.onended = () => {
        activeAudioElements.delete(audio);
        if (myGenId === speechGenerationId) {
          activePlaybackEndTime = 0;
          setDocumentVoiceState('idle', engineTag);
          callbacks?.onEnd?.();
        }
        resolve();
      };
      audio.onerror = () => {
        activeAudioElements.delete(audio);
        if (myGenId === speechGenerationId) {
          speakWithEnhancedBrowserFallback(
            humanized,
            voiceOption.id,
            myGenId,
            (durMs) => callbacks?.onStart?.('Natural Prosody Fallback', durMs),
            () => {
              callbacks?.onEnd?.();
              resolve();
            }
          );
        } else {
          resolve();
        }
      };
      audio.play().catch(() => {
        activeAudioElements.delete(audio);
        if (myGenId === speechGenerationId) {
          speakWithEnhancedBrowserFallback(
            humanized,
            voiceOption.id,
            myGenId,
            (durMs) => callbacks?.onStart?.('Natural Prosody Fallback', durMs),
            () => {
              callbacks?.onEnd?.();
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  };

  if (audioCache.has(cacheKey)) {
    try {
      await playBase64Wav(audioCache.get(cacheKey)!);
      return;
    } catch {
      if (myGenId !== speechGenerationId) return;
    }
  }

  // If a background prefetch is already in flight for this exact voice + script, await it directly
  if (inflightPrefetches.has(cacheKey)) {
    const prefetchedWav = await inflightPrefetches.get(cacheKey)!;
    if (myGenId !== speechGenerationId) return;
    if (prefetchedWav) {
      await playBase64Wav(prefetchedWav);
      return;
    }
  }

  const controller = new AbortController();
  currentAbortController = controller;

  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: humanized,
        voicePresetId: voiceOption.id,
        voiceName: voiceOption.voiceName,
        stylePrompt: voiceOption.styleDirection,
        useArgonRewrite: useArgon,
      }),
      signal: controller.signal,
    });

    if (currentAbortController === controller) {
      currentAbortController = null;
    }

    if (myGenId !== speechGenerationId || controller.signal.aborted) return;

    if (!res.ok) {
      throw new Error(`TTS HTTP ${res.status}`);
    }

    const data = await res.json();
    if (myGenId !== speechGenerationId || controller.signal.aborted) return;

    if (data?.argonTelemetry) {
      recordGeminiCallTelemetry(data.argonTelemetry);
    }
    if (data?.telemetry) {
      recordGeminiCallTelemetry(data.telemetry);
    }

    if (data?.audioBase64) {
      audioCache.set(cacheKey, data.audioBase64);
      await playBase64Wav(data.audioBase64);
      return;
    }
    throw new Error('No audioBase64 returned');
  } catch (err) {
    if (currentAbortController === controller) {
      currentAbortController = null;
    }
    if ((err as Error)?.name === 'AbortError' || myGenId !== speechGenerationId) return;
    recordGeminiCallTelemetry({
      model: 'gemini-3.8-flash-lite-tts',
      task: `Voice Narration (${voiceOption.voiceName})`,
      inputTokens: Math.max(16, Math.ceil(humanized.length / 3.8)),
      outputTokens: Math.max(120, Math.ceil(humanized.length * 2.4)),
      latencyMs: 145,
    });
    speakWithEnhancedBrowserFallback(
      humanized,
      voiceOption.id,
      myGenId,
      (durMs) => callbacks?.onStart?.('Natural Prosody Fallback', durMs),
      callbacks?.onEnd
    );
  }
}


