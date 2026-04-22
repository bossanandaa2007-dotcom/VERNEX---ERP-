import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { appendAttendanceConfirmation } from './attendanceDb.js';
import { createComplaint, getComplaints, resolveComplaint } from './complaintDb.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = Number(process.env.PORT || 5000);
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModelName = 'gemini-1.5-flash';

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

const attendancePrompt = `
Extract attendance from this table image.

Return strict JSON only with this shape:
{
  "students": [
    {
      "studentName": "string",
      "attendance": ["P","A","P","A","P"]
    }
  ]
}
Rules:
- Only read table
- Only return P or A
- Max 5 students
- Max 5 days
- No explanation
`.trim();

function getGeminiClient() {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add GEMINI_API_KEY to the project .env file.');
  }

  return new GoogleGenerativeAI(geminiApiKey);
}

function getGeminiModel() {
  try {
    const client = getGeminiClient();
    return client.getGenerativeModel({ model: geminiModelName });
  } catch (error) {
    console.error('Gemini model initialization failed:', error);
    throw new Error(`Invalid Gemini model configuration: ${geminiModelName}`);
  }
}

function parseGeminiJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

function resolveComplaintTargetRole(targetId) {
  if (!targetId) {
    return 'Unknown';
  }

  if (targetId.toLowerCase().startsWith('t')) {
    return 'Teacher';
  }

  if (targetId.toLowerCase() === 'u2') {
    return 'Governing Body';
  }

  return 'Unknown';
}

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/complaints', async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      class: className,
      section,
      division,
      title,
      description,
      type,
      targetId,
      priority,
    } = req.body ?? {};

    if (!studentId || !studentName || !className || !section || !division || !title || !description || !type || !targetId || !priority) {
      return res.status(400).json({ error: 'Missing required complaint fields.' });
    }

    const complaint = await createComplaint({
      studentId,
      studentName,
      class: className,
      section,
      division,
      title,
      description,
      type,
      targetId,
      targetRole: resolveComplaintTargetRole(targetId),
      priority,
    });

    return res.status(201).json({ complaint });
  } catch (error) {
    console.error('POST /api/complaints failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create complaint.',
    });
  }
});

app.get('/api/complaints', async (req, res) => {
  try {
    const { targetId, studentId, targetRole } = req.query;
    const complaints = await getComplaints({
      targetId: typeof targetId === 'string' ? targetId : undefined,
      studentId: typeof studentId === 'string' ? studentId : undefined,
      targetRole: typeof targetRole === 'string' ? targetRole : undefined,
    });

    return res.json({ complaints });
  } catch (error) {
    console.error('GET /api/complaints failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch complaints.',
    });
  }
});

app.post('/api/complaints/:id/resolve', async (req, res) => {
  try {
    const complaint = await resolveComplaint(req.params.id, req.body?.response);
    return res.json({ complaint });
  } catch (error) {
    console.error('POST /api/complaints/:id/resolve failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to resolve complaint.',
    });
  }
});

app.post('/api/ai-attendance', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image upload is required.' });
    }

    const model = getGeminiModel();
    const imageBase64 = req.file.buffer.toString('base64');

    let result;
    try {
      result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: imageBase64,
                },
              },
              { text: attendancePrompt },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Gemini generateContent failed:', error);
      const message = error instanceof Error ? error.message : 'Gemini request failed.';
      if (message.toLowerCase().includes('model')) {
        throw new Error(`Gemini model failed: ${geminiModelName}. Verify the model name is supported by the installed SDK.`);
      }
      throw new Error(message);
    }

    const responseText = result.response.text();
    console.log('Gemini raw response:', responseText);

    let parsed;
    try {
      parsed = parseGeminiJson(responseText);
      console.log('Gemini parsed JSON:', parsed);
    } catch (error) {
      console.error('Gemini JSON parse failed:', error);
      return res.status(502).json({
        error: 'Failed to parse Gemini response as JSON.',
        rawResponse: responseText,
      });
    }

    return res.json({
      preview: true,
      source: 'gemini',
      data: parsed,
    });
  } catch (error) {
    console.error('POST /api/ai-attendance failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process AI attendance.',
    });
  }
});

app.post('/api/confirm-attendance', async (req, res) => {
  try {
    const { sectionId, attendanceDate, students } = req.body ?? {};

    if (!sectionId || !attendanceDate || !Array.isArray(students)) {
      return res.status(400).json({
        error: 'sectionId, attendanceDate, and students are required.',
      });
    }

    const savedRecord = await appendAttendanceConfirmation({
      sectionId,
      attendanceDate,
      students,
    });

    return res.status(201).json({
      saved: true,
      record: savedRecord,
    });
  } catch (error) {
    console.error('POST /api/confirm-attendance failed:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save attendance.',
    });
  }
});

app.listen(port, () => {
  console.log(`AI attendance backend listening on http://localhost:${port}`);
});
