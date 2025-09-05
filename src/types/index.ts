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

export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  resetConversation: () => void;
}
