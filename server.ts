import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client as per gemini-api skill
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to generate complete Bengali Classics Audio Script in Arnab's style
app.post('/api/stories/generate', async (req: Request, res: Response) => {
  try {
    const { title, author, contextPrompt, theme, uploadedStoryText, fileBase64, fileMimeType } = req.body;

    const systemPrompt = `You are a master Bengali literary audio-play director and storyteller in the exact style of '@BengaliClassicsByArnab' (Bengali Classics by Arnab).
The hallmark of this style is:
1. Deeply philosophical and introspective opening (স্বগত ভাষণ ও দার্শনিক ভূমিকা) by the narrator or author, connecting a tangible scene or sensory detail (a misty pond at dawn, shivering bamboo leaves, falling autumn fog, an old door latch, fading lantern, smell of damp soil) to the human soul, fate, memory, and the core emotional dilemma of the story.
2. Rich, evocative metaphors (অনবদ্য উপমা ও দৃশ্যকল্প) that touch the listener's heart and paint cinema inside the mind.
3. Designed specifically for a versatile solo voice storyteller (একক কথকের বহুমুখী কণ্ঠ) who shifts vocal tonality, pitch, and timbre for different characters (narrator, protagonist, cold proud antagonist, loving gentle wife, desperate peasant, arrogant landlord/manager, etc.).
4. Detailed Sound FX (প্রকৃতির সজীব শব্দসজ্জা, পদশব্দ, দরজার আওয়াজ, বৃষ্টির শব্দ) and Music cues (সেতার, বাঁশি, পিয়ানো, বিষাদময় ভায়োলিন).
5. Psychological and literary conclusion (মনস্তাত্ত্বিক উপসংহার ও সাহিত্যিক বিশ্লেষণ).

Return ONLY valid JSON with this exact structure:
{
  "title": "string (বাংলায় গল্প ও নাট্যরূপের শিরোনাম)",
  "author": "string (মূল লেখক)",
  "dramatization": "অডিও ড্রামা ফরম্যাট | Bengali Classics by Arnab অনুকরণে",
  "theme": "string (গল্পের মূলসুর)",
  "style": "একক গল্পকথকের বহুমুখী ও নাটকীয় কণ্ঠ",
  "characters": [
    { "name": "চরিত্রের নাম", "voiceDescription": "কথকের কণ্ঠের ধরন ও বাচনভঙ্গি" }
  ],
  "acts": [
    {
      "actNumber": 1,
      "actTitle": "পর্ব ১: শিরোনাম",
      "sfx": "শব্দ পরিকল্পনা ও আবহ বর্ণনা",
      "bgm": "বাদ্যযন্ত্রের সুর ও মেজাজ",
      "narratorTone": "কথকের বাচনভঙ্গি নির্দেশিকা",
      "scenes": [
        {
          "speaker": "কথক" or "চরিত্রের নাম",
          "emotion": "কণ্ঠের আবেগ/ভঙ্গি (e.g. গম্ভীর ও অন্তর্মুখী, তরুণ বয়সের আকুল কণ্ঠে, হিমশীতল ও অহংকারী)",
          "text": "বাংলায় চমৎকার সাহিত্যিক সংলাপ বা বর্ণনার বাক্যগুলো",
          "sfxCue": "ঐচ্ছিক তাৎক্ষণিক শব্দ সংকেত"
        }
      ]
    }
  ],
  "epilogue": {
    "literaryAnalysis": "গল্পের সাহিত্যিক ও মনস্তাত্ত্বিক তাৎপর্য (আর্নবের স্টাইলে অন্তিম বিশ্লেষণ)",
    "closingBGM": "ধীর ও বিষাদময় সমাপ্তি সুর"
  }
}`;

    const parts: any[] = [];
    if (fileBase64 && fileMimeType) {
      parts.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMimeType,
        },
      });
    }

    let promptText = `Please write a comprehensive audio story script for the classic Bengali story: "${title || 'একটি কালজয়ী বাংলা ছোটগল্প'}" by "${author || 'বাংলা সাহিত্যের প্রথিতযশা কথাশিল্পী'}".
Context / Instructions: ${contextPrompt || 'গল্পের সূচনা হবে একজন চিন্তাশীল কথকের মনের গভীর ভাবনার সাথে কোনো একটি বিষাদময় বা অর্থবহ প্রাকৃতিক দৃশ্যের উপমার মেলবন্ধন ঘটিয়ে।'}.
Theme: ${theme || 'জীবন, ভালোবাসা, অহংকার এবং আত্মমর্যাদা'}.`;

    if (uploadedStoryText && uploadedStoryText.trim()) {
      promptText += `\n\n--- UPLOADED STORY MANUSCRIPT / SOURCE TEXT ---\n${uploadedStoryText.slice(0, 25000)}\n--- END UPLOADED SOURCE TEXT ---\nIMPORTANT: Faithfully adapt and dramatize the uploaded story manuscript above into the audio drama. Retain the central characters, emotional conflicts, dialogues, and plot turning points from the uploaded manuscript while crafting Arnab's hallmark philosophical narrator opening, evocative metaphors, solo voice character variations, SFX/BGM sound design, and literary epilogue.`;
    } else if (fileBase64) {
      promptText += `\n\nIMPORTANT: Read the attached uploaded story document above. Faithfully adapt this uploaded story into the audio drama scenes, character dialogues, and soundscapes in Bengali Classics by Arnab style.`;
    } else {
      promptText += `\n\nEnsure deep poetic Bengali prose, vivid imagery, evocative metaphors, and voice directions for solo audio storytelling.`;
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, story: parsed });
  } catch (error: any) {
    console.error('Error generating story script:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate story script',
    });
  }
});

// API endpoint to parse uploaded story document to auto-detect title, author, synopsis, theme and excerpt
app.post('/api/stories/parse-upload', async (req: Request, res: Response) => {
  try {
    const { text, fileBase64, fileMimeType, fileName } = req.body;

    const systemPrompt = `You are an expert Bengali literary scholar and editor. Analyze the provided story text or document.
Extract or infer:
1. Title of the story (in Bengali)
2. Author of the story (in Bengali, or "অজ্ঞাতনামা কথাশিল্পী" if unknown)
3. Main theme (in Bengali, concise)
4. Opening simile or philosophical perspective prompt (in Bengali, 1-2 sentences capturing the sensory atmosphere of the beginning suitable for an Arnab-style audio drama narrator)
5. A brief clean excerpt (first 200-300 words of the text in Bengali)

Return valid JSON:
{
  "title": "string",
  "author": "string",
  "theme": "string",
  "contextPrompt": "string",
  "excerpt": "string"
}`;

    const parts: any[] = [];
    if (fileBase64 && fileMimeType) {
      parts.push({
        inlineData: {
          data: fileBase64,
          mimeType: fileMimeType,
        },
      });
    }

    let userPrompt = `File name: ${fileName || 'manuscript'}\n`;
    if (text) {
      userPrompt += `Document text excerpt:\n${text.slice(0, 10000)}\n`;
    }
    userPrompt += `\nPlease extract title, author, theme, and opening atmospheric prompt for this Bengali story.`;
    parts.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error parsing uploaded story:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to parse file' });
  }
});

// API endpoint to regenerate a specific scene, act, or philosophical opening in Arnab's style
app.post('/api/stories/regenerate-part', async (req: Request, res: Response) => {
  try {
    const {
      type, // 'scene' | 'act_narrative' | 'philosophical_intro' | 'bgm_sfx'
      storyTitle,
      author,
      currentText,
      speaker,
      emotion,
      actTitle,
      contextPrompt,
    } = req.body;

    const systemPrompt = `You are the master director and literary voice of '@BengaliClassicsByArnab' (Bengali Classics by Arnab).
Your hallmark is:
- Deeply evocative Bengali metaphors (অনবদ্য উপমা ও দৃশ্যকল্প) linking tangible sensory imagery (mist, autumn fog, dying lamp, rain on tin roof, mud, old doors) to the human soul and philosophical truth.
- Natural, poetic, yet emotionally gripping Bengali diction that touches the listener's heart.
- Seamless fit for a versatile solo audio storyteller.

Respond in JSON according to the requested type:
If type === 'scene':
{
  "text": "পুনর্লিখিত নতুন সাহিত্যিক বাক্য বা সংলাপ",
  "emotion": "কণ্ঠের আবেগ/ভঙ্গি",
  "sfxCue": "ঐচ্ছিক তাৎক্ষণিক শব্দ সংকেত"
}

If type === 'act_narrative':
{
  "actTitle": "পর্বের পরিমার্জিত আকর্ষণীয় শিরোনাম",
  "sfx": "শব্দ পরিকল্পনা ও প্রকৃতির সজীব আবহ",
  "bgm": "বাদ্যযন্ত্রের সুর ও মেজাজ",
  "narratorTone": "কথকের বাচনভঙ্গি নির্দেশ",
  "scenes": [
    {
      "speaker": "কথক বা চরিত্রের নাম",
      "emotion": "আবেগ",
      "text": "পুনর্লিখিত প্রাঞ্জল সংলাপ/বর্ণনা",
      "sfxCue": "ঐচ্ছিক সংকেত"
    }
  ]
}

If type === 'philosophical_intro':
{
  "text": "আর্নবের নিজস্ব স্টাইলে ৩-৪ লাইনের গভীর দার্শনিক সূচনা ও প্রাকৃতিক উপমার মেলবন্ধন"
}

If type === 'bgm_sfx':
{
  "bgm": "সেতার, পিয়ানো, বাঁশি বা এসরাজের বিষাদময় সুর পরিকল্পনা",
  "sfx": "প্রকৃতির সজীব শব্দসজ্জা (বৃষ্টি, কুয়াশা, কবাট, পাতা ঝরা ইত্যাদি)"
}`;

    let promptText = `গল্প: "${storyTitle || 'বাংলা ক্লাসিক'}" (লেখক: ${author || 'বাংলা কথাশিল্পী'})\nঅনুরোধ: ${type}\n`;
    if (actTitle) promptText += `অধ্যায়: ${actTitle}\n`;
    if (speaker) promptText += `চরিত্র: ${speaker} (${emotion || ''})\n`;
    if (currentText) promptText += `বর্তমান অংশ: "${currentText}"\n`;
    if (contextPrompt) promptText += `ব্যবহারকারীর বিশেষ নির্দেশ: ${contextPrompt}\n`;
    promptText += `দয়া করে '@BengaliClassicsByArnab' ধারায় অনন্য সাহিত্যিক উপমা ও আবেগময় ভাষায় এটি পুনর্লিখন করুন।`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.85,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error('Error regenerating part:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Regeneration failed' });
  }
});

// API endpoint to generate deep literary/voice commentary
app.post('/api/stories/analyze', async (req: Request, res: Response) => {
  try {
    const { storyTitle, excerpt } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `গল্প: "${storyTitle}"\nপাঠ্যাংশ: "${excerpt}"\n\nঅনুগ্রহ করে '@BengaliClassicsByArnab' ধারার একজন বিশিষ্ট সাহিত্য সমঝদার ও অডিও কথকের দৃষ্টিকোণ থেকে এই গল্পের দৃশ্যপট, উপমার জাদু, চরিত্রের অন্তর্দ্বন্দ্ব এবং বাচনভঙ্গির রূপান্তর নিয়ে একটি গভীর মনস্তাত্ত্বিক ও সাহিত্যিক বিশ্লেষণ লিখুন।`,
      config: {
        systemInstruction: 'You are an insightful Bengali literary critic and master audio voice actor.',
        temperature: 0.7,
      },
    });

    return res.json({ success: true, analysis: response.text });
  } catch (error: any) {
    console.error('Error analyzing story:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Analysis failed' });
  }
});

// In-memory cache for generated TTS audio to save API calls and quota
const ttsAudioCache = new Map<string, { audioBase64: string; sampleRate: number; mimeType: string }>();

// Quota and rate-limit tracking for Gemini TTS
let geminiTtsCooldownUntil = 0;

function parseQuotaError(err: any): { isQuota: boolean; retrySeconds: number } {
  const errStr = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
  const isQuota =
    err?.status === 'RESOURCE_EXHAUSTED' ||
    err?.code === 429 ||
    err?.status === 429 ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('quota') ||
    errStr.includes('Quota exceeded') ||
    errStr.includes('429');

  if (!isQuota) {
    return { isQuota: false, retrySeconds: 0 };
  }

  let retrySeconds = 60;
  const match = errStr.match(/retry in\s+([\d\.]+)s/i) || errStr.match(/"retryDelay":\s*"(\d+)s"/i);
  if (match && match[1]) {
    retrySeconds = Math.ceil(parseFloat(match[1]));
  }
  return { isQuota: true, retrySeconds: Math.max(15, retrySeconds) };
}

// API endpoint for Gemini Text-To-Speech with high-fidelity Bengali pronunciation
app.post('/api/tts/generate', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'Fenrir',
      characterKey = 'narrator',
      emotion = 'গম্ভীর ও প্রজ্ঞাপূর্ণ',
      speaker = 'কথক',
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const trimmedText = text.trim();
    const cacheKey = `${voiceName}_${characterKey}_${trimmedText}`;

    // 1. Check in-memory audio cache
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      return res.json({
        success: true,
        audioBase64: cached.audioBase64,
        sampleRate: cached.sampleRate,
        mimeType: cached.mimeType,
        cached: true,
      });
    }

    // 2. Check if currently in Gemini TTS quota cooldown
    const now = Date.now();
    if (now < geminiTtsCooldownUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((geminiTtsCooldownUntil - now) / 1000));
      return res.json({
        success: false,
        rateLimited: true,
        retryAfterSeconds: remainingSeconds,
        error: `Gemini TTS free-tier quota exceeded. Cooldown active for ${remainingSeconds}s. Using browser voice fallback.`,
      });
    }

    // Advanced Bengali storyteller phonetic & performance directives
    // Modeled precisely after renowned Bengali audio-drama narrator Arnab (@BengaliClassicsByArnab)
    let styleDirective =
      'Native Bengali (বাংলাদেশ ও পশ্চিমবঙ্গ) master literary audio-drama narrator. Speak in standard fluent Shuddho Bangla (প্রমিত বিশুদ্ধ বাংলা) with authentic Bengali phonetics, correct matra and juktakhor (যুক্তাক্ষর) pronunciation, nuanced breath pauses, and deep literary gravitas.';

    if (characterKey === 'narrator') {
      styleDirective +=
        ' As the introspective solo narrator, deliver with a resonant baritone, contemplative depth, evocative pauses after punctuation, and sincere poetic emotion that touches the soul.';
    } else if (characterKey === 'nishith') {
      styleDirective +=
        ' As Nishith (নিশীথ), speak with heartfelt vulnerability, youthful literary idealism, and mature introspective dignity.';
    } else if (characterKey === 'nabanita') {
      styleDirective +=
        ' As Nabanita (নবনীতা), articulate with sharp crystalline clarity, aristocratic pride, icy defiance, and unwavering tragic self-respect.';
    } else if (characterKey === 'minati') {
      styleDirective +=
        ' As Minati (মিনতি), speak with tender warmth, serene melody, humble satisfaction, and affectionate domestic sweetness.';
    } else if (characterKey === 'nirmal') {
      styleDirective +=
        ' As Nirmal (ম্যানেজার নির্মল), speak with abrasive authority, cruel condescension, and heavy arrogant timber.';
    } else if (characterKey === 'proja') {
      styleDirective +=
        ' As the peasant (প্রজা), speak with plaintive trembling desperation and raw emotional vulnerability.';
    }

    let ttsResponse;
    try {
      ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: trimmedText,
                speechMetadata: {
                  speaker: speaker,
                  style: `${styleDirective} Emotion: ${emotion}. Speak pure natural Bengali without English accent.`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });
    } catch (modelErr: any) {
      const quotaCheck = parseQuotaError(modelErr);
      if (quotaCheck.isQuota) {
        geminiTtsCooldownUntil = Date.now() + quotaCheck.retrySeconds * 1000;
        console.warn(`[Gemini TTS] Quota limit reached on primary model. Cooldown set for ${quotaCheck.retrySeconds}s.`);
        return res.json({
          success: false,
          rateLimited: true,
          retryAfterSeconds: quotaCheck.retrySeconds,
          error: `Gemini TTS quota exceeded. Resumes in ${quotaCheck.retrySeconds}s.`,
        });
      }

      // If it wasn't a quota limit error, try flash-lite-tts
      console.warn('Fallback to gemini-3.8-flash-lite-tts due to:', modelErr?.message || modelErr);
      try {
        ttsResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: trimmedText,
                  speechMetadata: {
                    speaker: speaker,
                    style: `${styleDirective} Emotion: ${emotion}. Pure Bengali pronunciation.`,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
              },
            },
          },
        });
      } catch (liteErr: any) {
        const liteQuota = parseQuotaError(liteErr);
        if (liteQuota.isQuota) {
          geminiTtsCooldownUntil = Date.now() + liteQuota.retrySeconds * 1000;
          return res.json({
            success: false,
            rateLimited: true,
            retryAfterSeconds: liteQuota.retrySeconds,
            error: `Gemini TTS quota exceeded. Resumes in ${liteQuota.retrySeconds}s.`,
          });
        }
        throw liteErr;
      }
    }

    const base64Audio = ttsResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ success: false, error: 'Audio generation yielded no data' });
    }

    // Cache the generated audio to avoid burning quota on repeats
    ttsAudioCache.set(cacheKey, {
      audioBase64: base64Audio,
      sampleRate: 24000,
      mimeType: 'audio/pcm;rate=24000',
    });

    if (ttsAudioCache.size > 300) {
      const oldestKey = ttsAudioCache.keys().next().value;
      if (oldestKey) ttsAudioCache.delete(oldestKey);
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      sampleRate: 24000,
      mimeType: 'audio/pcm;rate=24000',
    });
  } catch (error: any) {
    const quotaInfo = parseQuotaError(error);
    if (quotaInfo.isQuota) {
      geminiTtsCooldownUntil = Date.now() + quotaInfo.retrySeconds * 1000;
      return res.json({
        success: false,
        rateLimited: true,
        retryAfterSeconds: quotaInfo.retrySeconds,
        error: `Gemini TTS quota exceeded. Resumes in ${quotaInfo.retrySeconds}s.`,
      });
    }

    console.error('TTS error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Text to speech failed',
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Storyteller server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
