
import { NewSupabaseService } from './newSupabaseService';

class PriceQuoteService {
  private supabaseService = new NewSupabaseService();

  async generateQuote(serviceType: string): Promise<number> {
    try {
      return await this.supabaseService.generatePriceQuote(serviceType);
    } catch (error) {
      console.error('Error generating price quote:', error);
      // Fallback to default pricing if service fails
      const defaultPrices = {
        'Flat Tyre': 40,
        'Out of Fuel': 30,
        'Car Battery': 60,
        'Other Car Problems': 50,
        'Tow Truck': 100
      };
      
      const basePrice = defaultPrices[serviceType as keyof typeof defaultPrices] || 50;
      return basePrice + Math.floor(Math.random() * 20) - 10;
    }
  }

  async validatePrice(serviceType: string, price: number): Promise<boolean> {
    try {
      return await this.supabaseService.validatePrice(serviceType, price);
    } catch (error) {
      console.error('Error validating price:', error);
      return true; // Allow price if validation fails
    }
  }
}

export const priceQuoteService = new PriceQuoteService();
