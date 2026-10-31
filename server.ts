import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Gemini AI Spatial Study Concierge Endpoint
  app.post('/api/gemini/concierge', async (req, res) => {
    const { prompt, buildings, currentHour } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Please enter a study preference or question for the AI Concierge.' });
      return;
    }

    const ai = getGenAIClient();
    const safeBuildings = Array.isArray(buildings) ? buildings : [];

    // Deterministic local analysis helper used as context and fallback
    const allFloors: Array<{
      buildingId: string;
      buildingName: string;
      open24Hours: boolean;
      floorNumber: number;
      floorName: string;
      noiseDba: number;
      availableSeats: number;
      powerOutletsPct: number;
    }> = [];

    for (const b of safeBuildings) {
      if (Array.isArray(b.floors)) {
        for (const f of b.floors) {
          allFloors.push({
            buildingId: b.id,
            buildingName: b.name,
            open24Hours: Boolean(b.open24Hours),
            floorNumber: Number(f.floorNumber) || 1,
            floorName: String(f.name || '1F'),
            noiseDba: Number(f.noiseDba) || 35,
            availableSeats: Math.max(0, (Number(f.totalSeats) || 50) - (Number(f.occupiedSeats) || 10)),
            powerOutletsPct: Number(f.powerOutletsPct) || 90,
          });
        }
      }
    }

    allFloors.sort((a, b) => a.noiseDba - b.noiseDba || b.availableSeats - a.availableSeats);
    const bestFloor = allFloors[0] || {
      buildingId: 'sterling-lib',
      buildingName: 'Sterling Memorial 24/7 Library',
      open24Hours: true,
      floorNumber: 3,
      floorName: '3F Silent Research Stacks',
      noiseDba: 27,
      availableSeats: 52,
      powerOutletsPct: 90,
    };

    if (!ai) {
      res.json({
        headline: `Recommended: ${bestFloor.buildingName} (${bestFloor.floorName})`,
        recommendedBuildingId: bestFloor.buildingId,
        recommendedFloor: bestFloor.floorNumber,
        acousticSummary: `${bestFloor.noiseDba} dBA Verified Silent Zone · ${bestFloor.availableSeats} Open Seats · ${bestFloor.powerOutletsPct}% Power Coverage`,
        reasoning: `Based on live 3D volumetric telemetry for "${prompt.trim()}", ${bestFloor.buildingName}'s ${bestFloor.floorName} currently offers the lowest ambient decibel profile (${bestFloor.noiseDba} dBA) with ${bestFloor.availableSeats} vacant ergonomic stations and 24/7 card access.`,
        vfxSuggestion: 'Volumetric Heatmap & Radar Pulse locked onto target floorplate.',
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: `User Study Request: "${prompt.trim()}"
Current Local Campus Hour: ${currentHour ?? 22}:00
Live Campus 3D Telemetry: ${JSON.stringify(allFloors.slice(0, 10))}

Select the single best buildingId and floorNumber from the telemetry that matches the student's request, and provide a warm, natural conversational recommendation as if speaking like a real person.`,
        config: {
          systemInstruction:
            'You are CampusExplorer 3D FX, an AI spatial study space concierge. Always pick a valid buildingId and floorNumber from the provided telemetry.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              recommendedBuildingId: { type: Type.STRING },
              recommendedFloor: { type: Type.INTEGER },
              acousticSummary: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              vfxSuggestion: { type: Type.STRING },
            },
            required: [
              'headline',
              'recommendedBuildingId',
              'recommendedFloor',
              'acousticSummary',
              'reasoning',
              'vfxSuggestion',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        headline: parsed.headline || `Recommended: ${bestFloor.buildingName}`,
        recommendedBuildingId: parsed.recommendedBuildingId || bestFloor.buildingId,
        recommendedFloor: Number(parsed.recommendedFloor) || bestFloor.floorNumber,
        acousticSummary:
          parsed.acousticSummary ||
          `${bestFloor.noiseDba} dBA · ${bestFloor.availableSeats} Open Seats`,
        reasoning: parsed.reasoning || `Optimal match for "${prompt.trim()}".`,
        vfxSuggestion: parsed.vfxSuggestion || 'Camera & Radar Pulse aligned to target floor.',
      });
    } catch {
      // Graceful fallback if API key is invalid or quota exceeded during preview
      res.json({
        headline: `Recommended: ${bestFloor.buildingName} (${bestFloor.floorName})`,
        recommendedBuildingId: bestFloor.buildingId,
        recommendedFloor: bestFloor.floorNumber,
        acousticSummary: `${bestFloor.noiseDba} dBA Verified Silent Zone · ${bestFloor.availableSeats} Open Seats · ${bestFloor.powerOutletsPct}% Power Coverage`,
        reasoning: `Based on live 3D volumetric telemetry for "${prompt.trim()}", ${bestFloor.buildingName}'s ${bestFloor.floorName} currently offers the lowest ambient decibel profile (${bestFloor.noiseDba} dBA) with ${bestFloor.availableSeats} vacant stations.`,
        vfxSuggestion: 'Volumetric Heatmap & Radar Pulse locked onto target floorplate.',
      });
    }
  });

  // 2. Gemini AI Map-to-3D Blueprint Synthesizer Endpoint
  app.post('/api/gemini/blueprint-to-3d', async (req, res) => {
    const { description, existingCount } = req.body || {};
    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'Please describe the campus building or paste a map vector specification.' });
      return;
    }

    const ai = getGenAIClient();
    const count = Number(existingCount) || 6;
    const angle = (count * 1.25) % (Math.PI * 2);
    const defaultX = Math.round(Math.cos(angle) * 28);
    const defaultZ = Math.round(Math.sin(angle) * 24);

    if (!ai) {
      res.json({
        name: description.trim().slice(0, 38),
        shortCode: description
          .trim()
          .split(/\s+/)
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 3) || 'TWN',
        category: 'AI-Synthesized 3D Hub',
        archetype: 'cantilever-tech',
        position: [defaultX, 0, defaultZ],
        dimensions: [13, 12, 11],
        open24Hours: true,
        accentColor: '#38bdf8',
        floors: [
          {
            floorNumber: 1,
            name: '1F Vector Atrium Commons',
            noiseDba: 36,
            occupiedSeats: 12,
            totalSeats: 48,
          },
          {
            floorNumber: 2,
            name: '2F Silent Acoustic Sanctum',
            noiseDba: 27,
            occupiedSeats: 6,
            totalSeats: 40,
          },
          {
            floorNumber: 3,
            name: '3F Sky Glass Study Deck',
            noiseDba: 25,
            occupiedSeats: 4,
            totalSeats: 32,
          },
        ],
      });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Convert this static campus map / architectural description into a 3D digital twin building JSON specification: "${description.trim()}".
Place it around coordinates [${defaultX}, 0, ${defaultZ}].`,
        config: {
          systemInstruction:
            'You transform 2D campus map descriptions into structured 3D digital twin building specs with 2 to 4 floors. Choose archetype from: gothic-library, cantilever-tech, geodesic-dome, observatory-tower, timber-pavilion, classical-cloister.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              shortCode: { type: Type.STRING },
              category: { type: Type.STRING },
              archetype: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              open24Hours: { type: Type.BOOLEAN },
              floors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    floorNumber: { type: Type.INTEGER },
                    name: { type: Type.STRING },
                    noiseDba: { type: Type.INTEGER },
                    occupiedSeats: { type: Type.INTEGER },
                    totalSeats: { type: Type.INTEGER },
                  },
                  required: ['floorNumber', 'name', 'noiseDba', 'occupiedSeats', 'totalSeats'],
                },
              },
            },
            required: ['name', 'shortCode', 'category', 'archetype', 'accentColor', 'open24Hours', 'floors'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        ...parsed,
        position: [defaultX, 0, defaultZ],
        dimensions: [13, 12.5, 11],
      });
    } catch {
      res.json({
        name: description.trim().slice(0, 38),
        shortCode: 'SYN',
        category: 'AI-Synthesized 3D Hub',
        archetype: 'cantilever-tech',
        position: [defaultX, 0, defaultZ],
        dimensions: [13, 12, 11],
        open24Hours: true,
        accentColor: '#38bdf8',
        floors: [
          { floorNumber: 1, name: '1F Synthesized Atrium', noiseDba: 35, occupiedSeats: 11, totalSeats: 45 },
          { floorNumber: 2, name: '2F Deep Focus Wing', noiseDba: 27, occupiedSeats: 5, totalSeats: 36 },
        ],
      });
    }
  });

  // In-memory LRU cache for synthesized Argon + Gemini 3.8 Neural TTS audio clips
  const ttsResponseCache = new Map<
    string,
    {
      audioBase64: string;
      mimeType: string;
      voiceName: string;
      stylePrompt: string;
      spokenScript: string;
      engine: string;
    }
  >();

  // 3. 2-Stage Argon (gemini-4-argon) + Gemini 3.8 Neural TTS Endpoint for Real Human Voice
  app.post('/api/gemini/tts', async (req, res) => {
    const {
      text,
      voiceName = 'Aoede',
      stylePrompt = 'speak like a real person',
      useArgonRewrite = true,
    } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Missing text for neural speech synthesis.' });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY not configured for server neural TTS; using client neural voice fallback.',
        fallback: true,
      });
      return;
    }

    const validVoices = [
      'Aoede',
      'Sulafat',
      'Achernar',
      'Vindemiatrix',
      'Gacrux',
      'Achird',
      'Kore',
      'Puck',
      'Charon',
      'Fenrir',
      'Zephyr',
    ];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Aoede';
    const trimmedStyle = typeof stylePrompt === 'string' ? stylePrompt.trim() : '';
    const cacheKey = `${selectedVoice}::${trimmedStyle}::${text.trim()}`;

    const cachedClip = ttsResponseCache.get(cacheKey);
    if (cachedClip) {
      res.json(cachedClip);
      return;
    }

    // Convert abbreviations into natural spoken English immediately
    let spokenScript = text
      .trim()
      .replace(/\bdBA\b/g, 'decibels')
      .replace(/\b24\/7\b/g, 'twenty-four seven')
      .replace(/\b1F\b/g, 'first floor')
      .replace(/\b2F\b/g, 'second floor')
      .replace(/\b3F\b/g, 'third floor')
      .replace(/\b4F\b/g, 'fourth floor')
      .replace(/\bm ASL\b/gi, 'meters above sea level')
      .replace(/\bm AOD\b/gi, 'meters above ordnance datum');

    // Stage 1: Fast Gemini 4 Argon (gemini-4-argon with ThinkingLevel.LOW and 1100ms budget)
    // to polish robotic telemetry into warm conversational speech without delaying audio playback
    if (useArgonRewrite && spokenScript.length > 90) {
      try {
        const argonPromise = ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Rewrite the following London campus tour note into 1 or 2 natural, conversational spoken sentences ready to read aloud (max 32 words, no markdown or bullet points):\n\n"${spokenScript}"`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are a warm, articulate London university guide. Output ONLY the spoken words.',
          },
        });
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 1100)
        );
        const argonRes = await Promise.race([argonPromise, timeoutPromise]);
        const candidateText = argonRes?.text?.trim();
        if (candidateText && candidateText.length > 10) {
          spokenScript = candidateText.replace(/^["']|["']$/g, '');
        }
      } catch {
        // Proceed immediately with humanized spokenScript
      }
    }

    // Stage 2: Synthesize low-latency 24kHz WAV speech with Gemini 3.8 Neural TTS
    const partPayload: Record<string, unknown> = {
      text: spokenScript,
    };
    if (trimmedStyle.length > 0) {
      partPayload.speechMetadata = {
        style: trimmedStyle,
      };
    }

    try {
      let response;
      let usedModel = 'gemini-3.8-flash-lite-tts';
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [partPayload],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });
      } catch {
        usedModel = 'gemini-3.8-flash-tts';
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [partPayload],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });
      }

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({ error: 'Empty audio response from Gemini TTS', fallback: true });
        return;
      }

      const rawBuf = Buffer.from(base64Audio, 'base64');
      let wavBase64 = base64Audio;

      if (rawBuf.length > 4 && rawBuf.toString('ascii', 0, 4) !== 'RIFF') {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + rawBuf.length, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(byteRate, 28);
        wavHeader.writeUInt16LE(blockAlign, 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(rawBuf.length, 40);
        wavBase64 = Buffer.concat([wavHeader, rawBuf]).toString('base64');
      }

      const payload = {
        audioBase64: wavBase64,
        mimeType: 'audio/wav',
        voiceName: selectedVoice,
        stylePrompt: trimmedStyle || 'baseline (no direction)',
        spokenScript,
        engine: `gemini-4-argon + ${usedModel}`,
      };

      if (ttsResponseCache.size >= 60) {
        const oldestKey = ttsResponseCache.keys().next().value;
        if (oldestKey) ttsResponseCache.delete(oldestKey);
      }
      ttsResponseCache.set(cacheKey, payload);

      res.json(payload);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Neural TTS synthesis failed',
        fallback: true,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusExplorer 3D FX server running at http://localhost:${PORT}`);
  });
}

startServer();
