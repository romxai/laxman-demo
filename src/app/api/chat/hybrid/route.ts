import { NextRequest, NextResponse } from "next/server";

interface HybridRequest {
  message: string;
  conversation_history?: Array<{
    role: string;
    content: string;
  }>;
}

interface HybridResponse {
  message: string;
  image_urls?: string[];
  suggested_actions?: string[];
  debug_info?: {
    nlu_result?: any;
    retrieval_result?: any;
    search_criteria?: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_history = [] }: HybridRequest =
      await request.json();

    // Step 1: NLU Processing
    console.log("🔍 Step 1: Processing NLU...");
    const nluResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/chat/nlu`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversation_history,
        }),
      }
    );

    if (!nluResponse.ok) {
      throw new Error(`NLU API failed: ${nluResponse.status}`);
    }

    const nluResult = await nluResponse.json();
    console.log("✅ NLU Result:", nluResult);

    // **CORRECTED LOGIC: Handle Greetings**
    if (nluResult.slots?.intent === "general_greeting") {
      console.log("💡 Detected a greeting. Skipping retrieval.");
      const responseRequest = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        }/api/chat/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slots: nluResult.slots,
            products: [], // No products to show
            conversation_history,
            search_context: "greeting", // Pass a specific context for greetings
          }),
        }
      );
      const greetingResult = await responseRequest.json();
      return NextResponse.json({
        ...greetingResult,
        debug_info: { nlu_result: nluResult },
      });
    }

    if (nluResult.needs_clarification) {
      return NextResponse.json({
        message:
          nluResult.clarification_question ||
          "Could you please provide more details?",
        suggested_actions: ["provide_missing_info"],
        debug_info: { nlu_result: nluResult },
      });
    }

    let retrievalSlots = { ...nluResult.slots };
    let search_context: "product_search" | "universal_search_fallback" =
      "product_search";

    const lastAssistantMessage =
      conversation_history.filter((msg: any) => msg.role === "assistant").pop()
        ?.content || "";
    const isAffirmative =
      /yes|ok|sure|what options|tell me|do you have|universal/i.test(message);

    if (
      nluResult.slots?.intent === "clarify" &&
      /universal/i.test(lastAssistantMessage) &&
      isAffirmative
    ) {
      console.log(
        "💡 User agreed to universal search. Modifying retrieval slots."
      );
      retrievalSlots.vehicle = {};
      search_context = "universal_search_fallback";
    }

    // Step 2: Product Retrieval
    console.log("🔍 Step 2: Retrieving products with slots:", retrievalSlots);
    const retrievalResponse = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/chat/retrieve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slots: retrievalSlots,
          limit: 10, // Increased limit to show more universal options if available
          include_universal: true,
        }),
      }
    );

    if (!retrievalResponse.ok) {
      throw new Error(`Retrieval API failed: ${retrievalResponse.status}`);
    }

    const retrievalResult = await retrievalResponse.json();
    console.log("✅ Retrieval Result:", retrievalResult);

    // Step 3: Response Generation
    console.log("🔍 Step 3: Generating response...");
    const responseRequest = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/chat/respond`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slots: nluResult.slots,
          products: retrievalResult.products,
          conversation_history,
          search_context: search_context,
        }),
      }
    );

    if (!responseRequest.ok) {
      throw new Error(`Response API failed: ${responseRequest.status}`);
    }

    const responseResult = await responseRequest.json();
    console.log("✅ Response Generated:", responseResult);

    const finalResponse: HybridResponse = {
      message: responseResult.message,
      image_urls: responseResult.image_urls,
      suggested_actions: responseResult.suggested_actions,
      debug_info: {
        nlu_result: nluResult,
        retrieval_result: retrievalResult,
        search_criteria: retrievalResult.search_criteria,
      },
    };

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.error("Error in hybrid chat API:", error);
    return NextResponse.json(
      {
        message:
          "I'm sorry, I'm having trouble processing your request right now. Please try rephrasing.",
      },
      { status: 500 }
    );
  }
}
