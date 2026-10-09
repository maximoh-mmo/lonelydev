# Portfolio motion direction

Research and original local prototype, 9 October 2026. Reference: https://motionsites.ai/. Its live homepage uses a focal treatment on the final headline phrase. Several gallery preview videos could not play in the inspection browser, so their exact motion timing was not verified. No paid prompts or gallery assets were copied.

## Intended attention order

1. Role and relevance: C++ / Unreal, gameplay, multiplayer, tools.
2. Proof: personal ownership, architecture decisions, usable work.
3. Action: inspect the case study; then CV or contact.

## Proposed treatment

- Hero: draw a thin accent underline beneath “under pressure.” once, around 750ms. Keep the full sentence visible before motion. On the actual cinematic hero, retain its composition and use this as a small enhancement.
- Skills: a subtle background highlight across a single phrase, around 650ms. Do not animate each technology badge independently.
- Contributions: a one-time 8px settle of two concise proof statements as they enter view. Lead with end-to-end CTF ownership and server-authoritative gameplay. Keep text readable throughout. Use at most an 80ms stagger.
- System evidence: draw connecting lines once through a verified conceptual diagram. Label it appropriately; do not imply real telemetry or a particular network message order.
- Links: 180ms arrow movement and underline emphasis on hover and keyboard focus. The primary action is inspecting the work; CV and contact need no persistent pulsing.

## Constraints

One dominant attention cue per viewport. No repeating headline shimmer, typewriter delays, changing role words, animated body paragraphs, scroll hijacking, or cursor-following effects. Motion should settle quickly and leave a strong static design.

Use existing CSS and a shared IntersectionObserver hook; no animation package is required for this first pass. Prefer transforms and opacity for movement; keep the small text-highlight effect isolated. Text remains present without JavaScript. Trigger sections once, clean up observers on unmount, and use translated phrase boundaries rather than splitting strings by English words.

Respect prefers-reduced-motion by displaying the final static emphasis. Disable decorative movement while the CV dialog is open. Review mobile, both themes, English/German wrapping, keyboard focus, and layout stability.

Sources: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion.

Prototype: redesign-work/public/motion-study.html. It includes replay, light/dark comparison, and a reduced-motion toggle. It is an isolated exploration, not deployed to the preview branch. Browser review confirmed controls, desktop presentation, and a 375px mobile light layout without horizontal overflow. Device-level reduced motion and cross-browser behavior remain implementation-stage checks.
