import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import carPartsData from '@/data/car-parts.json';
import { CarPartsDatabase } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create context from the car parts database
    const database = carPartsData as CarPartsDatabase;
    const contextData = JSON.stringify(database, null, 2);

    const systemPrompt = `You are an AI assistant for "${database.shop_info.name}", an Indian auto parts and accessories shop. 

IMPORTANT INSTRUCTIONS:
1. You can ONLY provide information that exists in the provided database
2. If someone asks about parts, brands, prices, or services NOT in the database, respond with: "I don't have information about that specific item in our current inventory. Let me connect you with a human representative who can help you better."
3. Always be helpful and professional
4. Focus on understanding customer needs and matching them with available products
5. Provide specific details like brands, price ranges, compatibility, and warranty when available
6. If asked about shop information, use the shop_info section

AVAILABLE DATABASE:
${contextData}

Guidelines for responses:
- Be conversational and friendly
- Ask clarifying questions if the customer's need is unclear
- Suggest related products when appropriate
- Always mention availability, price range, and compatibility
- If customer asks about installation, mention our installation service
- For any queries outside the database scope, politely redirect to human assistance

Remember: You represent ${database.shop_info.name} and should only provide information from the database provided above.`;

    // Format conversation history for Gemini
    const chatHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(`${systemPrompt}\n\nCustomer: ${message}`);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
