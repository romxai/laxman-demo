import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import carPartsData from "@/data/car-parts.json";
import { CarPartsDatabase } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function isTimeRelatedQuery(message: string): boolean {
  const timeKeywords = [
    "open",
    "close",
    "hours",
    "time",
    "today",
    "tomorrow",
    "now",
    "current",
    "schedule",
    "operating",
    "business",
    "available",
    "when",
    "what time",
    "opening",
    "closing",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "weekend",
    "weekday",
    "holiday",
    "aaj",
    "kal",
    "abhi",
    "samay",
    "kaun sa din",
    "kaun sa samay",
    "dokan",
    "kya samay",
    "kya ghante",
    "kab se kab tak",
    "kab khulta hai",
    "kab band hota hai",
  ];

  const lowerMessage = message.toLowerCase();
  return timeKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function getCurrentDateTimeInfo(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  };

  const formattedDateTime = now.toLocaleString("en-IN", options);
  const dayOfWeek = now.toLocaleString("en-IN", { weekday: "long" });
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return `Current Date and Time Information:
- Full DateTime: ${formattedDateTime}
- Day of Week: ${dayOfWeek}
- Current Hour: ${currentHour}:${currentMinute.toString().padStart(2, "0")}
- Unix Timestamp: ${now.getTime()}
- Timezone: IST (Indian Standard Time)

Please use this information to determine if the store is currently open or provide accurate time-related information.`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const database = carPartsData as unknown as CarPartsDatabase;
    const contextData = JSON.stringify(database, null, 2);

    // Check if the query is time-related
    const isTimeQuery = isTimeRelatedQuery(message);
    const timeContext = isTimeQuery ? `\n\n${getCurrentDateTimeInfo()}` : "";

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
    * If the list contains the phrase "All vehicles", it should be compatible with the user's car.
    * You should ONLY use the fallback response if the specific brand is not in the compatibility list AND the list DOES NOT contain "All vehicles".
    * **Fallback Response:** "I'm sorry, but it looks like we don't carry that specific item for your vehicle. Would you like me to connect you with a human representative who can check other options?"
5.  **Image Display Instructions:**
    * When talking about a product that has images in the database, include [IMAGE_PRESENT:product_id] anywhere in your response. For example: [IMAGE_PRESENT:ep001] for air filters.
    * Do NOT include actual image URLs in your responses.
    * Use ** around text to make it bold for emphasis. For example: "We offer **high-quality** air filters."
6.  **Time and Date Awareness:**
    * When users ask about store hours, current availability, or time-related questions, use the provided current date and time information to give accurate responses.
    * Compare the current time with store hours to determine if the store is open. do NOT guess or assume. Do not tell the current time just if its open or not and its timings on that day. if it is closed then tell when it will be open next.
    * Provide helpful information about when the store will open or close based on current time.
7.  **Context Information:**
    * If you do not have enough information or are unsure about the user's information, please ask the user to check what you understood or for the missing information before handing it over to a human.

AVAILABLE DATABASE:
${contextData}${timeContext}

Guidelines for responses:
- Be conversational and friendly.
- When confirming an "All vehicles" part, mention it clearly. For example: "Yes, our seat covers are compatible with all vehicles, so they should fit your Bugatti well."
- For time-related queries, be specific about current status and provide relevant timing information.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const chatHistory = history.map(
      (msg: { role: string; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    let text = response.text();

    // Look for image indicators in the response (format: [IMAGE_PRESENT:item_id])
    const imageIndicatorRegex = /\[IMAGE_PRESENT:([a-z0-9]+)\]/g;
    const imageMatches = [...text.matchAll(imageIndicatorRegex)];
    const imageUrls: string[] = [];

    // Process any image indicators and remove them from the displayed text
    if (imageMatches.length > 0) {
      for (const match of imageMatches) {
        const itemId = match[1];
        // Find the item in the database
        for (const categoryKey in database.categories) {
          const category = database.categories[categoryKey];
          const item = category.items.find((item) => item.id === itemId);
          if (item && item.images && item.images.length > 0) {
            // Add all images for this item
            imageUrls.push(...item.images);
          }
        }
      }

      // Remove the image indicators from the text
      text = text.replace(imageIndicatorRegex, "");
    }

    return NextResponse.json({ message: text, imageUrls: imageUrls });
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
