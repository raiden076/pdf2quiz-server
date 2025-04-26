const { GoogleGenAI } = require('@google/genai');
const { Type } = require('@google/genai');

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const config = {
  temperature: 0.7,
  thinkingConfig: {
    thinkingBudget: 0,
  },
  responseMimeType: 'application/json',
  responseSchema: {
    type: Type.ARRAY,
    description:
      'An array of multiple-choice quiz questions generated from PDF content.',
    items: {
      type: Type.OBJECT,
      description: 'A single multiple-choice question object.',
      required: ['questionText', 'options', 'correctAnswerIndex'],
      properties: {
        questionText: {
          type: Type.STRING,
          description: 'The text of the multiple-choice question.',
        },
        options: {
          type: Type.ARRAY,
          description:
            'An array of exactly 4 possible answers for the question.',
          items: {
            type: Type.STRING,
          },
        },
        correctAnswerIndex: {
          type: Type.INTEGER,
          description:
            'The 0-based index of the correct answer within the options array.',
        },
      },
    },
  },
};
const model = 'gemini-2.5-flash-preview-04-17';
const prompt = `Based *only* on the content of the provided PDF file, generate exactly 10 multiple-choice quiz questions. For each question, provide: question text, an array of 4 options, and the 0-based index of the correct answer. Return ONLY a valid JSON array of 10 objects: [{"questionText": "...", "options": ["A", "B", "C", "D"], "correctAnswerIndex": N}]. If fewer than 10 questions can be generated, return as many as possible in the correct format. If none, return [].`;

const generateQuizFromGeminiFileWorker = async (geminiFile) => {
  if (!geminiFile?.uri) throw new Error('Invalid Gemini file object provided.');
  const contents = [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: geminiFile.uri,
            mimeType: geminiFile.mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  ];
  console.log(
    `WORKER: Sending URI ${geminiFile.name} to Gemini for generation...`,
  );
  try {
    const response = await gemini.models.generateContent({
      model,
      config,
      contents,
    });
    if (
      !response?.candidates?.length ||
      !response.candidates[0].content?.parts?.length ||
      !response.candidates[0].content.parts[0].text
    ) {
      // Check for block reasons if response exists but content is missing
      if (response?.promptFeedback?.blockReason) {
        throw new Error(
          `Quiz generation blocked by Gemini: ${response.promptFeedback.blockReason}`,
        );
      }
      console.error(
        'WORKER: Unexpected Gemini response structure:',
        JSON.stringify(response, null, 2),
      );
      throw new Error(
        'Received invalid or empty response structure from Gemini.',
      );
    }
    const jsonResponseText =
      response.candidates[0].content.parts[0].text.trim();
    console.log('WORKER: Received JSON Text from Gemini:', jsonResponseText);
    const questions = JSON.parse(jsonResponseText);
    if (!Array.isArray(questions))
      throw new Error(
        'Received invalid or empty response structure from Gemini.',
      );
    if (
      questions.length > 0 &&
      (typeof questions[0].questionText !== 'string' ||
        !Array.isArray(questions[0].options) ||
        questions[0].options.length !== 4 ||
        typeof questions[0].correctAnswerIndex !== 'number')
    ) {
      throw new Error(
        'Received invalid or empty response structure from Gemini.',
      );
    }
    console.log(`WORKER: Successfully parsed ${questions.length} questions.`);
    return questions;
  } catch (error) {
    console.error('WORKER: Error generating quiz:', error);
    throw new Error(`Gemini generation/parsing failed: ${error.message}`);
  }
};

const uploadToGemini = async (filePath) => {
  try {
    console.log(`WORKER: Uploading ${filePath} to Gemini File API...`);

    const geminiUploadedFile = await gemini.files.upload({
      file: filePath,
    });
    console.log(
      `WORKER: Gemini upload complete. URI: ${geminiUploadedFile.uri}, Name: ${geminiUploadedFile.name}`,
    );

    return geminiUploadedFile;
  } catch (error) {
    console.error('WORKER: Error uploading file to Gemini:', error);
    throw new Error(`Gemini upload failed: ${error.message}`);
  }
};

const deleteGemeiniFile = async (geminiFile) => {
  try {
    console.log(`WORKER: Deleting Gemini file ${geminiFile.name}...`);
    await gemini.files.delete({ name: geminiFile.name });
    console.log(`WORKER: Gemini file ${geminiFile.name} deleted.`);
  } catch (error) {
    console.error('WORKER: Error deleting Gemini file:', error);
    throw new Error(`Gemini file deletion failed: ${error.message}`);
  }
};
// test uploadToGemini and deleteGemeiniFile
// console.log(GEMINI_API_KEY);
// console.log(gemini);
// uploadToGemini('./server.js').then((geminiFile) => {
//   console.log(geminiFile);
//   deleteGemeiniFile(geminiFile);
// });

module.exports = {
  generateQuizFromGeminiFileWorker,
  uploadToGemini,
  deleteGemeiniFile,
};
