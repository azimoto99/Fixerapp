import { ThemeProvider as NextThemesProvider } from "next-themes";
import React, { useEffect } from "react";

export function ThemeProvider({ children, ...props }: React.PropsWithChildren<any>) {
  // Add debugging to track theme changes
  useEffect(() => {
    // Check localStorage on mount
    const storedTheme = localStorage.getItem('theme');
    console.log('Initial theme from localStorage:', storedTheme);
    
    // Watch for changes to the theme
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && mutation.target === document.documentElement) {
          const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
          console.log('Theme changed to:', currentTheme);
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      storageKey="theme" // Explicitly set the storage key
      disableTransitionOnChange={false} // Enable smooth transitions
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}