import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { ChatMessage } from '../types';

let ai: GoogleGenAI;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};


export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const generateChatResponse = async (
  history: ChatMessage[],
  newMessage: string,
  imageFile: File | null,
  language: string
): Promise<{ response: string; suggestions: string[]; summary: string; }> => {
  try {
    const gemini = getAI();
    
    const userParts: any[] = [{ text: newMessage }];
    if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        userParts.push(imagePart);
    }
    
    // Filter out system messages before sending to the API
    const contents = history
      .filter(msg => msg.role === 'user' || msg.role === 'model')
      .map(msg => ({
        role: msg.role,
        parts: msg.parts.map(part => {
            if (part.text) return { text: part.text };
            if (part.inlineData) return { inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data }};
            return {};
        })
    }));

    contents.push({ role: 'user', parts: userParts });

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        response: {
          type: Type.STRING,
          description: "A comprehensive, engaging, and well-formatted response in Markdown."
        },
        summary: {
            type: Type.STRING,
            description: "A concise, 2-3 sentence summary of the main response. ONLY populate this if the user asks for a summary."
        },
        suggestions: {
          type: Type.ARRAY,
          description: "An array of 3 concise, relevant TOPICS for the user to explore next. The first two should be directly related to the content of the 'response' field. The third topic should introduce a new, interesting aspect of Karnataka's heritage.",
          items: {
            type: Type.STRING
          }
        }
      },
      required: ["response", "suggestions"]
    };
    
    const response: GenerateContentResponse = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: `You are an intelligent, friendly AI guide specialized in explaining Karnataka’s famous inscriptions and archaeological sites.

🧠 Tone:
- Use simple, engaging, human-like language.
- Write short paragraphs and use emojis naturally (🏛️📜✨).
- Always sound confident, warm, and slightly conversational.
- Format answers clearly with line breaks, **bolding** for key terms, and lists when needed. Use emojis as list markers.

🎯 Purpose:
Help users learn about Karnataka’s heritage — places like Hampi, Badami, Halebidu, Aihole, and Shravanabelagola.
Explain things like inscriptions, architecture, and history in a fun but informative tone.

💡 Style Example:
User: Tell me about Hampi.
You:
Hampi 🏛️ — once the capital of the Vijayanagara Empire!
It’s known for its stunning stone temples, carved pillars, and the famous **Stone Chariot** inside the Vittala Temple.
You can still see ancient inscriptions that describe trade, festivals, and kings’ victories.
Would you like to explore **Halebidu** next? 👀

🪄 Behavior:
- Always respond in short, clear paragraphs.
- Add emojis relevant to the topic.
- If user asks location-based info, describe it briefly and give context.
- Keep answers inspiring and easy to read.

**CRITICAL OUTPUT REQUIREMENTS:**
Your final output MUST be a valid JSON object matching the provided schema.

The 'response' field is your main canvas. It must be formatted in Markdown.
- Use **bold formatting** for critical terms, names, and locations.
- Employ bulleted lists prefixed with relevant emojis.

The 'summary' field should ONLY be populated if the user explicitly asks for a summary. Otherwise, it should be an empty string. When provided, it MUST be a concise, 2-3 sentence summary of the key info from the 'response' field.

The 'suggestions' field must contain an array of three thought-provoking, relevant, and concise follow-up TOPICS (e.g., 'Hampi Architecture', 'Udupi Cuisine') that encourage deeper exploration.

The entire JSON response must be in the language with this code: ${language}.`,
      }
    });

    const resultText = response.text.trim();
    try {
        const resultJson = JSON.parse(resultText);
        return {
            response: resultJson.response || "I'm sorry, I couldn't generate a proper response.",
            suggestions: resultJson.suggestions || [],
            summary: resultJson.summary || "",
        };
    } catch (e) {
        console.error("Error parsing JSON response from Gemini:", e);
        // Fallback if JSON is malformed
        return {
            response: resultText || "I'm sorry, I encountered a formatting error. Please try again.",
            suggestions: [],
            summary: "",
        };
    }
  } catch (error) {
    console.error("Error generating response from Gemini:", error);
    return {
        response: "I'm sorry, I encountered an error. Please try again.",
        suggestions: [],
        summary: "",
    };
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const gemini = getAI();
        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' }, // A pleasant, natural-sounding voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating speech from Gemini TTS:", error);
        return null;
    }
};