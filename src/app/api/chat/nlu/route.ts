import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ConversationSlots {
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
  };
  product_type?: string;
  color?: string;
  intent?: "search_product" | "get_info" | "clarify" | "general";
  missing_info?: string[];
  confidence?: "high" | "medium" | "low";
}

export interface NLUReponse {
  slots: ConversationSlots;
  needs_clarification: boolean;
  clarification_question?: string;
  raw_intent: string;
  extracted_entities: Record<string, any>;
}

const VEHICLE_MAKES = [
  "Hyundai", "Maruti", "Toyota", "Honda", "Mahindra", "Tata", "Kia", "Ford",
  "Renault", "Nissan", "Jeep", "Skoda", "Volkswagen", "MG", "Audi", "BMW"
];

const PRODUCT_CATEGORIES = [
  "Android Screen", "Speaker", "Mats", "Car Charger", "Memory Foam",
  "USB Cable", "Camera", "Tyre Inflator", "Vacuum Cleaner", "BTFM",
  "Steering Cover", "Lumiere LED", "PrismX LED", "Damping Sheet", "Car Care Kit"
];

const COLORS = [
  "Black", "White", "Red", "Blue", "Grey", "Beige", "Brown", "Silver", "Green"
];

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_history = [] } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert NLU (Natural Language Understanding) system for an Indian auto parts chatbot.

Your task is to extract structured information from user messages and maintain conversation context.

**VEHICLE INFORMATION TO EXTRACT:**
- Make: ${VEHICLE_MAKES.join(", ")}
- Model: Extract the specific model name
- Year: Extract the manufacturing year (usually 4 digits)

**PRODUCT INFORMATION TO EXTRACT:**
- Product Type: ${PRODUCT_CATEGORIES.join(", ")}
- Color: ${COLORS.join(", ")}

**INTENT CLASSIFICATION:**
- search_product: User wants to find/buy a product
- get_info: User asking for information about products/services
- clarify: User responding to a clarification question
- general: General conversation or unclear intent

**RESPONSE FORMAT:**
Return a JSON object with this exact structure:
{
  "slots": {
    "vehicle": {
      "make": "Hyundai",
      "model": "Creta",
      "year": 2020
    },
    "product_type": "Android Screen",
    "color": "black",
    "intent": "search_product",
    "missing_info": ["year"],
    "confidence": "high"
  },
  "needs_clarification": false,
  "clarification_question": "Which year is your Hyundai Creta?",
  "raw_intent": "user wants android screen for creta",
  "extracted_entities": {
    "vehicle_make": "Hyundai",
    "vehicle_model": "Creta",
    "product_category": "Android Screen"
  }
}

**IMPORTANT RULES:**
1. Handle Hinglish and mixed languages naturally
2. Extract information even from incomplete sentences
3. Use conversation history to fill missing slots
4. Set needs_clarification=true if critical information is missing
5. Be flexible with spelling variations and common abbreviations
6. For vehicle models, handle common variations (e.g., "ertiga" = "Ertiga")
7. If user mentions "screen", map to "Android Screen"
8. If user mentions "mat" or "carpet", map to "Mats"
9. If user mentions "speaker" or "music system", map to "Speaker"

**CONVERSATION CONTEXT:**
Use the conversation history to maintain context across messages. If previous messages contain information that fills current slots, include it in the response.

**CLARIFICATION LOGIC:**
- If vehicle make/model is clear but year is missing, ask for year
- If product type is clear but vehicle info is missing, ask for vehicle
- If multiple interpretations possible, ask for clarification
- Don't ask for non-critical information like color unless specifically needed

Analyze this message and extract the structured information:`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    // Build conversation context
    const conversationContext = conversation_history
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const fullPrompt = `Conversation History:
${conversationContext}

Current Message: "${message}"

Extract structured information from the current message, using conversation history to fill any missing context.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let parsedResponse: NLUReponse;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      parsedResponse = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!parsedResponse.slots) {
        parsedResponse.slots = {};
      }

      if (!parsedResponse.needs_clarification) {
        parsedResponse.needs_clarification = false;
      }

    } catch (error) {
      console.error("Error parsing Gemini NLU response:", error);
      console.log("Raw response:", text);

      // Fallback response
      parsedResponse = {
        slots: {
          intent: "general",
          confidence: "low"
        },
        needs_clarification: true,
        clarification_question: "I'm sorry, I didn't understand that clearly. Could you please rephrase your question?",
        raw_intent: "unclear",
        extracted_entities: {}
      };
    }

    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error("Error in NLU API:", error);
    return NextResponse.json(
      { error: "Failed to process NLU request" },
      { status: 500 }
    );
  }
}