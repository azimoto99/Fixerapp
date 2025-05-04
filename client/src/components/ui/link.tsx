import { Link as WouterLink } from "wouter";
import { cn } from "@/lib/utils";

interface LinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function Link({ href, className, children, ...props }: LinkProps) {
  return (
    <WouterLink href={href}>
      <a className={cn(className)} {...props}>
        {children}
      </a>
    </WouterLink>
  );
}