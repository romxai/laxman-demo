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
  intent?: "search_product" | "get_info" | "clarify" | "general_greeting";
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
  "Hyundai",
  "Maruti",
  "Toyota",
  "Honda",
  "Mahindra",
  "Tata",
  "Kia",
  "Ford",
  "Renault",
  "Nissan",
  "Jeep",
  "Skoda",
  "Volkswagen",
  "MG",
  "Audi",
  "BMW",
];

const PRODUCT_CATEGORIES = [
  "Android Screen",
  "Speaker",
  "Mats",
  "Car Charger",
  "Memory Foam",
  "USB Cable",
  "Camera",
  "Tyre Inflator",
  "Vacuum Cleaner",
  "BTFM",
  "Steering Cover",
  "Lumiere LED",
  "PrismX LED",
  "Damping Sheet",
  "Car Care Kit",
  "Wiper Blade",
  "Headlight",
  "LED",
];

const COLORS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Grey",
  "Beige",
  "Brown",
  "Silver",
  "Green",
  "Yellow",
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

    const systemPrompt = `You are a highly specialized Natural Language Understanding (NLU) engine. Your ONLY function is to extract structured data from the user's CURRENT message and output a single, valid JSON object.

**CORE DIRECTIVE: FOCUS ON THE LATEST USER MESSAGE.**
- The user's most recent message is the most important. If the user introduces a new topic (e.g., asks for "headlights" after discussing "mats"), you MUST discard the old topic and focus entirely on the new one. The final \`product_type\` slot must reflect the NEW topic.
- Keep relevant context like the vehicle model if it's still applicable, but always update the primary search entity (\`product_type\`).

**INTENT CLASSIFICATION:**
- search_product: The user's primary goal is to find or buy a product.
- get_info: The user is asking for general information.
- clarify: The user is directly answering a question the assistant just asked (e.g., providing a year, or saying "yes").
- general_greeting: The user is starting the conversation with a simple greeting like "hello", "hi".

**EXTRACTION RULES:**
1.  Always prioritize extracting entities from the user's latest message.
2.  Normalize product types: "screen" -> "Android Screen", "mat" -> "Mats", "led" -> "Lumiere LED". If the user says "headlight" and "led", the product_type should be "Lumiere LED".
3.  If the intent is 'general_greeting', the "slots" object should only contain the intent. All other properties inside "slots" should be null.

**CLARIFICATION LOGIC:**
- If the intent is 'search_product' but critical info (like a vehicle for a non-universal part) is missing, set \`needs_clarification\` to true and generate a polite \`clarification_question\`.

**JSON OUTPUT SCHEMA (Strict):**
You must conform to the NLUReponse interface and output ONLY the JSON object. The 'slots' property must always be present.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const conversationContext = conversation_history
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const fullPrompt = `Conversation History (for context):
${conversationContext}

Current User Message (this is your primary focus): "${message}"

Extract structured information based on the user's current message, updating slots accordingly.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    const parsedResponse: NLUReponse = JSON.parse(text);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Error in NLU API:", error);
    const fallbackResponse: NLUReponse = {
      slots: { intent: "general_greeting" },
      needs_clarification: false,
      clarification_question: "",
      raw_intent: "fallback",
      extracted_entities: {},
    };
    return NextResponse.json(fallbackResponse);
  }
}
