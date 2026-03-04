# Decision: ToastProvider wraps entire app in layout.tsx

**Author:** Kane  
**Date:** 2026-03-04  
**Status:** Decided

## Decision
`<ToastProvider>` from `components/ui/Toast.tsx` is placed inside `<Auth0Provider>` in `layout.tsx`. Any client component in the app can call `useToast()` without prop drilling.

## Rationale
- Single mount point, no duplication
- Works at any depth in the component tree
- No external toast library dependency (pure Tailwind + React state)
- Auto-dismiss at 3.5s; positioned above mobile bottom nav (`bottom-24`) and bottom-right on desktop (`bottom-6`)

## Impact
- All client components in the app now have access to `useToast()`
- The `animate-toast-in` keyframe is defined in `globals.css`
- If backend services (Ripley) want to trigger toasts, they must go through a shared event bus or prop callback — the hook is frontend-only
