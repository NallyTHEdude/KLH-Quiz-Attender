import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config({
  path: "../.env",
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const aiResponse = async (questionsJSON) => {
  const prompt = `You are a helpful assistant.

You are given a JSON object where:
- Each key is a question string.
- Each value is an array of possible answer options.

Your task:
1. Identify the correct options for each question. A question can have a single or multiple correct answers.
2. Output ONLY a JSON object in the following format (no explanation, no extra text):

{
  "1": [indices of correct options],
  "2": [indices of correct options]
}

Strict rules:
- Number the questions starting from 1 in the order they appear in the input JSON.
- Indices of correct options are 0-based (first option = 0, second = 1, etc.).
- The output must be valid JSON.
- The number of keys in the output JSON MUST equal the number of questions in the input JSON. No extra or missing keys.
- Do not generate keys for questions that are not present in the input.
- If unsure, leave the array empty [].

Here is the input:
${JSON.stringify(questionsJSON)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  const answers = response.text
    .replace("```json", "")
    .replace("```", "")
    .trim();
  return JSON.parse(answers);
};
export { aiResponse };
