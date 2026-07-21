'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Builds the prompt that is sent to the model.
 */
function buildPrompt(userQuestion, ticketData) {
  const dataJson = JSON.stringify(ticketData);
  return (
    `You are a strict ticket analyst assistant. ` +
    `You MUST answer ONLY based on the ticket data provided below. ` +
    `Do NOT use any external knowledge, do NOT invent ticket numbers, assignees, or dates. ` +
    `If the answer cannot be determined from the provided data, say so clearly.\n\n` +
    `TICKET DATA (JSON):\n${dataJson}\n\n` +
    `USER QUESTION: ${userQuestion}\n\n` +
    `ANSWER:`
  );
}

/**
 * Sends a question + ticket data to Gemini and returns the text response.
 */
async function askGemini(userQuestion, ticketData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  // Initialize Google Gemini SDK
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = buildPrompt(userQuestion, ticketData);

  // Generate response
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const generatedText = response.text();

  if (!generatedText) {
    throw new Error('Gemini returned an empty response.');
  }

  return generatedText.trim();
}

/**
 * Sends ticket data and user request to Gemini to generate dynamic output (Chart, Table, or Text).
 */
async function generateChartConfig(userRequest, ticketData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    You are an expert Data Analyst. Analyze the following ticket data.
    The user wants specific insights. Based on the user's request: "${userRequest}", decide the BEST format to display this information (Chart, Table, or Text/Calculation) and generate a JSON response.
    
    RULES:
    1. Return ONLY a valid JSON object. Do not include markdown tags like \`\`\`json.
    2. The JSON MUST match exactly one of these three formats:
    
       Format A (For visual data like trends, breakdowns):
       {
         "type": "chart",
         "data": { <valid Apache ECharts 'option' object> }
       }
    
       Format B (For lists, raw data comparisons, or row-column data):
       {
         "type": "table",
         "data": {
           "columns": ["Assignee", "Total Tickets"],
           "rows": [["Ash", 12], ["Bilal", 2]]
         }
       }
    
       Format C (For text summaries, specific calculations, or direct answers):
       {
         "type": "text",
         "data": "The total number of P1 tickets is 15. The formula used is..."
       }

    TICKET DATA:
    ${JSON.stringify(ticketData)}
  `;

  const result = await model.generateContent(prompt);
  let generatedText = await result.response.text();

  generatedText = generatedText.trim();
  if (generatedText.startsWith('```json')) {
    generatedText = generatedText.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (generatedText.startsWith('```')) {
    generatedText = generatedText.replace(/^```/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(generatedText);
}

module.exports = { askGemini, generateChartConfig };