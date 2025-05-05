import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { CheckIcon, Moon, Sun } from "lucide-react";

export function DropdownThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-1 w-full">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setTheme("light")}
        className={`flex flex-col h-auto gap-1 items-center justify-center px-2 py-1.5 ${theme === "light" ? "bg-accent" : ""}`}
      >
        <Sun className="h-4 w-4" />
        <span className="text-xs">Light</span>
        {theme === "light" && <CheckIcon className="h-3 w-3 text-primary absolute right-1 top-1" />}
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setTheme("dark")}
        className={`flex flex-col h-auto gap-1 items-center justify-center px-2 py-1.5 ${theme === "dark" ? "bg-accent" : ""}`}
      >
        <Moon className="h-4 w-4" />
        <span className="text-xs">Dark</span>
        {theme === "dark" && <CheckIcon className="h-3 w-3 text-primary absolute right-1 top-1" />}
      </Button>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setTheme("system")}
        className={`flex flex-col h-auto gap-1 items-center justify-center px-2 py-1.5 ${theme === "system" ? "bg-accent" : ""}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.5C16.9706 21.5 21 17.4706 21 12.5C21 7.52944 16.9706 3.5 12 3.5C7.02944 3.5 3 7.52944 3 12.5C3 17.4706 7.02944 21.5 12 21.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 8.5V12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 2.5H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs">System</span>
        {theme === "system" && <CheckIcon className="h-3 w-3 text-primary absolute right-1 top-1" />}
      </Button>
    </div>
  );
}