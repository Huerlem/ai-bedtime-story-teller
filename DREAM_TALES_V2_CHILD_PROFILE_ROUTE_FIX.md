## Build fix: legacy ChildProfileManager path

The original `src/app/ChildProfileManager/page.js` exported a React component that requires `child`, `onUpdate` and `onCancel` props. Next.js App Router pages cannot accept arbitrary props; CI correctly failed its type contract.

The component has been preserved verbatim at `src/components/family/ChildProfileManager.jsx`. The legacy route now redirects to `/my-children`. Future UI work should import the component where the parent selects a child, instead of rendering it as a route.

The approved Dream Tales Figma design remains authoritative.
