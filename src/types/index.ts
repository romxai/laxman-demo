export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "image";
  imageUrl?: string;
  imageUrls?: string[];
}

export interface CarPart {
  id: string;
  name: string;
  brands: string[];
  price_range: string;
  description: string;
  compatibility: string[];
  warranty: string;
  availability: string;
  images?: string[];
}

export interface Category {
  name: string;
  description: string;
  items: CarPart[];
}

export interface Service {
  name: string;
  description: string;
  price: string;
  availability: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  payment_methods: string[];
  delivery: string;
}

export interface CarPartsDatabase {
  categories: Record<string, Category>;
  services: Service[];
  shop_info: ShopInfo;
}

// New types for the hybrid chatbot system
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

export interface Product {
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

export interface NLUReponse {
  slots: ConversationSlots;
  needs_clarification: boolean;
  clarification_question?: string;
  raw_intent: string;
  extracted_entities: Record<string, string | number | boolean>;
}

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  resetConversation: () => void;
}
