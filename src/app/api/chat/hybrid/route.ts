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
    const { message, conversation_history = [] }: HybridRequest = await request.json();

    // Step 1: NLU Processing
    console.log("🔍 Step 1: Processing NLU...");
    const nluResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/chat/nlu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_history
      }),
    });

    if (!nluResponse.ok) {
      throw new Error(`NLU API failed: ${nluResponse.status}`);
    }

    const nluResult = await nluResponse.json();
    console.log("✅ NLU Result:", nluResult);

    // Check if clarification is needed
    if (nluResult.needs_clarification) {
      return NextResponse.json({
        message: nluResult.clarification_question || "Could you please provide more details?",
        suggested_actions: ["provide_missing_info"],
        debug_info: {
          nlu_result: nluResult
        }
      });
    }

    // Step 2: Product Retrieval
    console.log("🔍 Step 2: Retrieving products...");
    const retrievalResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/chat/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slots: nluResult.slots,
        limit: 5, // Limit results for better UX
        include_universal: true
      }),
    });

    if (!retrievalResponse.ok) {
      throw new Error(`Retrieval API failed: ${retrievalResponse.status}`);
    }

    const retrievalResult = await retrievalResponse.json();
    console.log("✅ Retrieval Result:", retrievalResult);

    // Step 3: Response Generation
    console.log("🔍 Step 3: Generating response...");
    const responseRequest = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/chat/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slots: nluResult.slots,
        products: retrievalResult.products,
        conversation_history,
        needs_clarification: false
      }),
    });

    if (!responseRequest.ok) {
      throw new Error(`Response API failed: ${responseRequest.status}`);
    }

    const responseResult = await responseRequest.json();
    console.log("✅ Response Generated:", responseResult);

    // Combine results
    const finalResponse: HybridResponse = {
      message: responseResult.message,
      image_urls: responseResult.image_urls,
      suggested_actions: responseResult.suggested_actions,
      debug_info: {
        nlu_result: nluResult,
        retrieval_result: retrievalResult,
        search_criteria: retrievalResult.search_criteria
      }
    };

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error("Error in hybrid chat API:", error);

    // Fallback response
    return NextResponse.json({
      message: "I'm sorry, I'm having trouble processing your request right now. Could you please try rephrasing your question?",
      suggested_actions: ["retry_request"],
      debug_info: {
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }, { status: 500 });
  }
}
