import { GoogleGenerativeAI, SchemaType, Content } from "@google/generative-ai";
import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

// --- CONFIGURATION ---
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:admin-lm@cluster0.h6ztrsg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DATABASE_NAME = "laxman_demo";
const PRODUCTS_COLLECTION = "products";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- INTERFACES ---
interface Product {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  colour: string | null;
  compatibility: Array<{
    make: string;
    model: string;
    year_from: number | null;
    year_to: number | null;
    notes: string;
  }>;
  universal: boolean;
}

interface ProductSearchArgs {
  make?: string;
  model?: string;
  year?: number;
  product_type?: string;
  color?: string;
  search_universal?: boolean;
}

interface MongoQuery {
  $and: Array<Record<string, unknown>>;
}

interface CompatibilityQuery extends Record<string, unknown> {
  "compatibility.make": { $regex: RegExp };
  "compatibility.model": { $regex: RegExp };
  "compatibility.$or"?: Array<Record<string, unknown>>;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- MAIN API HANDLER ---
export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    // --- GEMINI SETUP ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: getSystemPrompt(),
      tools: [
        {
          functionDeclarations: [
            {
              name: "product_retrieval_tool",
              description:
                "Searches the MongoDB database for car parts based on structured criteria.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  make: {
                    type: SchemaType.STRING,
                    description: "The make of the vehicle (e.g., 'Maruti').",
                  },
                  model: {
                    type: SchemaType.STRING,
                    description: "The model of the vehicle (e.g., 'Ertiga').",
                  },
                  year: {
                    type: SchemaType.NUMBER,
                    description:
                      "The manufacturing year of the vehicle (e.g., 2021).",
                  },
                  product_type: {
                    type: SchemaType.STRING,
                    description:
                      "The category of the product (e.g., 'Mats', 'Headlight'). Can also include specific product names like 'Vanilla Delight'.",
                  },
                  color: {
                    type: SchemaType.STRING,
                    description: "The color of the product (e.g., 'Black').",
                  },
                  search_universal: {
                    type: SchemaType.BOOLEAN,
                    description:
                      "Set to true to search for universal products instead of vehicle-specific ones.",
                  },
                },
                required: [],
              },
            },
          ],
        },
      ],
    });

    const chat = model.startChat({ history: formatHistoryForGemini(history) });
    const result = await chat.sendMessage(message);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log("🛠️ Tool Call Detected:", call.name, call.args);

      const dbProducts = await searchDatabase(call.args);

      const toolResponseResult = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: {
              products: dbProducts,
            },
          },
        },
      ]);

      const finalResponse = toolResponseResult.response.text();
      return NextResponse.json({ message: finalResponse });
    } else {
      const textResponse = response.text();
      console.log("💬 No Tool Call. Direct Response:", textResponse);
      return NextResponse.json({ message: textResponse });
    }
  } catch (error) {
    console.error("Error in main chat API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    if (errorMessage.includes("quota")) {
      return NextResponse.json(
        {
          message:
            "Sorry, I'm currently experiencing high traffic. Please try again in a moment.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        message:
          "Sorry, I encountered an error. Please try rephrasing your question.",
      },
      { status: 500 }
    );
  }
}

// --- HELPER FUNCTIONS ---

async function searchDatabase(args: ProductSearchArgs): Promise<Product[]> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const collection = client
      .db(DATABASE_NAME)
      .collection<Product>(PRODUCTS_COLLECTION);
    const query: MongoQuery = { $and: [] };

    // This allows searching by either category OR name, which is more flexible.
    if (args.product_type) {
      const searchTerms = args.product_type.split(/\s+/).join("|");
      const regex = new RegExp(searchTerms, "i");
      query.$and.push({ $or: [{ category: regex }, { name: regex }] });
    }
    if (args.color) {
      query.$and.push({ colour: { $regex: new RegExp(args.color, "i") } });
    }

    if (args.search_universal) {
      query.$and.push({ universal: true });
    } else if (args.make && args.model) {
      const compatibilityQuery: CompatibilityQuery = {
        "compatibility.make": { $regex: new RegExp(`^${args.make}$`, "i") },
        "compatibility.model": { $regex: new RegExp(`^${args.model}$`, "i") },
      };
      if (args.year) {
        compatibilityQuery["compatibility.$or"] = [
          { "compatibility.year_from": null, "compatibility.year_to": null },
          {
            "compatibility.year_from": { $lte: args.year },
            "compatibility.year_to": null,
          },
          {
            "compatibility.year_from": null,
            "compatibility.year_to": { $gte: args.year },
          },
          {
            "compatibility.year_from": { $lte: args.year },
            "compatibility.year_to": { $gte: args.year },
          },
        ];
      }
      query.$and.push(compatibilityQuery);
    }

    if (query.$and.length === 0) {
      // Avoid sending an empty query that would match everything
      return [];
    }

    const products = await collection.find(query).limit(10).toArray();
    console.log(
      `[DB Search] Found ${products.length} products for query:`,
      JSON.stringify(query)
    );
    return products;
  } finally {
    await client.close();
  }
}

function getSystemPrompt(): string {
  const availableCategories =
    "Android Screen, Speaker, Mats, Car Charger, Memory Foam, USB Cable, Camera, Tyre Inflator, Vacuum Cleaner, BTFM, Steering Cover, Lumiere LED, PrismX LED, Damping Sheet, Car Care Kit, Wiper Blade, Headlight, LED, Perfume, Aerosol";

  return `You are Laxman Auto Parts chatbot, a friendly and expert AI assistant for an auto parts store in India.

**YOUR KNOWLEDGE BASE:**
You are aware that the store stocks the following categories of products: ${availableCategories}.

**YOUR PRIMARY GOAL:**
Your main goal is to help users find car parts. To do this, you must use the \`product_retrieval_tool\`.

**CONVERSATIONAL FLOW:**
1.  **Understand User's Need**: If a user describes a problem (e.g., "my car is smelling bad"), use your knowledge of available categories to suggest a solution (e.g., "We have perfumes and aerosol sprays that can help with that. Which would you like to see?").
2.  **Handle Multi-Product Requests**: If the user asks for multiple distinct products at once (e.g., "I need floor mats and headlights"), DO NOT call the tool. Instead, respond by saying: "Okay, I can help with both of those. Which one would you like to look for first: the floor mats or the headlights?"
3.  **Gather Information**: If you don't have enough information to call the tool (e.g., you need a car model for a non-universal part), ask the user for it first.
4.  **Call the Tool**: Once you have enough information for a single product search, call the \`product_retrieval_tool\`. When the user is selecting from a list you provided, pass their selection (e.g., "Vanilla Delight") as the \`product_type\` argument.
5.  **Interpret Tool Results**:
    - **If products are found**: Present them to the user in a clear list. ALWAYS ask a follow-up question. If there are more than 10 products then tell them that there are more options if they would like to see them as well. if they do then display the rest, in sets of 10.
    - **If many products are specific to vehicles**: If you find that many products are specific to certain vehicles, inform the user about this and suggest they provide their vehicle details for a more tailored search.
    - **If NO products are found for a specific vehicle**: Apologize, state what you looked for, and then immediately ask if they'd like to search for universal options that are likely to work/fit.
    - **If NO universal products are found**: Apologize and state that the product is likely out of stock and then ask how else you can assist or if they would like to talk to a human agent.
6.  **Handle Greetings**: For simple greetings like "hello", provide a warm welcome and ask how you can help. DO NOT call the tool.
7.  **Handle Topic Changes**: If the user was asking about mats and then says "I also want headlights", forget about the mats and focus entirely on finding headlights.
8.  **Product Confirmation**: If the user selects a product from a list you provided (e.g., "Vanilla Delight"), ask them to confirm their choice and then tell them they will be handed over to a human to complete the purchase.
9.  **Avoid Redundancy**: If the user has already agreed to see universal products after a specific search failed, DO NOT ask them again if they want to see universal options. Instead, directly show them the universal products.
**TONE:**
- Be conversational and helpful. Use a natural Hindi-English mix (Hinglish) only if the user does.
- Be concise. Do not ask for unnecessary details. If they say "any led headlight," show them the available LED headlights.`;
}

function formatHistoryForGemini(history: ChatMessage[]): Content[] {
  return history.map((msg: ChatMessage) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}
