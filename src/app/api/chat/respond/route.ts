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
  conversation_history: Array<{
    role: string;
    content: string;
  }>;
  needs_clarification?: boolean;
  clarification_question?: string;
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
      needs_clarification,
      clarification_question
    }: ResponseRequest = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // If clarification is needed, return the clarification question
    if (needs_clarification && clarification_question) {
      return NextResponse.json({
        message: clarification_question,
        suggested_actions: ["provide_missing_info"]
      });
    }

    // Build conversation context
    const conversationContext = conversation_history
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Format products for the prompt
    const productsContext = products.length > 0
      ? products.map((product, index) =>
          `Product ${index + 1}:
- SKU: ${product.sku}
- Name: ${product.name}
- Brand: ${product.brand || 'N/A'}
- Category: ${product.category || 'N/A'}
- Color: ${product.colour || 'N/A'}
- Universal: ${product.universal ? 'Yes' : 'No'}
- Compatibility: ${product.universal ? 'All vehicles' :
    product.compatibility.map(comp =>
      `${comp.make} ${comp.model}${comp.year_from ? ` (${comp.year_from}` : ''}${comp.year_to ? `-${comp.year_to})` : ''}`
    ).join(', ')}
`
        ).join('\n')
      : 'No products found matching the criteria.';

    const systemPrompt = `You are Laxman Auto Parts chatbot assistant. You help customers find auto parts and accessories for their vehicles.

**YOUR ROLE:**
- Be friendly, conversational, and helpful
- Use natural Hindi-English mix if the user does, else use clear English
- Focus on product recommendations and fitment
- Never mention SKU codes for products
- Explain compatibility clearly
- Suggest alternatives when needed

**RESPONSE GUIDELINES:**
1. **Product Recommendations:**
   - List products with their SKU, name, and key features
   - Explain why each product fits the customer's needs
   - Mention color options if available
   - Highlight universal vs vehicle-specific products

2. **Fitment Information:**
   - Clearly state if product is universal or vehicle-specific
   - Mention year compatibility when relevant
   - Explain any fitment notes or restrictions

3. **Natural Conversation:**
   - Use conversational language
   - Ask follow-up questions naturally
   - Offer additional help or alternatives

4. **Product Details:**
   - Always include SKU codes
   - Mention brands when available
   - Explain product categories clearly

**AVAILABLE PRODUCTS:**
${productsContext}

**CONVERSATION CONTEXT:**
${conversationContext}

**CURRENT USER INTENT:**
${JSON.stringify(slots, null, 2)}

Generate a natural, helpful response based on the available products and user intent. Keep it conversational and focus on helping the customer find the right product.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const userQuery = `User is looking for: ${slots.product_type || 'products'} ${slots.vehicle ? `for ${slots.vehicle.make} ${slots.vehicle.model}${slots.vehicle.year ? ` ${slots.vehicle.year}` : ''}` : ''}${slots.color ? ` in ${slots.color} color` : ''}`;

    const result = await model.generateContent(userQuery);
    const response = await result.response;
    let message = response.text();

    // Extract any image indicators (for future use)
    const imageUrls: string[] = [];

    // Generate suggested actions based on the response
    const suggestedActions = generateSuggestedActions(slots, products);

    const responseObj: ResponseResponse = {
      message: message.trim(),
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      suggested_actions: suggestedActions
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

function generateSuggestedActions(slots: ConversationSlots, products: Product[]): string[] {
  const actions: string[] = [];

  if (products.length > 0) {
    actions.push("view_product_details");

    // Check if there are color options
    const colors = [...new Set(products.map(p => p.colour).filter(c => c))];
    if (colors.length > 1) {
      actions.push("filter_by_color");
    }

    // Check if there are universal options
    const hasUniversal = products.some(p => p.universal);
    const hasSpecific = products.some(p => !p.universal);
    if (hasUniversal && hasSpecific) {
      actions.push("show_universal_only");
    }
  }

  if (slots.intent === "search_product") {
    actions.push("ask_for_more_details");
  }

  return actions;
}
