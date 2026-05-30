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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const toBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  let binary = '';

  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      return jsonResponse({ error: 'GEMINI_API_KEY is missing from Supabase Edge Function secrets.' }, 500);
    }

    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return jsonResponse({ error: 'Image upload is required.' }, 400);
    }

    const imageBase64 = await toBase64(image);
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: image.type || 'image/png',
                    data: imageBase64,
                  },
                },
                { text: attendancePrompt },
              ],
            },
          ],
        }),
      }
    );

    const geminiPayload = await geminiResponse.json();
    const rawText = geminiPayload?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!geminiResponse.ok || !rawText) {
      return jsonResponse(
        {
          error: geminiPayload?.error?.message || 'Gemini request failed.',
          rawResponse: geminiPayload,
        },
        502
      );
    }

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return jsonResponse({
      preview: true,
      source: 'gemini',
      data: parsed,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Failed to process AI attendance.',
      },
      500
    );
  }
});
