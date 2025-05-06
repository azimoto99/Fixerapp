import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  variant?: "dropdown" | "radio" | "compact";
}

export function ThemeToggle({ variant = "dropdown" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we can show the theme UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (variant === "radio") {
    return (
      <Card>
        <CardContent className="pt-6">
          <RadioGroup 
            value={theme} 
            onValueChange={setTheme}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light-theme" />
              <Label htmlFor="light-theme" className="flex items-center cursor-pointer">
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark-theme" />
              <Label htmlFor="dark-theme" className="flex items-center cursor-pointer">
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system-theme" />
              <Label htmlFor="system-theme" className="flex items-center cursor-pointer">
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center space-x-2">
        <Button 
          variant={theme === "light" ? "default" : "outline"} 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setTheme("light")}
        >
          <Sun className="h-4 w-4" />
          <span className="sr-only">Light</span>
        </Button>
        
        <Button 
          variant={theme === "dark" ? "default" : "outline"} 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4" />
          <span className="sr-only">Dark</span>
        </Button>
        
        <Button 
          variant={theme === "system" ? "default" : "outline"} 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setTheme("system")}
        >
          <Monitor className="h-4 w-4" />
          <span className="sr-only">System</span>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4 mr-2" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}