import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI with runtime injected API key
const ai = new GoogleGenAI();

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now(), service: 'METROPOLIS Server' });
});

// Proxy API for Gemini Multi-Turn Chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, systemInstruction, model } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Supported models per instructions:
    // - gemini-4-argon for complex tasks (Strategy & Endgame)
    // - gemini-3.8-flash for general tasks (Finance & Business)
    // - gemini-3.1-flash-lite for fast tasks (Quick Guide & Rules)
    let selectedModel = 'gemini-3.8-flash';
    if (model === 'gemini-4-argon') {
      selectedModel = 'gemini-4-argon';
    } else if (model === 'gemini-3.1-flash-lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (model) {
      selectedModel = model;
    }

    // Format messages for @google/genai
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: formattedContents,
      config: {
        systemInstruction:
          systemInstruction ||
          'Вы — официальный ИИ-советник мегаполиса METROPOLIS. Отвечайте полезно, конструктивно и на русском языке.',
      },
    });

    const reply = response.text || 'Ответ не сформирован';
    return res.json({ reply, modelUsed: selectedModel });
  } catch (error: any) {
    console.error('Error generating Gemini content:', error);
    return res.status(500).json({
      error: error.message || 'Ошибка генерации ответа в Gemini API',
    });
  }
});

// Start Express server and mount Vite middleware
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[METROPOLIS] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
