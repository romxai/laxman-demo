# AI Chatbot for Car Parts & Accessories - Build Documentation

## Project Overview
This is an AI-powered chatbot application built for Laxman Auto Parts & Accessories, an Indian auto parts shop. The chatbot helps customers inquire about car parts, accessories, prices, and availability.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: ShadCN UI
- **AI Model**: Google Gemini Pro (Free API)
- **Icons**: Lucide React

## Features Implemented

### 1. Modern Chat UI
- ✅ WhatsApp/Messenger-style chat interface
- ✅ Message bubbles for user and assistant
- ✅ User avatar (User icon) and Bot avatar (Bot icon)
- ✅ Proper message styling with blue bubbles for user and white for assistant
- ✅ Timestamps for each message
- ✅ Auto-scroll to bottom when new messages arrive

### 2. Chat Functionality
- ✅ Scrollable chat history
- ✅ Real-time message sending and receiving
- ✅ Loading states with spinner animation
- ✅ Reset conversation button in header
- ✅ Message counter in header
- ✅ Proper input handling with Enter key support

### 3. Chatbot Logic
- ✅ Integration with Google Gemini Pro API
- ✅ Context-aware responses using car parts database
- ✅ Strict data-only responses (only information from JSON database)
- ✅ Graceful handling of out-of-scope queries
- ✅ Professional tone and helpful suggestions
- ✅ Error handling and fallback responses

### 4. Database Structure
- ✅ Comprehensive car parts JSON database including:
  - Engine parts (air filters, oil filters, spark plugs, engine oil)
  - Brake parts (brake pads, brake discs, brake fluid)
  - Suspension parts (shock absorbers, coil springs)
  - Electrical parts (batteries, alternators, headlight bulbs)
  - Accessories (car mats, car covers, seat covers)
- ✅ Service information (installation, inspection, warranty)
- ✅ Shop information (contact details, hours, payment methods)

### 5. File Structure
```
src/
├── app/
│   ├── api/chat/route.ts          # Gemini API integration
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main chat page
├── components/
│   ├── ui/                        # ShadCN components
│   └── chat/
│       ├── ChatContainer.tsx      # Main chat wrapper
│       ├── ChatHeader.tsx         # Header with reset button
│       ├── ChatMessages.tsx       # Messages display area
│       ├── ChatInput.tsx          # Message input component
│       └── MessageBubble.tsx      # Individual message component
├── data/
│   └── car-parts.json            # Car parts database
├── hooks/
│   └── useChat.ts                # Chat state management
├── types/
│   └── index.ts                  # TypeScript interfaces
└── lib/
    └── utils.ts                  # Utility functions
```

## Setup Instructions

### 1. Environment Setup
1. Copy `.env.local.example` to `.env.local`
2. Get Gemini API key from https://aistudio.google.com/app/apikey
3. Add your API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 2. Installation
```bash
npm install
```

### 3. Development
```bash
npm run dev
```

## API Integration
- **Endpoint**: `/api/chat`
- **Method**: POST
- **Payload**: `{ message: string, history: Message[] }`
- **Response**: `{ message: string }`

The API sends the entire car parts database as context to Gemini Pro, ensuring responses are limited to available inventory.

## UI/UX Features
- Responsive design that works on desktop and mobile
- Clean, modern interface inspired by popular messaging apps
- Smooth animations and transitions
- Loading indicators for better user experience
- Professional branding with shop name and online status
- Intuitive reset functionality

## Database Coverage
The chatbot can help with:
- **Part Categories**: Engine, Brake, Suspension, Electrical, Accessories
- **Brand Information**: Multiple brands per category (Bosch, Castrol, NGK, etc.)
- **Pricing**: Price ranges in Indian Rupees
- **Compatibility**: Vehicle compatibility (Maruti, Hyundai, Honda, Toyota, etc.)
- **Warranty**: Warranty periods for each part
- **Availability**: Stock status
- **Services**: Installation, inspection, warranty services
- **Shop Details**: Contact info, hours, payment methods, delivery

## Key Implementation Details

### 1. Context Management
- Chat history is maintained in React state
- Previous messages are sent to Gemini for context
- Conversation can be reset completely

### 2. Error Handling
- API failures show user-friendly error messages
- Network issues are handled gracefully
- Invalid queries redirect to human assistance

### 3. Response Filtering
- AI is instructed to only use database information
- Out-of-scope queries trigger handoff message
- Maintains professional tone throughout

### 4. Performance
- Efficient re-renders using React hooks
- Optimized message rendering
- Smooth scrolling with auto-scroll to bottom

## Future Enhancements (Not Implemented)
- Image support in messages
- File upload functionality
- Voice messages
- Multi-language support
- Chat export functionality
- Admin dashboard for database management

## Testing
- Manual testing completed for all chat functions
- API integration tested with various query types
- UI responsiveness verified across screen sizes
- Error scenarios tested and handled

## Deployment Considerations
- Environment variables properly configured
- API keys secured
- Database can be easily updated by modifying JSON file
- Static assets optimized for production

---

**Status**: ✅ Complete - All requirements implemented and tested
**Last Updated**: September 5, 2025
