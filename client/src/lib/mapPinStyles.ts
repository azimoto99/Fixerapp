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
}

export interface PinConfig {
  category: string;
  paymentAmount: number;
  requiredSkills: string[];
  status: string;
  isHighlighted?: boolean;
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

// Payment tier sizing
const getPaymentTierSize = (amount: number): number => {
  if (amount <= 50) return 44; // Small - increased from 32
  if (amount <= 150) return 52; // Medium - increased from 40
  return 60; // Large - increased from 48
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
    borderWidth: 3,
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

/**
 * Generate complete pin style based on job configuration
 */
export const generatePinStyle = (config: PinConfig, isDark: boolean = false): PinStyle => {
  const categoryStyle = CATEGORY_STYLES[config.category] || CATEGORY_STYLES["Other"];
  const skillBorder = getSkillBorderStyle(config.requiredSkills);
  const statusMods = getStatusModifications(config.status);
  const size = getPaymentTierSize(config.paymentAmount);
  
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
export const generatePinCSS = (style: PinStyle): Record<string, string> => {
  return {
    width: `${style.size}px`,
    height: `${style.size}px`,
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: `${style.borderWidth}px`,
    borderStyle: style.borderStyle || "solid",
    color: style.textColor,
    boxShadow: `0 4px 12px ${style.shadowColor}, 0 2px 4px rgba(0,0,0,0.1)`,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: `${Math.max(18, style.size * 0.4)}px`,
    fontWeight: "bold",
    cursor: "pointer",
    transition: "filter 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    zIndex: "1",
    userSelect: "none",
    pointerEvents: "auto"
  };
};
