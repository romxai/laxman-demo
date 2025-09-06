## 🤖 Hybrid Chatbot Architecture

This project implements a sophisticated **Hybrid Chatbot System** that combines the power of Google's Gemini AI with MongoDB for deterministic product retrieval.

### Architecture Overview

The system uses a **3-layer architecture** for optimal performance and accuracy:

#### 1. 🧠 NLU Layer (`/api/chat/nlu`)
- **Purpose**: Natural Language Understanding and Intent Classification
- **Technology**: Google Gemini 2.0 Flash
- **Features**:
  - Extracts vehicle information (make, model, year)
  - Identifies product categories and preferences
  - Handles Hinglish and conversational language
  - Maintains conversation context
  - Generates clarification questions when needed

#### 2. 🔍 Retrieval Layer (`/api/chat/retrieve`)
- **Purpose**: Deterministic product search from MongoDB
- **Technology**: MongoDB Atlas with optimized queries
- **Features**:
  - Vehicle-specific product matching
  - Universal product fallback
  - Year-based compatibility filtering
  - Color and category filtering
  - Performance-optimized indexing

#### 3. 💬 Response Layer (`/api/chat/respond`)
- **Purpose**: Natural language response generation
- **Technology**: Google Gemini 2.0 Flash
- **Features**:
  - Conversational product recommendations
  - Clear compatibility explanations
  - SKU code inclusion
  - Suggested follow-up actions

#### 4. 🎯 Hybrid Orchestrator (`/api/chat/hybrid`)
- **Purpose**: Coordinates all three layers
- **Features**:
  - Sequential processing pipeline
  - Error handling and fallbacks
  - Debug information for development
  - Conversation flow management

### Key Benefits

✅ **Natural Language Flexibility**: Handles Hinglish, spelling variations, and conversational input
✅ **Deterministic Retrieval**: No hallucinations - only returns products that exist in database
✅ **Context Awareness**: Maintains conversation state across messages
✅ **Clarification Logic**: Asks targeted questions when information is missing
✅ **Performance Optimized**: Fast MongoDB queries with proper indexing
✅ **Multilingual Support**: Works with Hindi-English mix naturally

### API Endpoints

- `POST /api/chat/hybrid` - Main chatbot endpoint (recommended)
- `POST /api/chat/nlu` - NLU processing only
- `POST /api/chat/retrieve` - Product retrieval only
- `POST /api/chat/respond` - Response generation only
- `POST /api/chat` - Legacy endpoint (now uses hybrid system)

### Testing the System

Run the comprehensive test suite:

```bash
npm run test-hybrid
```

This will test:
- Individual components (NLU, Retrieval, Response)
- End-to-end hybrid flow
- Various query types and edge cases

### Example Conversations

**User**: "मेरे ertiga के लिए mats chahiye"
**Bot**: "आपके Maruti Ertiga के लिए ये mats available हैं:
- NOIRE INFINITY Boot for ERTIGA (SKU: GMA_INBM_005)
- NOIRE INFINITY for Maruti ERTIGA (SKU: GMA_INF_130)

कौन सा color prefer करेंगे - Black या Beige?"

**User**: "2020 model hai"
**Bot**: "ठीक है, आपके 2020 Maruti Ertiga के लिए compatible mats:
- NOIRE INFINITY for Maruti ERTIGA (SKU: GMA_INF_130) - Black color
- NOIRE INFINITY Boot for ERTIGA (SKU: GMA_INBM_005) - Black color

क्या आप कोई specific color चाहते हैं?"

### Data Structure

**Products Collection**:
```json
{
  "sku": "GMA_AD_004",
  "name": "GoMechanic Accessories Olympus Smart Fit Android Screen",
  "brand": "GoMechanic",
  "category": "Android Screen",
  "colour": null,
  "compatibility": [
    {
      "make": "Hyundai",
      "model": "Creta",
      "year_from": null,
      "year_to": null,
      "notes": ""
    }
  ],
  "universal": false
}
```

**Vehicles Collection**:
```json
{
  "make": "Hyundai",
  "model": "Creta",
  "aliases": ["creta", "kreta"]
}
```

### Environment Variables

Add to `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your_mongodb_atlas_connection_string
```

## Data Upload to MongoDB Atlas

### Prerequisites
1. Create a MongoDB Atlas account and cluster
2. Get your connection string from Atlas dashboard
3. Set up environment variables

### Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and replace with your actual MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Upload Data
Run the upload script to populate your MongoDB Atlas database:

```bash
npm run upload-data
```

This will:
- Connect to your MongoDB Atlas cluster
- Upload vehicle data from `python/car_models.json` to `vehicles` collection
- Upload product data from `python/products_compatibility.json` to `products` collection
- Create appropriate indexes for optimal query performance

### Collections Created
- **vehicles**: Contains vehicle make, model, and alias information
- **products**: Contains product details with compatibility information

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
