/**
 * Map Pin Styling System
 * Provides contextual styling for map pins based on job categories, skills, and payment amounts
 */

export interface PinStyle {
  backgroundColor: string;
  borderColor: string;
  icon: string;
  size: number;
  textColor: string;
  shadowColor: string;
  borderWidth: number;
  borderStyle?: string;
  isEnterprise?: boolean;
  pulse?: boolean;
}

export interface PinConfig {
  category: string;
  paymentAmount: number;
  requiredSkills: string[];
  status: string;
  isHighlighted?: boolean;
  isEnterprise?: boolean;
  enterpriseColor?: string;
  enterpriseIcon?: string;
  priority?: number;
}

// Category-based styling
const CATEGORY_STYLES: Record<string, Partial<PinStyle>> = {
  "Home Maintenance": {
    backgroundColor: "#3b82f6", // Blue
    icon: "🔧",
    shadowColor: "rgba(59, 130, 246, 0.4)"
  },
  "Cleaning": {
    backgroundColor: "#10b981", // Emerald
    icon: "🧽", 
    shadowColor: "rgba(16, 185, 129, 0.4)"
  },
  "Delivery": {
    backgroundColor: "#f59e0b", // Amber
    icon: "🚚",
    shadowColor: "rgba(245, 158, 11, 0.4)"
  },
  "Event Help": {
    backgroundColor: "#8b5cf6", // Violet
    icon: "🎉",
    shadowColor: "rgba(139, 92, 246, 0.4)"
  },
  "Moving": {
    backgroundColor: "#f97316", // Orange
    icon: "📦",
    shadowColor: "rgba(249, 115, 22, 0.4)"
  },
  "Tech Support": {
    backgroundColor: "#06b6d4", // Cyan
    icon: "💻",
    shadowColor: "rgba(6, 182, 212, 0.4)"
  },
  "Shopping": {
    backgroundColor: "#ec4899", // Pink
    icon: "🛒",
    shadowColor: "rgba(236, 72, 153, 0.4)"
  },
  "Pet Care": {
    backgroundColor: "#14b8a6", // Teal
    icon: "🐾",
    shadowColor: "rgba(20, 184, 166, 0.4)"
  },
  "Tutoring": {
    backgroundColor: "#6366f1", // Indigo
    icon: "📚",
    shadowColor: "rgba(99, 102, 241, 0.4)"
  },
  "Other": {
    backgroundColor: "#6b7280", // Gray
    icon: "❓",
    shadowColor: "rgba(107, 114, 128, 0.4)"
  }
};

// Payment tier sizing with zoom-based limits
const getPaymentTierSize = (amount: number, zoomLevel?: number): number => {
  let baseSize: number;
  if (amount <= 50) baseSize = 48; // Small - increased for better visibility
  else if (amount <= 150) baseSize = 56; // Medium - increased for better visibility
  else baseSize = 64; // Large - increased for better visibility

  // Apply zoom-based size limiting
  if (zoomLevel !== undefined) {
    // At zoom level 10 and below, cap the size to prevent pins from being too large
    if (zoomLevel <= 8) {
      baseSize = Math.min(baseSize, 36); // Very small for very zoomed out
    } else if (zoomLevel <= 10) {
      baseSize = Math.min(baseSize, 44); // Small for zoomed out
    } else if (zoomLevel <= 12) {
      baseSize = Math.min(baseSize, 52); // Medium for normal zoom
    }
    // At zoom 13+ use full size
  }

  return baseSize;
};

// Skill-based border styling
const getSkillBorderStyle = (skills: string[]): { borderColor: string; borderWidth: number; borderStyle?: string } => {
  const premiumSkills = ["Electrical", "Plumbing", "Computer Repair"];
  const physicalSkills = ["Heavy Lifting", "Moving", "Assembly"];
  const creativeSkills = ["Design", "Photography", "Writing", "Decoration"];
  
  const hasPremiumSkill = skills.some(skill => premiumSkills.includes(skill));
  const hasPhysicalSkill = skills.some(skill => physicalSkills.includes(skill));
  const hasCreativeSkill = skills.some(skill => creativeSkills.includes(skill));
  
  if (hasPremiumSkill) {
    return {
      borderColor: "#ffd700", // Gold
      borderWidth: 3,
      borderStyle: "solid"
    };
  }
  
  if (hasPhysicalSkill) {
    return {
      borderColor: "#ffffff",
      borderWidth: 4,
      borderStyle: "solid"
    };
  }
  
  if (hasCreativeSkill) {
    return {
      borderColor: "#ffffff",
      borderWidth: 2,
      borderStyle: "dashed"
    };
  }
  
  return {
    borderColor: "#ffffff",
    borderWidth: 5, // Increased for better visibility
    borderStyle: "solid"
  };
};

// Status-based modifications
const getStatusModifications = (status: string): Partial<PinStyle> => {
  switch (status) {
    case "assigned":
      return {
        backgroundColor: "#6b7280", // Gray out assigned jobs
        textColor: "#ffffff"
      };
    case "in_progress":
      return {
        borderColor: "#10b981", // Green border for in progress
        borderWidth: 3
      };
    case "completed":
      return {
        backgroundColor: "#374151", // Dark gray for completed
        textColor: "#9ca3af"
      };
    default:
      return {};
  }
};

// Dark mode adjustments
const getDarkModeAdjustments = (isDark: boolean, baseStyle: PinStyle): PinStyle => {
  if (!isDark) return baseStyle;
  
  return {
    ...baseStyle,
    // Slightly brighten colors for dark mode
    backgroundColor: adjustColorBrightness(baseStyle.backgroundColor, 20),
    borderColor: baseStyle.borderColor === "#ffffff" ? "#e5e7eb" : baseStyle.borderColor,
    textColor: "#ffffff"
  };
};

// Utility function to adjust color brightness
const adjustColorBrightness = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

// Enterprise hub pin specific styling
const getEnterprisePinStyle = (config: PinConfig, isDark: boolean = false): PinStyle => {
  // Make enterprise pins larger but not overwhelming
  let baseSize = 60; // Reduced from 100 to 60
  
  // Adjust size based on pin size setting
  if (config.category === 'small') baseSize = 45;
  else if (config.category === 'medium') baseSize = 60;
  else if (config.category === 'large') baseSize = 75;
  
  return {
    backgroundColor: config.enterpriseColor || '#FF6B6B',
    borderColor: isDark ? '#ffffff' : '#000000',
    borderWidth: 3, // Reduced from 5 to 3
    borderStyle: 'solid',
    icon: config.enterpriseIcon || '🏢',
    size: baseSize + (config.priority || 0) * 8, // Reduced multiplier from 15 to 8
    textColor: '#ffffff',
    shadowColor: 'rgba(255, 107, 107, 0.6)',
    isEnterprise: true,
    pulse: false // Disabled pulsing to reduce visual noise
  };
};

/**
 * Generate complete pin style based on job configuration
 */
export const generatePinStyle = (config: PinConfig, isDark: boolean = false, zoomLevel?: number): PinStyle => {
  // Handle enterprise pins differently
  if (config.isEnterprise) {
    return getEnterprisePinStyle(config, isDark);
  }
  
  const categoryStyle = CATEGORY_STYLES[config.category] || CATEGORY_STYLES["Other"];
  const skillBorder = getSkillBorderStyle(config.requiredSkills);
  const statusMods = getStatusModifications(config.status);
  const size = getPaymentTierSize(config.paymentAmount, zoomLevel);
  
  let baseStyle: PinStyle = {
    backgroundColor: categoryStyle.backgroundColor || "#6b7280",
    borderColor: skillBorder.borderColor,
    borderWidth: skillBorder.borderWidth,
    borderStyle: skillBorder.borderStyle,
    icon: categoryStyle.icon || "💼",
    size: size,
    textColor: "#ffffff",
    shadowColor: categoryStyle.shadowColor || "rgba(0, 0, 0, 0.3)"
  };
  
  // Apply status modifications
  baseStyle = { ...baseStyle, ...statusMods };
  
  // Apply highlighting if needed
  if (config.isHighlighted) {
    baseStyle.borderColor = "#fbbf24"; // Amber highlight
    baseStyle.borderWidth = 4;
    baseStyle.size = Math.min(baseStyle.size + 8, 56); // Slightly larger
  }
  
  // Apply dark mode adjustments
  return getDarkModeAdjustments(isDark, baseStyle);
};

/**
 * Generate CSS styles for a pin element
 */
export const generatePinCSS = (style: PinStyle, logoUrl?: string): Record<string, string> => {
  const baseStyles = {
    width: `${style.size}px`,
    height: `${style.size}px`,
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: `${style.borderWidth}px`,
    borderStyle: style.borderStyle || "solid",
    color: style.textColor,
    boxShadow: `0 6px 16px ${style.shadowColor}, 0 3px 6px rgba(0,0,0,0.15), inset 0 0 0 ${style.borderWidth}px ${style.borderColor}`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: `${Math.max(16, style.size * 0.35)}px`, // Reduced font size for better logo display
    fontWeight: "bold",
    cursor: "pointer",
    transition: "filter 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    zIndex: style.isEnterprise ? "10" : "1", // Enterprise pins on top
    userSelect: "none",
    pointerEvents: "auto",
    overflow: "hidden" // Ensure logos don't overflow
  };

  // If there's a logo URL, use it as background image
  if (logoUrl && style.isEnterprise) {
    return {
      ...baseStyles,
      backgroundImage: `url(${logoUrl})`,
      backgroundSize: "70%", // Logo takes up 70% of the pin
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      // Keep the background color as fallback
      backgroundColor: style.backgroundColor,
    };
  }
  
  // Add animation for enterprise pins if enabled
  if (style.pulse) {
    return {
      ...baseStyles,
      animation: "pulse 2s infinite"
    };
  }
  
  return baseStyles;
};

// Add CSS animation for pulsing effect (should be added to global styles)
export const enterprisePinAnimations = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
    }
    70% {
      box-shadow: 0 0 0 20px rgba(255, 107, 107, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
    }
  }
`;
