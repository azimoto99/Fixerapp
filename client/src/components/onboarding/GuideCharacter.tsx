import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Character expressions
type Expression = 'happy' | 'thinking' | 'excited' | 'confused' | 'pointing';

interface GuideCharacterProps {
  expression?: Expression;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const GuideCharacter: React.FC<GuideCharacterProps> = ({
  expression = 'happy',
  position = 'bottom-right',
  className,
  animate = true,
  size = 'md',
}) => {
  const [currentExpression, setCurrentExpression] = useState<Expression>(expression);
  
  // Occasionally change expression for fun if animate is true
  useEffect(() => {
    if (!animate) return;
    
    // Set initial expression
    setCurrentExpression(expression);
    
    // Occasionally change to a random expression
    const interval = setInterval(() => {
      const expressions: Expression[] = ['happy', 'thinking', 'excited', 'confused', 'pointing'];
      const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
      setCurrentExpression(randomExpression);
    }, 8000); // Change expression every 8 seconds
    
    return () => clearInterval(interval);
  }, [expression, animate]);

  // Map expressions to SVG paths
  const getExpressionSvg = () => {
    switch (currentExpression) {
      case 'happy':
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Eyes */}
            <circle cx="35" cy="40" r="5" fill="#1f2937" />
            <circle cx="65" cy="40" r="5" fill="#1f2937" />
            {/* Happy mouth */}
            <path d="M30,60 Q50,80 70,60" stroke="#1f2937" strokeWidth="3" fill="none" />
          </svg>
        );
      case 'thinking':
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Eyes */}
            <circle cx="35" cy="40" r="5" fill="#1f2937" />
            <circle cx="65" cy="40" r="5" fill="#1f2937" />
            {/* Thinking mouth */}
            <path d="M35,60 L65,60" stroke="#1f2937" strokeWidth="3" fill="none" />
            {/* Thinking bubble */}
            <circle cx="80" cy="20" r="8" fill="#d1d5db" />
          </svg>
        );
      case 'excited':
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Excited eyes */}
            <circle cx="35" cy="40" r="6" fill="#1f2937" />
            <circle cx="65" cy="40" r="6" fill="#1f2937" />
            {/* Excited mouth */}
            <circle cx="50" cy="65" r="10" fill="#ef4444" />
            <circle cx="50" cy="60" r="8" fill="#f9fafb" />
            {/* Sparkles */}
            <path d="M15,15 L20,20 M15,20 L20,15" stroke="#facc15" strokeWidth="2" />
            <path d="M80,25 L85,30 M80,30 L85,25" stroke="#facc15" strokeWidth="2" />
            <path d="M75,75 L80,80 M75,80 L80,75" stroke="#facc15" strokeWidth="2" />
          </svg>
        );
      case 'confused':
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Confused eyes */}
            <circle cx="35" cy="40" r="5" fill="#1f2937" />
            <circle cx="65" cy="40" r="5" fill="#1f2937" />
            {/* Confused mouth */}
            <path d="M35,65 Q50,55 65,65" stroke="#1f2937" strokeWidth="3" fill="none" />
            {/* Question mark */}
            <text x="70" y="30" fontSize="24" fill="#1f2937">?</text>
          </svg>
        );
      case 'pointing':
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Eyes */}
            <circle cx="35" cy="40" r="5" fill="#1f2937" />
            <circle cx="65" cy="40" r="5" fill="#1f2937" />
            {/* Smiling mouth */}
            <path d="M35,60 Q50,70 65,60" stroke="#1f2937" strokeWidth="3" fill="none" />
            {/* Pointing arm */}
            <path d="M20,50 L-10,30" stroke="#4f46e5" strokeWidth="5" />
            <circle cx="-15" cy="25" r="5" fill="#4f46e5" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Default character base */}
            <circle cx="50" cy="50" r="40" fill="#4f46e5" />
            {/* Face */}
            <circle cx="50" cy="50" r="35" fill="#f9fafb" />
            {/* Eyes */}
            <circle cx="35" cy="40" r="5" fill="#1f2937" />
            <circle cx="65" cy="40" r="5" fill="#1f2937" />
            {/* Neutral mouth */}
            <path d="M35,60 Q50,65 65,60" stroke="#1f2937" strokeWidth="3" fill="none" />
          </svg>
        );
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed z-[100] cursor-pointer transition-all duration-300',
          positionClasses[position],
          sizeClasses[size],
          className
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {getExpressionSvg()}
      </motion.div>
    </AnimatePresence>
  );
};

export default GuideCharacter;