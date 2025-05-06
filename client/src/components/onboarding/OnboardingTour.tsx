import React, { useState, useEffect } from 'react';
import GuidedTooltip from './GuidedTooltip';

export interface TourStep {
  id: string;
  title: string;
  content: string | React.ReactNode;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  characterExpression?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
  highlight?: boolean;
  highlightPulse?: boolean;
  delay?: number;
}

interface OnboardingTourProps {
  tourId: string;
  steps: TourStep[];
  autoStart?: boolean;
  onComplete?: () => void;
  startAt?: number;
  forceShow?: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  tourId,
  steps,
  autoStart = true,
  onComplete,
  startAt = 0,
  forceShow = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(startAt);
  const [isTourActive, setIsTourActive] = useState<boolean>(autoStart);
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(false);

  // Check if tour has been completed before
  useEffect(() => {
    if (forceShow) {
      setHasCompletedTour(false);
      return;
    }
    
    const completedTours = localStorage.getItem('completedTours');
    if (completedTours) {
      const parsedCompleted = JSON.parse(completedTours);
      if (parsedCompleted.includes(tourId)) {
        setHasCompletedTour(true);
        setIsTourActive(false);
      }
    }
  }, [tourId, forceShow]);

  const handleStepComplete = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const handleStepClose = () => {
    // Only mark the tour as complete if explicitly closed by the user
    completeTour();
  };

  const completeTour = () => {
    setIsTourActive(false);
    
    // Save the completed tour to localStorage
    if (!hasCompletedTour) {
      const completedTours = localStorage.getItem('completedTours');
      let parsedCompleted = completedTours ? JSON.parse(completedTours) : [];
      
      if (!parsedCompleted.includes(tourId)) {
        parsedCompleted.push(tourId);
        localStorage.setItem('completedTours', JSON.stringify(parsedCompleted));
      }
      
      setHasCompletedTour(true);
      if (onComplete) onComplete();
    }
  };

  // If tour is not active or already completed, don't render
  if (!isTourActive || (hasCompletedTour && !forceShow)) {
    return null;
  }

  const currentTourStep = steps[currentStep];

  return (
    <GuidedTooltip
      id={`${tourId}-step-${currentStep}`}
      title={currentTourStep.title}
      content={currentTourStep.content}
      position={currentTourStep.position || 'bottom'}
      targetSelector={currentTourStep.targetSelector}
      characterExpression={currentTourStep.characterExpression || 'happy'}
      highlight={currentTourStep.highlight || false}
      highlightPulse={currentTourStep.highlightPulse || false}
      delay={currentTourStep.delay || 0}
      showNextButton={currentStep < steps.length - 1}
      forceShow={true}
      onNext={handleStepComplete}
      onClose={handleStepClose}
      persist={true}
    />
  );
};

export default OnboardingTour;