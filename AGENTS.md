<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TypeScript Guidelines

- Do NOT use the `any` type under any circumstances. Always write explicit, strong types or use `unknown` if the type is truly dynamic, then perform proper type guards.
