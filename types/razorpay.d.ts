declare module "razorpay" {
  interface OrderOptions {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }

  interface Order {
    id: string;
    amount: number;
    currency: string;
  }

  export default class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: {
      create(options: OrderOptions): Promise<Order>;
    };
  }
}
