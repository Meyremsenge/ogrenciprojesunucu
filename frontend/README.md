# 🎨 Frontend Mimarisi - Öğrenci Koçluk Sistemi

## Teknoloji Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND STACK                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Framework    : React 18+ with TypeScript                               │
│  Build Tool   : Vite 5.x                                                │
│  State        : Zustand + React Query (TanStack Query)                  │
│  Routing      : React Router v6 (with protected routes)                 │
│  UI Library   : shadcn/ui + Tailwind CSS                                │
│  Forms        : React Hook Form + Zod validation                        │
│  API Client   : Axios with interceptors                                 │
│  Real-time    : Socket.io-client                                        │
│  Charts       : Recharts                                                │
│  Animation    : Framer Motion                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Proje Kurulumu

```bash
cd frontend
npm install
npm run dev
```

## Dizin Yapısı

```
frontend/
├── public/
├── src/
│   ├── api/                 # API client ve service'ler
│   ├── assets/              # Statik dosyalar
│   ├── components/          # Shared components
│   ├── features/            # Feature-based modüller
│   ├── hooks/               # Custom React hooks
│   ├── layouts/             # Layout componentleri
│   ├── lib/                 # Utility fonksiyonlar
│   ├── pages/               # Route sayfaları
│   ├── routes/              # Route tanımları
│   ├── stores/              # Zustand stores
│   ├── styles/              # Global stiller
│   └── types/               # TypeScript tipleri
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Başlangıç Komutları

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```
