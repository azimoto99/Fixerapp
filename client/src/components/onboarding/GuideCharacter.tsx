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
        return React.createElement(
          'svg', 
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "5", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "5", fill: "#1f2937" }),
            // Happy mouth
            React.createElement('path', { key: 'mouth', d: "M30,60 Q50,80 70,60", stroke: "#1f2937", strokeWidth: "3", fill: "none" })
          ]
        );
      case 'thinking':
        return React.createElement(
          'svg',
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "5", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "5", fill: "#1f2937" }),
            // Thinking mouth
            React.createElement('path', { key: 'mouth', d: "M35,60 L65,60", stroke: "#1f2937", strokeWidth: "3", fill: "none" }),
            // Thinking bubble
            React.createElement('circle', { key: 'bubble', cx: "80", cy: "20", r: "8", fill: "#d1d5db" })
          ]
        );
      case 'excited':
        return React.createElement(
          'svg',
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Excited eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "6", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "6", fill: "#1f2937" }),
            // Excited mouth
            React.createElement('circle', { key: 'mouth1', cx: "50", cy: "65", r: "10", fill: "#ef4444" }),
            React.createElement('circle', { key: 'mouth2', cx: "50", cy: "60", r: "8", fill: "#f9fafb" }),
            // Sparkles
            React.createElement('path', { key: 'sparkle1', d: "M15,15 L20,20 M15,20 L20,15", stroke: "#facc15", strokeWidth: "2" }),
            React.createElement('path', { key: 'sparkle2', d: "M80,25 L85,30 M80,30 L85,25", stroke: "#facc15", strokeWidth: "2" }),
            React.createElement('path', { key: 'sparkle3', d: "M75,75 L80,80 M75,80 L80,75", stroke: "#facc15", strokeWidth: "2" })
          ]
        );
      case 'confused':
        return React.createElement(
          'svg',
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Confused eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "5", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "5", fill: "#1f2937" }),
            // Confused mouth
            React.createElement('path', { key: 'mouth', d: "M35,65 Q50,55 65,65", stroke: "#1f2937", strokeWidth: "3", fill: "none" }),
            // Question mark
            React.createElement('text', { key: 'question', x: "70", y: "30", fontSize: "24", fill: "#1f2937" }, "?")
          ]
        );
      case 'pointing':
        return React.createElement(
          'svg',
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "5", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "5", fill: "#1f2937" }),
            // Smiling mouth
            React.createElement('path', { key: 'mouth', d: "M35,60 Q50,70 65,60", stroke: "#1f2937", strokeWidth: "3", fill: "none" }),
            // Pointing arm
            React.createElement('path', { key: 'arm', d: "M20,50 L-10,30", stroke: "#4f46e5", strokeWidth: "5" }),
            React.createElement('circle', { key: 'hand', cx: "-15", cy: "25", r: "5", fill: "#4f46e5" })
          ]
        );
      default:
        return React.createElement(
          'svg',
          { viewBox: "0 0 100 100", xmlns: "http://www.w3.org/2000/svg" },
          [
            // Default character base
            React.createElement('circle', { key: 'base', cx: "50", cy: "50", r: "40", fill: "#4f46e5" }),
            // Face
            React.createElement('circle', { key: 'face', cx: "50", cy: "50", r: "35", fill: "#f9fafb" }),
            // Eyes
            React.createElement('circle', { key: 'eye1', cx: "35", cy: "40", r: "5", fill: "#1f2937" }),
            React.createElement('circle', { key: 'eye2', cx: "65", cy: "40", r: "5", fill: "#1f2937" }),
            // Neutral mouth
            React.createElement('path', { key: 'mouth', d: "M35,60 Q50,65 65,60", stroke: "#1f2937", strokeWidth: "3", fill: "none" })
          ]
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