import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { ConversationSlots } from "../nlu/route";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

interface ResponseRequest {
  slots: ConversationSlots;
  products: Product[];
  conversation_history: Array<{ role: string; content: string }>;
  search_context: "greeting" | "product_search" | "universal_search_fallback";
}

interface ResponseResponse {
  message: string;
  image_urls?: string[];
  suggested_actions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const {
      slots,
      products,
      conversation_history,
      search_context,
    }: ResponseRequest = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const conversationContext = conversation_history
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const productsContext =
      products && products.length > 0
        ? products
            .map(
              (product, index) =>
                `Product ${index + 1}:
- SKU: ${product.sku}
- Name: ${product.name}
- Brand: ${product.brand || "N/A"}
- Category: ${product.category || "N/A"}
- Color: ${product.colour || "N/A"}
- Universal: ${product.universal ? "Yes" : "No"}
- Compatibility: ${
                  product.universal
                    ? "All vehicles"
                    : product.compatibility
                        .map(
                          (comp) =>
                            `${comp.make} ${comp.model}${
                              comp.year_from ? ` (${comp.year_from}` : ""
                            }${comp.year_to ? `-${comp.year_to})` : ")"}`
                        )
                        .join(", ")
                }
`
            )
            .join("\n")
        : "No products found matching the criteria.";

    const systemPrompt = `You are Laxman Auto Parts chatbot assistant, a friendly and expert guide.

**YOUR TONE:**
- Be friendly, conversational, and helpful. Use a natural Hindi-English mix (Hinglish) only if the user does.

**CORE LOGIC:**
1.  **Analyze the \`search_context\` and the \`productsContext\` to decide your action.**
2.  **DO NOT ASK FOR MORE DETAILS IF PRODUCTS ARE AVAILABLE.** If the user gives a general request (like "any led headlight") and you have relevant products in \`productsContext\`, you MUST present them immediately. Do not ask clarifying questions about brightness or color if the user hasn't specified a preference.
3.  **Always end with a clear, actionable question.**

**RESPONSE GUIDELINES based on SEARCH CONTEXT:**

- **If \`search_context\` is "greeting"**: Provide a warm, brief welcome and ask how you can help.

- **If \`search_context\` is "product_search"**:
    - **If Products ARE Found**: Acknowledge the user's specific request ("For your Taigun, I found...") and present the items. If more than 3, summarize.
    - **If NO Products are Found**: Apologize, state what you looked for ("I couldn't find specific headlights for a Taigun."), and then suggest a helpful next step ("Would you like to see our universal LED headlights instead?").

- **If \`search_context\` is "universal_search_fallback"**:
    - **If Products ARE Found**: Acknowledge the user's agreement ("Great! Here are the universal options we have..."). Do NOT repeat why the specific search failed. Present the products.
    - **If NO Products are Found**: Apologize and say something like: "It seems we're currently out of stock for universal mats. Can I help you look for another product?"

**AVAILABLE PRODUCTS:**
${productsContext}

**CONVERSATION CONTAXT:**
${conversationContext}

**CURRENT USER INTENT:**
${JSON.stringify(slots, null, 2)}

Generate a natural and helpful response based on all the above instructions.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(
      "Generate the response based on the provided context and instructions."
    );
    const response = await result.response;
    const message = response.text();

    const suggestedActions = generateSuggestedActions(slots, products);

    const responseObj: ResponseResponse = {
      message: message.trim(),
      suggested_actions: suggestedActions,
    };

    return NextResponse.json(responseObj);
  } catch (error) {
    console.error("Error in response generation API:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

function generateSuggestedActions(
  slots: ConversationSlots,
  products: Product[]
): string[] {
  const actions: string[] = [];
  if (!slots) {
    return actions;
  }
  if (products && products.length > 0) {
    actions.push("view_product_details");
    const colors = [...new Set(products.map((p) => p.colour).filter((c) => c))];
    if (colors.length > 1) {
      actions.push("filter_by_color");
    }
  }
  if (slots.intent === "search_product") {
    actions.push("ask_for_more_details");
  }
  return actions;
}
