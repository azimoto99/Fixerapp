import React, { createContext, useContext, useState, useEffect } from 'react';
import GuidedTooltip from './GuidedTooltip';
import OnboardingTour, { TourStep } from './OnboardingTour';
import { useAuth } from '@/hooks/use-auth';

interface OnboardingContextType {
  showTooltip: (
    id: string,
    title: string,
    content: string | React.ReactNode,
    options?: {
      targetSelector?: string;
      position?: 'top' | 'right' | 'bottom' | 'left';
      characterExpression?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
      highlight?: boolean;
      highlightPulse?: boolean;
      delay?: number;
      persist?: boolean;
    }
  ) => void;
  dismissTooltip: (id: string) => void;
  dismissAllTooltips: () => void;
  startTour: (tourId: string, steps: TourStep[], startAt?: number) => void;
  completeTour: (tourId: string) => void;
  hasTourBeenCompleted: (tourId: string) => boolean;
  resetOnboarding: () => void;
  setUserCompletedAction: (actionId: string) => void;
  hasUserCompletedAction: (actionId: string) => boolean;
}

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface TooltipState {
  id: string;
  title: string;
  content: string | React.ReactNode;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  characterExpression?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
  highlight?: boolean;
  highlightPulse?: boolean;
  delay?: number;
  persist?: boolean;
}

interface TourState {
  tourId: string;
  steps: TourStep[];
  active: boolean;
  startAt: number;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [tooltips, setTooltips] = useState<TooltipState[]>([]);
  const [tours, setTours] = useState<TourState[]>([]);
  const [completedActions, setCompletedActions] = useState<string[]>([]);
  const { user } = useAuth();

  // Load completed actions from localStorage
  useEffect(() => {
    if (!user) return;
    
    const userCompletedActions = localStorage.getItem(`${user.id}-completedActions`);
    if (userCompletedActions) {
      setCompletedActions(JSON.parse(userCompletedActions));
    }
  }, [user]);

  const showTooltip = (
    id: string,
    title: string,
    content: string | React.ReactNode,
    options?: {
      targetSelector?: string;
      position?: 'top' | 'right' | 'bottom' | 'left';
      characterExpression?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
      highlight?: boolean;
      highlightPulse?: boolean;
      delay?: number;
      persist?: boolean;
    }
  ) => {
    // Check if tooltip is already displayed
    if (tooltips.some(t => t.id === id)) {
      return;
    }
    
    setTooltips(prev => [
      ...prev,
      {
        id,
        title,
        content,
        targetSelector: options?.targetSelector,
        position: options?.position || 'bottom',
        characterExpression: options?.characterExpression || 'happy',
        highlight: options?.highlight || false,
        highlightPulse: options?.highlightPulse || false,
        delay: options?.delay || 0,
        persist: options?.persist || false,
      }
    ]);
  };

  const dismissTooltip = (id: string) => {
    setTooltips(prev => prev.filter(tooltip => tooltip.id !== id));
  };

  const dismissAllTooltips = () => {
    setTooltips([]);
  };

  const startTour = (tourId: string, steps: TourStep[], startAt: number = 0) => {
    // Check if tour already exists
    const existingTourIndex = tours.findIndex(t => t.tourId === tourId);
    
    if (existingTourIndex >= 0) {
      // Update existing tour
      setTours(prev => {
        const updatedTours = [...prev];
        updatedTours[existingTourIndex] = {
          ...updatedTours[existingTourIndex],
          steps,
          active: true,
          startAt
        };
        return updatedTours;
      });
    } else {
      // Add new tour
      setTours(prev => [
        ...prev,
        {
          tourId,
          steps,
          active: true,
          startAt
        }
      ]);
    }
  };

  const completeTour = (tourId: string) => {
    setTours(prev => prev.map(tour => 
      tour.tourId === tourId 
        ? { ...tour, active: false } 
        : tour
    ));
  };

  const hasTourBeenCompleted = (tourId: string): boolean => {
    const completedTours = localStorage.getItem('completedTours');
    if (completedTours) {
      const parsedCompleted = JSON.parse(completedTours);
      return parsedCompleted.includes(tourId);
    }
    return false;
  };

  const resetOnboarding = () => {
    // Clear all localStorage related to onboarding
    localStorage.removeItem('dismissedTooltips');
    localStorage.removeItem('completedTours');
    
    if (user) {
      localStorage.removeItem(`${user.id}-completedActions`);
    }
    
    // Reset state
    setTooltips([]);
    setTours([]);
    setCompletedActions([]);
  };

  const setUserCompletedAction = (actionId: string) => {
    if (!user) return;
    
    setCompletedActions(prev => {
      if (prev.includes(actionId)) return prev;
      
      const newCompletedActions = [...prev, actionId];
      localStorage.setItem(`${user.id}-completedActions`, JSON.stringify(newCompletedActions));
      return newCompletedActions;
    });
  };

  const hasUserCompletedAction = (actionId: string): boolean => {
    return completedActions.includes(actionId);
  };

  return (
    <OnboardingContext.Provider
      value={{
        showTooltip,
        dismissTooltip,
        dismissAllTooltips,
        startTour,
        completeTour,
        hasTourBeenCompleted,
        resetOnboarding,
        setUserCompletedAction,
        hasUserCompletedAction,
      }}
    >
      {children}
      
      {/* Render active tooltips */}
      {tooltips.map(tooltip => (
        <GuidedTooltip
          key={tooltip.id}
          id={tooltip.id}
          title={tooltip.title}
          content={tooltip.content}
          position={tooltip.position}
          targetSelector={tooltip.targetSelector}
          characterExpression={tooltip.characterExpression}
          highlight={tooltip.highlight}
          highlightPulse={tooltip.highlightPulse}
          delay={tooltip.delay}
          onClose={() => dismissTooltip(tooltip.id)}
          persist={tooltip.persist}
        />
      ))}
      
      {/* Render active tours */}
      {tours
        .filter(tour => tour.active)
        .map(tour => (
          <OnboardingTour
            key={tour.tourId}
            tourId={tour.tourId}
            steps={tour.steps}
            startAt={tour.startAt}
            autoStart={true}
            onComplete={() => completeTour(tour.tourId)}
          />
        ))
      }
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingProvider;