/**
 * Stub types for Deno/Supabase Edge Runtime when editing in Node-based IDE.
 * The actual runtime provides these; this prevents TypeScript errors in the editor.
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};
