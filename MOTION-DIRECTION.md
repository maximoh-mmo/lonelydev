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

Prototype: public/motion-study.html, published at /motion-study.html as a reference page (not in navigation). It includes replay, light/dark comparison, and a reduced-motion toggle. Browser review confirmed controls, desktop presentation, and a 375px mobile light layout without horizontal overflow. Device-level reduced motion and cross-browser behavior remain implementation-stage checks.

## Implemented sequence (second pass, 9 October 2026)

Hero, from first paint (kicker and headline are never hidden):

| Time | Cue | Purpose |
| --- | --- | --- |
| 0.15s | Accent draws under the last line of "under pressure." (width measured in Home.jsx so it never overshoots a wrapped line in either language) | Claim |
| 0.55s | Highlight on "gameplay, multiplayer, and tools" | Role and relevance |
| 0.85s | Primary CTA underline extends to full width; arrow nudges once at 1.3s | Action |
| 1.05–1.4s | Proof rules draw down, then each claim settles | Proof |
| 1.6–1.95s | Image annotations: leader line, dot, label | Context |
| 2.6s | Scroll cue nudges twice, then stops | Next chapter |

The outlined headline words carry a dark halo and the left scrim is stronger, so they stay legible over the key art's logo. The primary CTA keeps a full underline as its static end state, distinguishing it from the quiet secondary action.

Onset diagram: authority boundary → lane headings → nodes row by row with connectors drawing between them → dedicated server fades in and briefly "locks" (accent ring that fades out) → note. Pointer users can hover a lane to highlight it as one path.

PhotoBoss: the evidence note slides in after the screenshot settles.

Kyoto case study (src/components/CaseStudy.motion.css, driven by src/hooks/useReveal.js): ownership rules draw down each claim; the CTF flow steps arrive in order, each briefly carrying the accent, then the drop/return branch; the authority row runs players → host → clients with a short emphasis on the host; decisions settle quietly.

All of it runs once. Reduced motion shows the final static state with no hidden pre-states; without JavaScript nothing is hidden.
