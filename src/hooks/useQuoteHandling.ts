
import { ServiceRequest } from '@/types/newServiceRequest';
import { EmployeeResponse } from '@/services/newEmployeeIntegration';
import { priceQuoteService } from '@/services/priceQuoteService';
import { toast } from '@/components/ui/use-toast';

interface UseQuoteHandlingProps {
  setCurrentRequest: (request: ServiceRequest | null) => void;
  setCurrentScreen: (screen: string | null) => void;
  setAssignedEmployee: (employee: EmployeeResponse | null) => void;
  employeeDeclineCount: number;
  setEmployeeDeclineCount: (count: number) => void;
  hasReceivedRevision: boolean;
  setHasReceivedRevision: (received: boolean) => void;
  blacklistCurrentEmployee: (employeeName: string) => void;
  resetEmployeeTracking: () => void;
  findEmployee: (request: ServiceRequest) => Promise<void>;
}

export const useQuoteHandling = ({
  setCurrentRequest,
  setCurrentScreen,
  setAssignedEmployee,
  employeeDeclineCount,
  setEmployeeDeclineCount,
  hasReceivedRevision,
  setHasReceivedRevision,
  blacklistCurrentEmployee,
  resetEmployeeTracking,
  findEmployee
}: UseQuoteHandlingProps) => {

  const generateQuote = async (request: ServiceRequest, employee: EmployeeResponse, isRevised: boolean = false) => {
    try {
      const quote = await priceQuoteService.generateQuote(request.type);
      const finalQuote = isRevised ? Math.max(quote * 0.8, 20) : quote;
      
      const updatedRequest = {
        ...request,
        [isRevised ? 'revisedPriceQuote' : 'priceQuote']: finalQuote,
        status: 'quote_received' as const
      };
      
      setCurrentRequest(updatedRequest);
      setCurrentScreen('show_price_quote_received');
      
      console.log(`${isRevised ? 'Revised' : 'Initial'} quote generated:`, finalQuote);
      
      toast({
        title: `${isRevised ? 'Revised' : ''} Price Quote Received`,
        description: `${employee.name} sent you a ${isRevised ? 'revised ' : ''}quote of ${finalQuote} BGN.`
      });
      
    } catch (error) {
      console.error('Error generating quote:', error);
      toast({
        title: "Error",
        description: "Failed to generate price quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeclineQuote = async (request: ServiceRequest, employee: EmployeeResponse) => {
    const newDeclineCount = employeeDeclineCount + 1;
    setEmployeeDeclineCount(newDeclineCount);
    
    console.log('Decline count for employee', employee.name, ':', newDeclineCount);
    
    // RULE: Allow exactly 2 declines per employee
    if (newDeclineCount === 1 && !hasReceivedRevision) {
      // First decline - generate revision from same employee
      setHasReceivedRevision(true);
      setCurrentScreen('show_waiting_for_revision');
      
      toast({
        title: "Quote Declined",
        description: `${employee.name} will send you a revised quote.`
      });
      
      // Generate revised quote after delay
      setTimeout(() => {
        generateQuote(request, employee, true);
      }, 3000);
      
    } else if (newDeclineCount === 2) {
      // Second decline - blacklist employee and find new one
      console.log('Second decline reached - blacklisting employee:', employee.name);
      
      blacklistCurrentEmployee(employee.name);
      resetEmployeeTracking(); // This will reset decline count to 0
      setAssignedEmployee(null);
      setCurrentScreen('show_searching_technician');
      
      toast({
        title: "Quote Declined",
        description: "Looking for another available employee..."
      });
      
      // Find new employee
      setTimeout(() => {
        findEmployee(request);
      }, 2000);
    }
  };

  return {
    generateQuote,
    handleDeclineQuote
  };
};
