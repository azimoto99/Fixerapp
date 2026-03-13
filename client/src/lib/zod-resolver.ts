import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";

// drizzle-zod generates Zod v4 schemas in this codebase, while the resolver
// package still types its API against the legacy top-level zod export.
export function zodResolver(
  schema: any,
  schemaOptions?: any,
  resolverOptions?: { mode?: "async" | "sync"; raw?: boolean },
): Resolver<any> {
  return baseZodResolver(
    schema as never,
    schemaOptions as never,
    resolverOptions,
  ) as unknown as Resolver<any>;
}
