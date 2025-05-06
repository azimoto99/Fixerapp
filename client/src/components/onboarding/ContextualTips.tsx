import React, { useEffect, useState } from 'react';
import { useOnboarding } from './OnboardingProvider';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { TourStep } from './OnboardingTour';

interface TipDefinition {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  character?: 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';
  highlight?: boolean;
  highlightPulse?: boolean;
  condition?: () => boolean;
  priority: number;
  delay?: number;
}

const ContextualTips: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const { 
    showTooltip, 
    hasUserCompletedAction, 
    setUserCompletedAction,
    hasTourBeenCompleted,
    startTour 
  } = useOnboarding();
  const [shownTipIds, setShownTipIds] = useState<string[]>([]);

  // Define all potential tips
  const allTips: TipDefinition[] = [
    // Home page map tips
    {
      id: 'map-introduction',
      title: 'Find Jobs Near You',
      content: 'The map shows available jobs in your area. Click on any marker to see job details.',
      targetSelector: '.leaflet-container',
      position: 'top',
      character: 'pointing',
      highlight: true,
      condition: () => location === '/' && !hasUserCompletedAction('viewed-job-details'),
      priority: 10,
      delay: 2000
    },
    {
      id: 'map-view-toggle',
      title: 'Try Different Map Views',
      content: 'Switch between standard markers and heat map to see where jobs are concentrated.',
      targetSelector: '.leaflet-control-container .leaflet-top .leaflet-control',
      position: 'right',
      character: 'excited',
      highlight: true,
      highlightPulse: true,
      condition: () => location === '/' && hasUserCompletedAction('viewed-job-details'),
      priority: 20,
      delay: 3000
    },
    
    // Stripe Connect tips
    {
      id: 'stripe-connect-intro',
      title: 'Set Up Payments',
      content: 'Complete your Stripe Connect account setup to receive payments for jobs.',
      targetSelector: '.stripe-connect-setup',
      position: 'bottom',
      character: 'thinking',
      highlight: true,
      condition: () => location.includes('/profile') && user?.accountType === 'worker',
      priority: 30
    },
    
    // User profile tips
    {
      id: 'complete-profile',
      title: 'Complete Your Profile',
      content: 'Add your skills and experience to help job posters find you and increase your chances of getting hired.',
      targetSelector: '.user-profile-form',
      position: 'right',
      character: 'happy',
      condition: () => location.includes('/profile') && user?.skills?.length === 0,
      priority: 40
    },
    
    // User drawer tips
    {
      id: 'user-drawer-intro',
      title: 'Manage Your Account',
      content: 'Access your profile, earnings, reviews, and settings from this menu.',
      targetSelector: '.user-drawer-trigger',
      position: 'bottom',
      character: 'pointing',
      highlight: true,
      condition: () => !hasUserCompletedAction('opened-user-drawer'),
      priority: 5,
      delay: 4000
    }
  ];
  
  // Show welcome tour for first-time users
  useEffect(() => {
    if (!user || hasTourBeenCompleted('welcome-tour')) return;
    
    const welcomeTourSteps: TourStep[] = [
      {
        id: 'welcome-1',
        title: 'Welcome to Fixer! 👋',
        content: 'Let me show you around so you can start finding or posting jobs right away.',
        position: 'bottom',
        characterExpression: 'excited',
      },
      {
        id: 'welcome-2',
        title: 'Find Jobs on the Map',
        content: 'The map shows available jobs in your area. Click on any marker to view details.',
        targetSelector: '.leaflet-container',
        position: 'top',
        characterExpression: 'pointing',
        highlight: true,
      },
      {
        id: 'welcome-3',
        title: 'Your Profile',
        content: 'Click your profile icon to manage your account, see earnings, and change settings.',
        targetSelector: '.user-drawer-trigger',
        position: 'bottom',
        characterExpression: 'happy',
        highlight: true,
        highlightPulse: true,
      },
      {
        id: 'welcome-4',
        title: 'Get Started!',
        content: 'You\'re all set! Explore available jobs or update your profile to start your journey.',
        position: 'bottom',
        characterExpression: 'excited',
      }
    ];
    
    startTour('welcome-tour', welcomeTourSteps);
  }, [user, hasTourBeenCompleted, startTour]);

  // Check and show contextual tips based on current state
  useEffect(() => {
    if (!user) return;
    
    // Find eligible tips that haven't been shown this session
    const eligibleTips = allTips
      .filter(tip => 
        !shownTipIds.includes(tip.id) && 
        (!tip.condition || tip.condition())
      )
      .sort((a, b) => a.priority - b.priority);
    
    // Show highest priority tip if any are eligible
    if (eligibleTips.length > 0) {
      const tipToShow = eligibleTips[0];
      const tipId = tipToShow.id;
      
      // Prevent showing the same tip again in this session
      if (!shownTipIds.includes(tipId)) {
        showTooltip(
          tipId,
          tipToShow.title,
          tipToShow.content,
          {
            targetSelector: tipToShow.targetSelector,
            position: tipToShow.position,
            characterExpression: tipToShow.character,
            highlight: tipToShow.highlight,
            highlightPulse: tipToShow.highlightPulse,
            delay: tipToShow.delay || 0
          }
        );
        
        // Mark this tip as shown in this session
        setShownTipIds(prev => [...prev, tipId]);
      }
    }
  }, [user, location, hasUserCompletedAction]);

  // Track user actions for contextual tips
  useEffect(() => {
    const trackViewedJobDetails = () => {
      const handleMarkerClick = () => {
        setUserCompletedAction('viewed-job-details');
      };
      
      // Add event listeners to job markers
      const markers = document.querySelectorAll('.job-marker');
      markers.forEach(marker => {
        marker.addEventListener('click', handleMarkerClick);
      });
      
      return () => {
        markers.forEach(marker => {
          marker.removeEventListener('click', handleMarkerClick);
        });
      };
    };
    
    const trackOpenedUserDrawer = () => {
      const userDrawerTrigger = document.querySelector('.user-drawer-trigger');
      if (userDrawerTrigger) {
        const handleUserDrawerOpen = () => {
          setUserCompletedAction('opened-user-drawer');
        };
        
        userDrawerTrigger.addEventListener('click', handleUserDrawerOpen);
        
        return () => {
          userDrawerTrigger.removeEventListener('click', handleUserDrawerOpen);
        };
      }
    };
    
    // Setup tracking for various user actions
    const cleanupFunctions = [
      trackViewedJobDetails(),
      trackOpenedUserDrawer()
    ];
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
    };
  }, [location, setUserCompletedAction]);
  
  // This component doesn't render anything directly
  return null;
};

export default ContextualTips;