
import { useEmployeeSimulation } from '@/hooks/useEmployeeSimulation';
import { ServiceType } from '../types/serviceRequestState';
import { toast } from "@/components/ui/use-toast";
import { UserHistoryService } from '@/services/userHistoryService';
import { useApp } from '@/contexts/AppContext';
import { useMemo, useCallback } from 'react';
import { SimulatedEmployeeBlacklistService } from '@/services/simulatedEmployeeBlacklistService';

export const useRequestSimulation = () => {
  const { loadEmployees, getRandomEmployee } = useEmployeeSimulation();
  const { user } = useApp();

  const simulateEmployeeResponse = useCallback(async (
    requestId: string,
    timestamp: string,
    type: ServiceType,
    userLocation: { lat: number; lng: number },
    onQuoteReceived: (quote: number) => void,
    setShowPriceQuote: (show: boolean) => void,
    setShowRealTimeUpdate: (show: boolean) => void,
    setStatus: (status: 'pending' | 'accepted' | 'declined') => void,
    setDeclineReason: (reason: string) => void,
    setEmployeeLocation: (location: { lat: number; lng: number } | undefined) => void,
    setCurrentEmployeeName: (name: string) => void,
    blacklistedEmployees: string[] = []
  ) => {
    try {
      await loadEmployees();
      
      // Load blacklisted employees from database for this request
      const dbBlacklistedEmployees = await SimulatedEmployeeBlacklistService.getBlacklistedEmployees(requestId);
      const allBlacklistedEmployees = [...blacklistedEmployees, ...dbBlacklistedEmployees];
      
      console.log('Finding employee with blacklist:', allBlacklistedEmployees);
      
      const employee = getRandomEmployee(allBlacklistedEmployees);
      
      if (!employee) {
        console.log('No available employees found');
        setStatus('declined');
        setDeclineReason('No available employees. Please try again later.');
        setShowRealTimeUpdate(false);
        setCurrentEmployeeName('');
        return;
      }

      console.log('Selected employee:', employee.full_name);
      
      // Immediately set the employee name to avoid "Unknown" display
      setCurrentEmployeeName(employee.full_name);

      // Simulate employee response delay (2-5 seconds)
      setTimeout(() => {
        const basePrices = {
          'flat-tyre': 40,
          'out-of-fuel': 30,
          'car-battery': 60,
          'tow-truck': 100,
          'emergency': 80,
          'other-car-problems': 50,
          'support': 50
        };
        
        const basePrice = basePrices[type] || 50;
        const randomPrice = basePrice + Math.floor(Math.random() * 20) - 10;
        const finalPrice = Math.max(20, randomPrice);
        
        console.log('Sending quote from employee:', employee.full_name, 'Amount:', finalPrice);
        onQuoteReceived(finalPrice);
        
        // Set employee location near user
        const employeeLocation = {
          lat: userLocation.lat + (Math.random() - 0.5) * 0.02,
          lng: userLocation.lng + (Math.random() - 0.5) * 0.02
        };
        setEmployeeLocation(employeeLocation);
      }, 2000 + Math.random() * 3000);
      
    } catch (error) {
      console.error('Error in employee simulation:', error);
      setStatus('declined');
      setDeclineReason('Error finding available employees. Please try again.');
      setShowRealTimeUpdate(false);
      setCurrentEmployeeName('');
    }
  }, [loadEmployees, getRandomEmployee]);

  const handleAccept = useCallback(async (
    requestId: string,
    priceQuote: number,
    employeeName: string,
    userId: string,
    userLocation: { lat: number; lng: number },
    employeeStartLocation: { lat: number; lng: number },
    etaSeconds: number,
    onEtaUpdate: (remaining: number) => void,
    onLocationUpdate: (location: { lat: number; lng: number }) => void,
    onCompletion: () => void
  ) => {
    if (!user) return;
    
    // Start ETA countdown
    let remainingTime = etaSeconds;
    const etaInterval = setInterval(() => {
      remainingTime--;
      onEtaUpdate(remainingTime);
      
      if (remainingTime <= 0) {
        clearInterval(etaInterval);
      }
    }, 1000);

    // Simulate employee movement towards user
    let currentLocation = { ...employeeStartLocation };
    const totalSteps = etaSeconds / 2;
    let step = 0;
    
    const movementInterval = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      
      currentLocation = {
        lat: employeeStartLocation.lat + (userLocation.lat - employeeStartLocation.lat) * progress,
        lng: employeeStartLocation.lng + (userLocation.lng - employeeStartLocation.lng) * progress
      };
      
      onLocationUpdate(currentLocation);
      
      if (step >= totalSteps) {
        clearInterval(movementInterval);
        setTimeout(onCompletion, 5000);
      }
    }, 2000);
    
    // Cleanup intervals after maximum time
    setTimeout(() => {
      clearInterval(etaInterval);
      clearInterval(movementInterval);
    }, (etaSeconds + 10) * 1000);
  }, [user]);

  const addEmployeeToBlacklist = useCallback(async (
    requestId: string,
    employeeName: string,
    userId: string
  ) => {
    try {
      await SimulatedEmployeeBlacklistService.addToBlacklist(requestId, employeeName, userId);
    } catch (error) {
      console.error('Error adding employee to blacklist:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    simulateEmployeeResponse,
    handleAccept,
    addEmployeeToBlacklist
  }), [simulateEmployeeResponse, handleAccept, addEmployeeToBlacklist]);
};
