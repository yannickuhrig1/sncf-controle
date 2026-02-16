# CLAUDE.md - AI Assistant Guide for SNCF Controles

## Project Overview

**SNCF Controles** is an offline-first Progressive Web App (PWA) for SNCF railway agents to manage and track passenger controls on trains and at stations. It handles fraud rate calculation, statistical reporting, team management, and comprehensive PDF/HTML export of control data.

The app is built with **React + TypeScript + Vite** on the frontend and **Supabase** (PostgreSQL) on the backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 with TypeScript 5.8 |
| Build Tool | Vite 5.4 with SWC (via @vitejs/plugin-react-swc) |
| Styling | Tailwind CSS 3.4 with CSS variables (dark mode via `class` strategy) |
| UI Components | shadcn/ui (Radix UI primitives) |
| State Management | TanStack Query (server state), React Context (auth) |
| Forms | React Hook Form + Zod validation |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| PDF Generation | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Animations | Framer Motion |
| Routing | React Router DOM 6 |
| PWA | vite-plugin-pwa with Workbox |

## Quick Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── pages/              # Route-level page components (14 pages)
│   ├── Dashboard.tsx   # Main dashboard with KPIs
│   ├── Auth.tsx        # Login/signup
│   ├── OnboardControl.tsx   # Train control form
│   ├── StationControl.tsx   # Station/platform control form
│   ├── History.tsx     # Control history with infinite scroll
│   ├── Statistics.tsx  # Analytics & charts
│   ├── Profile.tsx     # User profile
│   ├── Settings.tsx    # User preferences
│   ├── Admin.tsx       # Admin panel (user/team mgmt)
│   ├── Manager.tsx     # Manager view
│   ├── Install.tsx     # PWA install page
│   ├── InfosUtiles.tsx # FAQ & reference info
│   ├── NewControl.tsx  # Control type selector
│   └── NotFound.tsx    # 404 page
├── components/
│   ├── ui/             # shadcn/ui primitives (~50 components) - DO NOT edit manually
│   ├── controls/       # Control-related components (forms, dialogs, exports)
│   ├── dashboard/      # Dashboard widgets and cards
│   ├── history/        # History view components
│   ├── charts/         # Chart components (Recharts-based)
│   ├── admin/          # Admin panel components
│   ├── settings/       # Settings page components
│   ├── layout/         # Layout, navigation, page transitions
│   ├── InstallAppButton.tsx
│   └── NavLink.tsx
├── hooks/              # Custom React hooks (17 files)
│   ├── useAuth.tsx           # Auth context & session management
│   ├── useControls.ts        # Fetch/mutate controls via Supabase
│   ├── useControlsWithFilter.ts
│   ├── useOnboardControls.ts
│   ├── useOfflineSync.ts     # Offline queue & background sync
│   ├── useOfflineControls.ts
│   ├── useEmbarkmentMissions.ts  # Multi-train mission tracking
│   ├── useFraudThresholds.ts     # Admin-configurable thresholds
│   ├── useAdminSettings.ts
│   ├── useUserPreferences.ts
│   ├── useFormPersistence.ts
│   ├── useFormValidation.ts
│   ├── useLastSync.ts
│   ├── useParisTime.ts
│   ├── usePushNotifications.ts
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── integrations/supabase/
│   ├── client.ts       # Supabase client init (with localStorage fallback)
│   └── types.ts        # Auto-generated TypeScript types from Supabase schema
├── lib/
│   ├── exportUtils.ts           # HTML/PDF export logic (~1200 lines)
│   ├── embarkmentExportUtils.ts # Embarkment-specific exports (~960 lines)
│   ├── stats.ts                 # Fraud rate & statistics calculations
│   └── utils.ts                 # cn() utility (tailwind-merge + clsx)
├── App.tsx             # Root component with routing & providers
├── main.tsx            # Entry point with theme initialization
├── index.css           # Global styles & Tailwind CSS variables
└── App.css
supabase/
├── config.toml         # Supabase project config
└── migrations/         # 18 SQL migration files (schema history)
public/                 # PWA icons, splash screens, manifest
```

## Architecture

### Provider Hierarchy (App.tsx)

```
QueryClientProvider (TanStack Query)
  └── AuthProvider (Supabase auth context)
        └── FraudThresholdsInitializer
              └── TooltipProvider
                    └── Toaster + Sonner (notifications)
                          └── BrowserRouter
                                └── AnimatePresence + Routes
```

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Main dashboard |
| `/auth` | Auth | Login/signup |
| `/control/new` | NewControl | Control type selector |
| `/onboard` | OnboardControl | Train control form |
| `/station` | StationControl | Station control form |
| `/history` | History | Control history |
| `/statistics` | Statistics | Charts & analytics |
| `/profile` | Profile | User profile |
| `/settings` | Settings | Preferences |
| `/manager` | Manager | Team management |
| `/admin` | Admin | Admin panel |
| `/install` | Install | PWA install |
| `/infos` | InfosUtiles | FAQ & useful info |

### Role-Based Access

Three roles with ascending privileges: `agent` < `manager` < `admin`

- **Agent**: Create controls, view own history/stats, export data
- **Manager**: Agent abilities + team management, team member stats
- **Admin**: Manager abilities + user management, fraud thresholds, page visibility, data retention config

### Data Flow

1. Supabase PostgreSQL (source of truth)
2. TanStack Query (caching, background refetching)
3. React components (render)
4. Offline: localStorage queue -> background sync when reconnected

### Offline-First Pattern

- `useOfflineSync` manages a pending actions queue in localStorage
- Service Worker (Workbox): network-first for Supabase API, cache-first for static assets
- Controls created offline are queued and synced automatically when connectivity returns

## Database Schema (Supabase)

### Key Tables

- **controls** - Core control records (passengers, fraud types, location, train info, team)
- **embarkment_missions** - Multi-train mission data (station, trains JSON, completion status)
- **profiles** - User profiles (name, role, team, phone, avatar)
- **teams** - Team records (name, description, manager_id)
- **user_preferences** - UI/notification/data preferences per user
- **admin_settings** - Global admin configuration (JSON key-value)

### Enums

- `app_role`: `'agent'` | `'manager'` | `'admin'`
- `location_type`: `'train'` | `'gare'` | `'quai'`

### Database Functions (RPC)

- `get_current_profile_id()` - Current user's profile ID
- `get_user_role()` - Current user's app_role
- `get_user_team_id()` - Current user's team ID
- `is_admin()` / `is_manager()` - Boolean role checks
- `is_manager_of_team(p_team_id)` - Team-specific manager check

### Types

Auto-generated Supabase types are in `src/integrations/supabase/types.ts`. Do not edit this file manually; it is regenerated from the database schema.

## Domain Logic

### Fraud Rate Calculation

```
fraudCount = tarifsControle + PV + RI_negatifs
fraudRate = (fraudCount / totalPassagers) * 100
```

Important distinctions:
- **Tarifs controle** (STT 50, STT 100, RNV, Titre tiers, Date naissance): COUNTED as fraud
- **PV** (absence titre, titre invalide, refus controle, autre): COUNTED as fraud
- **RI negatifs**: COUNTED as fraud
- **Tarifs a bord**: NOT counted as fraud
- **RI positifs**: NOT counted as fraud

### Control Types

- **Onboard control** (`/onboard`): Controls performed on trains (train number, origin, destination)
- **Station control** (`/station`): Controls at stations/platforms (platform number, location)
- **Embarkment missions**: Multi-train mission tracking with grouped exports

### Export System

Two main export modules:
- `src/lib/exportUtils.ts` - Standard control exports (HTML & PDF)
- `src/lib/embarkmentExportUtils.ts` - Embarkment mission exports

Export modes: **Detailed** (manager LAF), **Simplified** (regional direction), **Both**

Formats: **HTML** (interactive, with charts and collapsible sections) and **PDF** (jsPDF + autotable)

## Code Conventions

### Path Aliases

Use `@/` to reference `src/`:
```typescript
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
```

### Component Patterns

- **Pages** go in `src/pages/` as default exports
- **Feature components** go in `src/components/<feature>/`
- **UI primitives** (`src/components/ui/`) are shadcn/ui managed - add new ones via the shadcn CLI, do not edit existing ones manually
- Use `cn()` from `@/lib/utils` for conditional Tailwind class merging
- Animations use Framer Motion's `motion` components
- Toast notifications via Sonner (`sonner` package)

### Hook Patterns

- Supabase data hooks use TanStack Query (`useQuery`, `useMutation`)
- Auth state via `useAuth()` context hook
- Forms via `useForm()` from React Hook Form with Zod resolvers
- User preferences via `useUserPreferences()` hook

### Styling

- Tailwind CSS with CSS variables defined in `src/index.css`
- Dark mode via `class` strategy (toggled by `next-themes`)
- Color tokens: `primary`, `secondary`, `destructive`, `muted`, `accent`, `success`, `warning`
- Card color variants: `card-cyan`, `card-rose`, `card-mint`, `card-amber`, `card-violet`
- shadcn/ui base color: `slate`

### TypeScript

The project uses lenient TypeScript settings:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`
- `@typescript-eslint/no-unused-vars` is disabled in ESLint

### Linting

- ESLint 9 flat config (`eslint.config.js`)
- TypeScript ESLint recommended rules
- React Hooks rules enforced
- React Refresh warnings for non-component exports
- Run with `npm run lint`

## Development Notes

### No Test Framework

There is no test runner (Jest, Vitest, etc.) configured. Validate changes manually via the dev server and linting.

### Deployment

- **Netlify**: Configured via `netlify.toml` (SPA redirect rules)
- **Vercel**: Configured via `public/vercel.json`

### PWA Configuration

- Configured in `vite.config.ts` via `VitePWA` plugin
- Auto-update registration, Workbox service worker
- Max cache file size: 5MB
- Dev server on port 8080 (host `::`)

### Supabase

- Project ID: `hjneegxhjuxhlgnknuvr`
- Client initialized in `src/integrations/supabase/client.ts`
- Environment variables prefixed with `VITE_SUPABASE_*` in `.env`
- Migrations in `supabase/migrations/`

### Language

The application UI is in **French**. All user-facing strings, labels, form fields, and error messages are written in French. Code (variable names, comments) is in English.

## Common Tasks

### Adding a new page

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` inside `AnimatedRoutes`, wrapped with `<PageTransition>`
3. Add navigation link in the layout components

### Adding a new UI component (shadcn)

Use the shadcn CLI to add components. Config is in `components.json`:
- Components alias: `@/components`
- UI alias: `@/components/ui`

### Adding a new data hook

1. Create hook in `src/hooks/useNewHook.ts`
2. Use TanStack Query for Supabase data fetching
3. Import Supabase client from `@/integrations/supabase/client`

### Modifying the database schema

1. Make changes via the Supabase dashboard or CLI
2. Add migration file to `supabase/migrations/`
3. Regenerate types and update `src/integrations/supabase/types.ts`
