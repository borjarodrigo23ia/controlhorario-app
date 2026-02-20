# AI Agent Documentation (AGENTS.md)

## 1. Project Overview
**Name**: Fichajes App
**Purpose**: A Progressive Web App (PWA) for employee time tracking (fichajes), vacation management, and administrative oversight.
**Target Audience**: Employees (mobile/desktop) and Administrators.

## 2. Technology Stack
- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Maps**: React Leaflet / Leaflet
- **PWA**: @ducanh2912/next-pwa
- **Form Handling**: React Hook Form + Zod
- **Notifications**: Web Push (Service Workers)

## 3. Architecture & Project Structure

### Directory Map
- `src/app`: App Router pages and API routes.
    - `(admin)/admin`: Admin-specific pages (protected).
    - `(user)/fichajes`: Core user time-tracking interface.
    - `api`: Backend endpoints (Next.js API routes).
- `src/components`: UI components.
    - `ui`: Reusable primitives (buttons, cards, inputs).
    - `fichajes`: Components specific to time tracking logic.
    - `vacations`: Components for vacation requests.
    - `admin`: Admin dashboard components.
- `src/hooks`: Custom React hooks containing business logic.
    - **CRITICAL**: `useFichajes.ts` contains the core logic for clock-in/out, state management, and validation.
- `src/services`: API clients and data fetching logic.
- `src/lib`: Utility functions and shared helpers.
- `src/context`: Global state providers (AuthContext).

### Core Business Logic
#### Time Tracking (Fichajes)
- **State Source of Truth**: The `useFichajes` hook is the brain. It manages correct button states (Entrada vs Salida), pause logic, and synchronization with the backend.
- **Geolocation**: Required for clock-ins. Handled via `useGeolocationConfig` and `navigator.geolocation`.
- **Validation**:
    - *Distance Check*: Verifies if user is within range of a work center.
    - *Sequence Check*: Prevents double clock-ins or clock-outs.

#### Vacations
- Managed via `useVacations`.
- Users request days; Admins approve/reject.
- Visualized in `VacationQuotaCard`.

#### Corrections
- Users can request corrections for past entries (`useUserCorrections`).
- Admins review and approve corrections (`useCorrections`).

## 4. Key Components
- **`ActiveWorkCycleCard.tsx`**: The main interface for the user's current status. Displays start time, current duration, and control buttons (Pause, Stop).
- **`TimerCard.tsx`**: A visual timer showing elapsed time for the current session.
- **`SecurityGuard.tsx`**: Component likely used to protect routes or enforce security policies in production.
- **`PageHeader.tsx`**: Standardized header for internal pages.

## 5. Coding Guidelines & Best Practices
1.  **Strict TypeScript**: Avoid `any`. Define interfaces for all API responses and component props.
2.  **Tailwind First**: Use utility classes for styling. Avoid custom CSS files unless necessary for complex animations.
3.  **Mobile-First Design**: This is a PWA used primarily on phones. Ensure all UIs are touch-friendly and responsive.
    - Use `safe-area-inset` for mobile notches.
    - Test hover states (should be accessible or non-critical on touch).
4.  **Error Handling**:
    - Use `react-hot-toast` for user feedback.
    - Log non-critical errors to console (or monitoring service).
5.  **Server Components vs Client Components**:
    - Use `'use client'` only when hook/state is needed.
    - Prefer Server Components for initial data fetching where possible.

## 6. Known Context & Gotchas
- **Geolocation Issues**: Browser permissions can be flaky on mobile. The app implements fallbacks/retries.
- **Timezones**: Always handle dates in ISO format or UTC to avoid client-server mismatches. API likely expects specific formats.
- **PWA Caching**: Updates might not reflect immediately due to Service Worker caching. `usePullToRefresh` helps force updates.
- **Dolibarr Integration**: The backend appears to interface with a Dolibarr ERP (inferred from `dolibarr-custom` folder). All data schemas should respect Dolibarr's expectations.

## 7. Workflow for Agents
1.  **Read `AGENTS.md`** (this file) to ground yourself.
2.  **Check `task.md`** for current objectives.
3.  **Use `useFichajes.ts`** as the reference implementation for any time-tracking logic changes.
4.  **Verify changes** on mobile viewports.

## 9. Admin Platform Evolution (Desktop vs Mobile)
The administration panels have undergone a significant evolution to serve two distinct user experiences based on screen size:

### Hybrid Layout Strategy
The app uses Tailwind's `lg` (1024px) breakpoint to conditionally switch between a modern desktop dashboard and a restored legacy mobile view (Commit `ce4b5304`).
- **Desktop (≥1024px)**: 
    - **Dashboard**: Features a multi-widget layout (`WhosWorking`, `Clock`, `Corrections`, `Vacations`).
    - **Split-View**: Management pages (Users, Centers) use a left-list / right-detail split layout.
- **Mobile (<1024px)**:
    - **Navigation**: Restores `Link`-based navigation for better browser history support.
    - **Visuals**: Uses the original gradient cards and specific status icons.
    - **Modals**: Uses `CenterDetailViewLegacy.tsx` to provide an exact replica of the original centered modal, avoiding the sheet/overlay behavior of the newer desktop components.

### Implementation Specifics
- **Legacy Components**: When exact visual parity is required for mobile, a `Legacy` version of the component is created (e.g., `CenterDetailViewLegacy.tsx`) to avoid bloating the desktop components with conditional styling.
- **Header Logic**: Headers in Admin pages now conditionally render the mobile layout (buttons above search) vs desktop layout (side-by-side) to ensure ergonomic touch targets.

## 10. Troubleshooting & Common Fixes (Updates)

### React Hook Form + TypeScript
- **Problem**: `watch('name')` returning `undefined` during initial render, breaking type-strict components.
- **Fix**: Always use fallback values when passing watched values to props: `<Component value={watchedValue || ''} />`.

### Modal Fluidity & Internal Loading
- **Problem**: Component-level loading states (`if (loading) return <Spinner />`) that unmount the entire container cause "jank" and layout shifting.
- **Fix**: Allow the container structure to render immediately and handle loading states internally within specific fields or sections (e.g., inside the list of workers).

### Build & Code Extraction
- **Encoding Errors**: When extracting code from older commits or temporary files, beware of `UTF-16LE` encoding (PowerShell default). Use `UTF-8` to ensure compatibility with tools like `view_file` or `grep`.
- **Git Operations**: Always verify the current branch before merging to `main`. Use `git branch --show-current`.
