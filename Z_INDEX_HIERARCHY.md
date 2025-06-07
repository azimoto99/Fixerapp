# Z-Index Hierarchy - Complete Component Structure

## Overview
This document provides a complete hierarchical structure of all components organized by their z-index values, from lowest to highest.

---

## Z-Index Hierarchy (Lowest to Highest)

### **Layer 1: Base Content (z-1 to z-10)**
```
z-1
└── NavigationMenuIndicator (ui/navigation-menu.tsx)

z-10
├── AddressAutocompleteInput - MapPin icon (AddressAutocompleteInput.tsx)
├── JobDetailsCard - Close button (jobs/JobDetailsCard.tsx)
├── MessagingDrawer - Header (MessagingDrawer.tsx)
├── Sidebar - Fixed sidebar (ui/sidebar.tsx)
├── InputOTP - Active state (ui/input-otp.tsx)
├── Button - Tab focus state (ui/button.tsx)
├── NavigationMenuList (ui/navigation-menu.tsx)
└── Calendar - Focus state (ui/calendar.tsx)
```

### **Layer 2: Navigation & UI Elements (z-20 to z-30)**
```
z-20
└── Sidebar - Resize handle (ui/sidebar.tsx)

z-30
├── Home - Post Job Button (pages/Home.tsx)
├── Home - Bottom section (pages/Home.tsx)
├── MapSection - Top controls (MapSection.tsx)
├── MinimalMobileNav - Bottom navigation (MinimalMobileNav.tsx)
└── MobileNav - Bottom navigation (MobileNav.tsx)
```

### **Layer 3: Floating Elements (z-40 to z-50)**
```
z-40
└── NewJobButton - Floating action button (NewJobButton.tsx)

z-50
├── Home - User drawer (pages/Home.tsx)
├── App - Development banner (App.tsx)
├── AddressAutocompleteInput - Dropdown (AddressAutocompleteInput.tsx)
├── DirectConnect - Banner & Modal (DirectConnect.tsx)
├── JobDetailsCard - Action buttons (jobs/JobDetailsCard.tsx)
├── JobDetailsCard - Bottom panel (jobs/JobDetailsCard.tsx)
├── ExpoConnectGuide - Button & Modal (ExpoConnectGuide.tsx)
├── ConnectionStatus - Status indicator (connection-status.tsx)
├── EnhancedTicketDialog - Modal & Content (EnhancedTicketDialog.tsx)
├── OfflineNotice - Alert (OfflineNotice.tsx)
├── WebSocketDebug - Debug card (WebSocketDebug.tsx)
├── HoverCard - Content (ui/hover-card.tsx)
├── AlertDialog - Overlay & Content (ui/alert-dialog.tsx)
├── Sheet - Overlay & Content (ui/sheet.tsx)
├── Tooltip - Content (ui/tooltip.tsx)
├── Form - Error messages (ui/form.tsx)
└── MenubarSubContent (ui/menubar.tsx)
```

### **Layer 4: Guide & Onboarding (z-99 to z-100)**
```
z-99
└── GuidedTooltip - Tooltip content (onboarding/GuidedTooltip.tsx)

z-100
└── GuideCharacter - Character overlay (onboarding/GuideCharacter.tsx)
```

### **Layer 5: Map & Content Overlays (z-900)**
```
z-900
├── MapSection - Job cards overlay (MapSection.tsx)
├── MapSection - Header sticky (MapSection.tsx)
└── MapSection - Footer sticky (MapSection.tsx)
```

### **Layer 6: System Overlays (z-9000 to z-9999)**
```
z-9000
└── Footer - Global footer (Footer.tsx)

z-9999
├── ContextMenu - Content & SubContent (ui/context-menu.tsx)
├── Popover - Content (ui/popover.tsx)
├── Select - Content (ui/select.tsx)
├── NavigationMenu - Content & Viewport (ui/navigation-menu.tsx)
├── MenubarContent (ui/menubar.tsx)
├── DropdownMenu - Content & SubContent (ui/dropdown-menu.tsx)
├── Toast - Toast container (ui/toast.tsx)
└── Alert - Alert messages (ui/alert.tsx)
```

### **Layer 7: Modal Overlays (z-9999 to z-10000)**
```
z-9999
├── JobDetailsCard - Modal overlay (jobs/JobDetailsCard.tsx)
└── ApplicationModal - Modal overlay (jobs/ApplicationModal.tsx)

z-10000
└── PaymentNotification - Payment modal (PaymentNotification.tsx)
```

### **Layer 8: Critical Dialogs (z-999999)**
```
z-999999
└── PaymentDialog - Payment form dialog (payments/PaymentDialog.tsx)
```

### **Layer 9: Ultra High Priority (z-999999999)**
```
z-999999999
└── SimpleToast - Ultra priority toasts (SimpleToast.tsx)
```

---

## Z-Index Categories Summary

| **Range** | **Purpose** | **Components** |
|-----------|-------------|----------------|
| `1-10` | Base content, focus states | Navigation indicators, input focus |
| `20-30` | Navigation, mobile UI | Bottom nav, mobile controls |
| `40-50` | Floating elements, modals | FABs, dropdowns, basic modals |
| `99-100` | Onboarding, guides | Tutorial tooltips, guide characters |
| `900` | Map overlays | Map-specific UI elements |
| `9000-9999` | System UI | Footer, dropdowns, menus, toasts |
| `9999-10000` | Modal overlays | Job modals, application forms |
| `999999` | Critical dialogs | Payment forms |
| `999999999` | Emergency toasts | Critical system messages |

---

## Potential Issues & Recommendations

### ⚠️ **Issues Identified:**
1. **Gap in hierarchy**: Large jump from z-50 to z-99
2. **Inconsistent ranges**: Some components use z-50, others z-9999 for similar purposes
3. **Ultra-high values**: z-999999999 is unnecessarily high

### ✅ **Recommendations:**
1. **Standardize ranges**:
   - Base: `1-10`
   - Navigation: `20-30` 
   - Floating: `40-60`
   - Modals: `100-200`
   - System: `1000-2000`
   - Critical: `9000-9999`

2. **Remove ultra-high values**: Replace z-999999999 with z-9999
3. **Consolidate similar components**: Use consistent z-index for similar UI patterns

---

**Last Updated**: Current as of latest codebase analysis  
**Total Components**: 50+ components with explicit z-index values 