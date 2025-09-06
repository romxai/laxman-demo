const API_BASE_URL = "http://localhost:3000";

async function testHybridChatbot() {
  console.log("🧪 Testing Hybrid Chatbot System\n");

  const testCases = [
    {
      message: "I need mats for my Ertiga",
      description: "Vehicle-specific product search",
    },
    {
      message: "Show me Android screens",
      description: "Universal product search",
    },
    {
      message: "Black mats for Hyundai Creta 2020",
      description: "Complete product search with all details",
    },
    {
      message: "What speakers do you have?",
      description: "Category search",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`💬 Message: "${testCase.message}"`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/hybrid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: testCase.message,
          conversation_history: [],
        }),
      });

      if (!response.ok) {
        console.log(`❌ HTTP Error: ${response.status}`);
        continue;
      }

      const result = await response.json();

      console.log("✅ Response:", result.message);
      if (result.suggested_actions) {
        console.log("🎯 Suggested Actions:", result.suggested_actions);
      }

      if (result.debug_info) {
        console.log("🔍 Debug Info:");
        console.log("  - Intent:", result.debug_info.nlu_result?.slots?.intent);
        console.log(
          "  - Confidence:",
          result.debug_info.nlu_result?.slots?.confidence
        );
        console.log(
          "  - Products Found:",
          result.debug_info.retrieval_result?.products?.length || 0
        );
        console.log(
          "  - Search Criteria:",
          JSON.stringify(result.debug_info.search_criteria, null, 2)
        );
      }
    } catch (error) {
      console.log(
        "❌ Error:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    console.log("─".repeat(50));
  }
}

// Test individual components
async function testComponents() {
  console.log("\n🔧 Testing Individual Components\n");

  // Test NLU
  console.log("🧠 Testing NLU Component...");
  try {
    const nluResponse = await fetch(`${API_BASE_URL}/api/chat/nlu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "I need mats for my Ertiga 2020",
        conversation_history: [],
      }),
    });

    if (nluResponse.ok) {
      const nluResult = await nluResponse.json();
      console.log("✅ NLU Result:", JSON.stringify(nluResult, null, 2));
    } else {
      console.log("❌ NLU Test Failed");
    }
  } catch (error) {
    console.log(
      "❌ NLU Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Test Retrieval
  console.log("\n🔍 Testing Retrieval Component...");
  try {
    const retrievalResponse = await fetch(`${API_BASE_URL}/api/chat/retrieve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slots: {
          vehicle: { make: "Maruti", model: "Ertiga", year: 2020 },
          product_type: "Mats",
        },
        limit: 3,
      }),
    });

    if (retrievalResponse.ok) {
      const retrievalResult = await retrievalResponse.json();
      console.log(
        "✅ Retrieval Result:",
        JSON.stringify(retrievalResult, null, 2)
      );
    } else {
      console.log("❌ Retrieval Test Failed");
    }
  } catch (error) {
    console.log(
      "❌ Retrieval Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Run tests
async function runTests() {
  try {
    await testComponents();
    await testHybridChatbot();
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

runTests();
