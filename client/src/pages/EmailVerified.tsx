import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function EmailVerified() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-semibold mb-4">Email Verified ✓</h1>
      <p className="text-muted-foreground max-w-md">
        Your email has been successfully verified. You can now sign in and enjoy all features of Fixer.
      </p>
      <Button asChild className="mt-6">
        <Link href="/auth">Continue to Login</Link>
      </Button>
    </div>
  );
} 