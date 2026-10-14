<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MedTrust Codebase Agent Guidelines

When modifying or adding features to MedTrust:

1. **React 19 & Pure Hooks**:
   - Never call synchronous `setState` inside `useEffect` to avoid `react-hooks/set-state-in-effect` lint errors.
   - For resetting internal component state when props change, use render-phase prop adjustments (e.g., tracking `prevProp` in state) or use keys on the component.
   - Keep `useEffect` exclusively for asynchronous data fetches or event subscriptions.

2. **Zero Plaintext On-Chain**:
   - Never commit sensitive patient data, clinical notes, or unencrypted fields to Solana accounts or instruction parameters.
   - Only 32-byte SHA-256 digests and pseudonymous PDA seeds (`Record`, `Consent`) belong on-chain.

3. **Storage Boundary Enforcement**:
   - Any document retrieval endpoint (`/api/documents/[id]`) must verify on-chain consent state before releasing ciphertext.
   - Always return `HTTP 403 Forbidden` and log to `/api/audit` when unauthorized requests are detected.

4. **Mobile Responsiveness**:
   - Ensure all action buttons wrap cleanly on mobile screens (`flex flex-wrap items-center gap-2 sm:shrink-0`).
   - All tables or preformatted blocks must be contained in scrollable wrappers (`overflow-x-auto`).
   - Sticky header must contain the mobile menu toggle so navigation is always reachable.

5. **Strict Lint & Test Standards**:
   - Always verify `npm run lint` and `npm run build` in `web/`.
   - Always verify `npm test` at the project root (all 14 test suites must pass).
