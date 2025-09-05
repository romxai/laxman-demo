import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import carPartsData from "@/data/car-parts.json";
import { CarPartsDatabase } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const database = carPartsData as CarPartsDatabase;
    const contextData = JSON.stringify(database, null, 2);

    // --- REVISED & MORE ROBUST SYSTEM PROMPT ---
    const systemPrompt = `You are an AI assistant for "${database.shop_info.name}", an Indian auto parts and accessories shop.

**VERY IMPORTANT INSTRUCTIONS:**
1.  **Stick to the Database:** You can ONLY provide information that exists in the provided database. Your own knowledge is forbidden.
2.  **No Inventing Details:**
    * DO NOT invent specific product lines (e.g., "Castrol Edge"). Only mention the brands listed (e.g., "Castrol").
    * DO NOT invent product specifications like viscosity (e.g., "5W-30"). If it's not in the database, you don't know it.
    * DO NOT invent specific car models. If a user says "Honda," refer to "your Honda," not a "Honda Civic."
3.  **Handle Price Ranges Correctly:**
    * If a product has a "price_range," you MUST ALWAYS state the full range.
    * DO NOT invent a specific price from within the range. If a customer asks for a final cost, explain that the exact price depends on the specific item chosen in-store.
4.  **CRITICAL FALLBACK AND COMPATIBILITY RULE:**
    * Before deciding you don't have information, you MUST check the item's 'compatibility' list.
    * If the list contains the phrase "All vehicles", you MUST confirm the part is compatible with the user's car brand (like Bugatti, Ford, etc.).
    * You should ONLY use the fallback response if the specific brand is not in the compatibility list AND the list DOES NOT contain "All vehicles".
    * **Fallback Response:** "I'm sorry, but it looks like we don't carry that specific item for your vehicle. Would you like me to connect you with a human representative who can check other options?"

AVAILABLE DATABASE:
${contextData}

Guidelines for responses:
- Be conversational and friendly.
- When confirming an "All vehicles" part, mention it clearly. For example: "Yes, our seat covers are compatible with all vehicles, so they should fit your Bugatti well."
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const chatHistory = history.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Extract any URLs the assistant included in its own response text.
    // We will ONLY return images that Gemini itself provided (via links in the text).
    const urlRegex =
      /(https?:\/\/[\w\-./?=&%#:+,~\[\]\(\)]+?)(?=[\s\)\]\n]|$)/g;
    const matches = text.match(urlRegex) || [];
    // Filter to common image extensions and also allow generic links (the client will try to load them).
    const imageUrls = matches.filter(
      (u) =>
        /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(u) || /\/documents\//i.test(u)
    );

    // If Gemini included links but none look like images, still include raw links (user requested them).
    const finalImageUrls = imageUrls.length > 0 ? imageUrls : matches;

    return NextResponse.json({ message: text, imageUrls: finalImageUrls });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
