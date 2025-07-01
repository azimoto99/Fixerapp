import { useState, useEffect } from 'react';

// Global modal state management
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
  };
};

// Create a global modal store for payment setup
let globalModalState = {
  isOpen: false,
  listeners: [] as Array<(isOpen: boolean) => void>,
};

export const usePaymentModal = () => {
  const [isOpen, setIsOpen] = useState(globalModalState.isOpen);

  const openModal = () => {
    globalModalState.isOpen = true;
    globalModalState.listeners.forEach(listener => listener(true));
  };

  const closeModal = () => {
    globalModalState.isOpen = false;
    globalModalState.listeners.forEach(listener => listener(false));
  };

  // Subscribe to changes
  useEffect(() => {
    const listener = (newIsOpen: boolean) => setIsOpen(newIsOpen);
    globalModalState.listeners.push(listener);
    
    return () => {
      globalModalState.listeners = globalModalState.listeners.filter(l => l !== listener);
    };
  }, []);

  return {
    isOpen,
    openModal,
    closeModal,
  };
};