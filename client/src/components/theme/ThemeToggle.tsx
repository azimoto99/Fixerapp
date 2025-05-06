import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ThemeToggleProps {
  variant?: "dropdown" | "radio" | "compact";
}

export function ThemeToggle({ variant = "dropdown" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  // After mounting, we can show the theme UI
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle theme change and ensure it's saved
  const handleThemeChange = (newTheme: string) => {
    try {
      // Set the theme in next-themes
      setTheme(newTheme);
      
      // Also explicitly save to localStorage as a backup
      localStorage.setItem('theme', newTheme);
      
      toast({
        title: "Theme Updated",
        description: `Theme set to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`,
        duration: 2000,
      });
      
      console.log(`Theme changed to: ${newTheme}`);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  if (!mounted) {
    return null;
  }

  if (variant === "radio") {
    return (
      <RadioGroup 
        value={theme} 
        onValueChange={handleThemeChange}
        className="space-y-4"
      >
        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 transition-colors bg-background/60">
          <RadioGroupItem value="light" id="light-theme" className="h-5 w-5" />
          <Label htmlFor="light-theme" className="flex items-center cursor-pointer text-sm font-medium">
            <Sun className="h-5 w-5 mr-3 text-amber-500" />
            Light Mode
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 transition-colors bg-background/60">
          <RadioGroupItem value="dark" id="dark-theme" className="h-5 w-5" />
          <Label htmlFor="dark-theme" className="flex items-center cursor-pointer text-sm font-medium">
            <Moon className="h-5 w-5 mr-3 text-blue-400" />
            Dark Mode
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 transition-colors bg-background/60">
          <RadioGroupItem value="system" id="system-theme" className="h-5 w-5" />
          <Label htmlFor="system-theme" className="flex items-center cursor-pointer text-sm font-medium">
            <Monitor className="h-5 w-5 mr-3 text-gray-400" />
            System Default
          </Label>
        </div>
      </RadioGroup>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant={theme === "light" ? "default" : "secondary"} 
          size="sm" 
          className={`h-9 px-3 ${theme === "light" ? "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border-amber-500/30" : "bg-muted/50"}`}
          onClick={() => setTheme("light")}
        >
          <Sun className="h-4 w-4 mr-1.5" />
          <span>Light</span>
        </Button>
        
        <Button 
          variant={theme === "dark" ? "default" : "secondary"} 
          size="sm" 
          className={`h-9 px-3 ${theme === "dark" ? "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-blue-500/30" : "bg-muted/50"}`}
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4 mr-1.5" />
          <span>Dark</span>
        </Button>
        
        <Button 
          variant={theme === "system" ? "default" : "secondary"} 
          size="sm" 
          className={`h-9 px-3 ${theme === "system" ? "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30 border-gray-500/30" : "bg-muted/50"}`}
          onClick={() => setTheme("system")}
        >
          <Monitor className="h-4 w-4 mr-1.5" />
          <span>Auto</span>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full h-9 w-9 bg-primary/5 hover:bg-primary/10 hover:text-primary"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] p-2">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="flex items-center cursor-pointer rounded-md mb-1 focus:bg-amber-500/10"
        >
          <div className="mr-2 h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Sun className="h-4 w-4 text-amber-600" />
          </div>
          <span>Light Mode</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="flex items-center cursor-pointer rounded-md mb-1 focus:bg-blue-500/10"
        >
          <div className="mr-2 h-7 w-7 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Moon className="h-4 w-4 text-blue-500" />
          </div>
          <span>Dark Mode</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="flex items-center cursor-pointer rounded-md focus:bg-gray-500/10"
        >
          <div className="mr-2 h-7 w-7 rounded-full bg-gray-500/15 flex items-center justify-center">
            <Monitor className="h-4 w-4 text-gray-500" />
          </div>
          <span>System Default</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}