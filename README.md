# tRPC Learning Project - Task Management App

A full-stack Next.js 15 project built to learn and demonstrate **tRPC** with React Query, featuring authentication, database integration, and optimized server/client rendering patterns.

## 📚 Learning Objectives

This project demonstrates:

- **tRPC** end-to-end type-safe APIs
- **React Query** for data fetching and caching
- **Server Components** with Next.js 15 App Router
- **Clerk** authentication with webhook integration
- **Prisma ORM** with PostgreSQL
- **Optimistic UI updates** for better UX
- **SSR/SSG** patterns with tRPC

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15 App                       │
├─────────────────────────────────────────────────────────────┤
│  Server Components (SSR/SSG)  │  Client Components          │
│  - Fetch data via tRPC        │  - Interactive UI           │
│  - Pre-render HTML            │  - Mutations & Optimistic   │
│  - SEO optimized              │  - React Query hooks        │
├─────────────────────────────────────────────────────────────┤
│                    tRPC Layer (Type-Safe)                   │
│  - API Routes: /api/trpc/[trpc]                            │
│  - Routers: projectRouter, taskRouter                       │
│  - Procedures: protectedProcedure (with auth middleware)    │
├─────────────────────────────────────────────────────────────┤
│               Prisma ORM → PostgreSQL                       │
│  Models: User, Project, Task                                │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key tRPC Concepts Demonstrated

### 1. **tRPC Router Setup**

**Location**: `server/trpc/routers/`

```typescript
// projectRouter.ts - Example of tRPC router
export const projectRouter = router({
  // Query: Fetch all projects
  getAllProjects: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.project.findMany({
      where: { userId: ctx.userId },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Mutation: Create project with validation
  create: protectedProcedure
    .input(z.object({ name: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.project.create({
        data: {
          name: input.name,
          userId: ctx.userId,
        },
      });
    }),
});
```

**Key Learnings**:

- `.query()` for read operations
- `.mutation()` for write operations
- `.input()` with Zod for runtime validation
- `protectedProcedure` enforces authentication
- Context (`ctx`) provides authenticated user + DB access

### 2. **Context & Middleware**

**Location**: `server/trpc/context.ts`, `server/trpc/init.ts`

```typescript
// Context: Available to all procedures
export const createContext = async () => {
  return {
    auth: await auth(), // Clerk auth
    db: prisma, // Prisma client
  };
};

// Middleware: Authentication check
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.auth.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, userId: ctx.auth.userId },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
```

**Key Learnings**:

- Context provides shared data to all procedures
- Middleware chains for auth, logging, etc.
- Type-safe context with TypeScript inference

### 3. **Server-Side Data Fetching (SSR/SSG)**

**Location**: `app/page.tsx`

```typescript
import { trpc, HydrateClient } from "@/trpc/server";

export default async function ProjectListPage() {
  // Server-side tRPC call (no React Query needed)
  const projects = await trpc.project.getAllProjects();

  return (
    <HydrateClient>
      {/* Pre-rendered with data */}
      {projects.map((project) => (
        <ProjectCard project={project} />
      ))}
    </HydrateClient>
  );
}
```

**Key Learnings**:

- Direct tRPC calls in Server Components
- No loading states needed (data ready before render)
- `HydrateClient` prepares data for client-side React Query
- Automatic type inference from server to client

### 4. **Client-Side Queries (React Query)**

**Location**: `app/components/TaskList.tsx`

```typescript
"use client";
import { trpc } from "@/trpc/provider";

export function TaskList({ initialTasks, projectId }: Props) {
  // React Query hook generated by tRPC
  const { data: project } = trpc.project.getProjectById.useQuery(
    { projectId },
    { initialData: { tasks: initialTasks } } // Hydrate from server
  );

  // Access utils for cache manipulation
  const utils = trpc.useUtils();

  const tasks = project?.tasks || initialTasks;
  // ...
}
```

**Key Learnings**:

- `trpc.<router>.<procedure>.useQuery()` pattern
- Initial data from server hydration
- Automatic refetching and caching
- Type-safe hooks with autocomplete

### 5. **Mutations with Optimistic Updates**

**Location**: `app/components/TaskList.tsx`

```typescript
const toggleTaskMutation = trpc.task.toggle.useMutation({
  // Before mutation: Update UI immediately
  onMutate: async ({ taskId, completed }) => {
    await utils.project.getProjectById.cancel({ projectId });

    const previousProject = utils.project.getProjectById.getData({ projectId });

    // Optimistic update
    utils.project.getProjectById.setData({ projectId }, (old) => ({
      ...old,
      tasks: old.tasks.map((task) =>
        task.id === taskId ? { ...task, completed } : task
      ),
    }));

    return { previousProject };
  },

  // On error: Rollback
  onError: (_err, _vars, context) => {
    utils.project.getProjectById.setData(
      { projectId },
      context.previousProject
    );
  },

  // After mutation: Refetch to sync with server
  onSettled: () => {
    utils.project.getProjectById.invalidate({ projectId });
  },
});
```

**Key Learnings**:

- Optimistic updates for instant UI feedback
- Automatic rollback on error
- Cache invalidation with `utils`
- Type-safe mutation callbacks

### 6. **React Query Configuration**

**Location**: `trpc/query-client.ts`

```typescript
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // Data fresh for 30s
        gcTime: 5 * 60 * 1000, // Cache for 5 min
        retry: 3, // Retry failed requests
        refetchOnWindowFocus: true, // Refetch on tab focus
      },
    },
  });
}
```

**Key Learnings**:

- Global query configuration
- Stale-while-revalidate pattern
- Automatic retry with exponential backoff

### 7. **tRPC Provider Setup**

**Location**: `trpc/provider.tsx`

```typescript
export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider(props: PropsWithChildren) {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson, // Serialize Dates, etc.
          url: getUrl(),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**Key Learnings**:

- `httpBatchLink` combines multiple requests
- `superjson` handles complex types (Date, Map, etc.)
- Singleton pattern for client instance

## 📊 Database Schema (Prisma)

```prisma
model User {
  id        String    @id              // Clerk user ID
  email     String    @unique
  projects  Project[] @relation("UserProjects")
  tasks     Task[]    @relation("UserTasks")
  createdAt DateTime  @default(now())
}

model Project {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation("UserProjects", fields: [userId], references: [id], onDelete: Cascade)
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation("UserTasks", fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Features**:

- Cascade deletes (deleting user removes all projects/tasks)
- Automatic timestamps
- Type-safe with Prisma Client

## 🔐 Authentication Flow

1. **Clerk handles sign-up/sign-in** (`app/sign-in`, `app/sign-up`)
2. **Webhook syncs user to DB** (`app/api/webhooks/clerk/route.ts`)
   - `user.created` → Create user in Prisma
   - `user.updated` → Update email
   - `user.deleted` → Cascade delete all data
3. **tRPC middleware checks auth** (`server/trpc/init.ts`)
4. **Context includes userId** for all protected procedures

## 🚀 Getting Started

### Prerequisites

```bash
Node.js 18+
PostgreSQL database
Clerk account
```

### Installation

1. **Clone and install dependencies**

```bash
git clone <repo>
cd trpc-project
pnpm install
```

2. **Set up environment variables**

```bash
cp .env.example .env.local
```

Fill in:

```env
# Clerk (from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

3. **Set up database**

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

4. **Run development server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Set up Clerk Webhook

See `WEBHOOK_SETUP.md` for detailed instructions on configuring webhooks.

## 📁 Project Structure

```
trpc-project/
├── app/                          # Next.js 15 App Router
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts # tRPC HTTP handler
│   │   └── webhooks/clerk/      # Clerk webhook endpoint
│   ├── components/              # React components
│   │   ├── Navbar.tsx           # Auth navbar (client)
│   │   ├── ProjectCard.tsx      # Project card (client)
│   │   └── TaskList.tsx         # Task list with mutations (client)
│   ├── projects/
│   │   ├── [id]/page.tsx        # Project details (server → client)
│   │   └── new/page.tsx         # Create project (client)
│   ├── page.tsx                 # Home - Projects list (server)
│   └── layout.tsx               # Root layout with providers
├── server/
│   ├── trpc/
│   │   ├── routers/
│   │   │   ├── _app.ts          # Main router combining all routers
│   │   │   ├── projectRouter.ts # Project CRUD operations
│   │   │   └── taskRouter.ts    # Task CRUD operations
│   │   ├── init.ts              # tRPC initialization + middleware
│   │   └── context.ts           # Context creator (auth + db)
│   └── prisma.ts                # Prisma client singleton
├── trpc/
│   ├── provider.tsx             # Client-side tRPC provider
│   ├── server.ts                # Server-side tRPC caller
│   └── query-client.ts          # React Query configuration
├── prisma/
│   └── schema.prisma            # Database schema
├── proxy.ts                     # Clerk middleware for route protection
└── package.json
```

## 🎯 tRPC Features Implemented

### ✅ Core Concepts

- [x] Type-safe procedures (queries & mutations)
- [x] Input validation with Zod
- [x] Context & middleware
- [x] Protected procedures with authentication
- [x] Error handling with `TRPCError`

### ✅ React Query Integration

- [x] Client-side queries (`useQuery`)
- [x] Mutations (`useMutation`)
- [x] Optimistic updates
- [x] Cache invalidation (`utils.invalidate()`)
- [x] Server-side hydration (`HydrateClient`)

### ✅ Advanced Patterns

- [x] HTTP batch linking (combines requests)
- [x] SuperJSON transformer (Date serialization)
- [x] Server Components with direct tRPC calls
- [x] Client Components with React Query hooks
- [x] Initial data hydration from server

## 🔍 Key Files to Study

### Understanding tRPC Flow

1. **Start here**: `server/trpc/routers/projectRouter.ts`

   - See how routers are defined
   - Query vs mutation patterns
   - Input validation

2. **Middleware**: `server/trpc/init.ts`

   - Authentication middleware
   - Procedure types (public vs protected)

3. **Client hooks**: `app/components/TaskList.tsx`

   - React Query hooks
   - Optimistic updates
   - Cache manipulation

4. **Server calls**: `app/page.tsx`

   - Direct tRPC calls in Server Components
   - No React Query needed

5. **Provider setup**: `trpc/provider.tsx`
   - Client configuration
   - HTTP links

## 💡 Learning Tips

### Experiment With:

1. **Add a new feature** (e.g., task priority)

   - Update Prisma schema
   - Add to tRPC router
   - Update UI components
   - See type safety propagate

2. **Try different query patterns**

   - Dependent queries
   - Infinite queries
   - Prefetching

3. **Explore middleware**

   - Add logging middleware
   - Rate limiting
   - Request timing

4. **Optimize caching**
   - Adjust `staleTime`
   - Try `keepPreviousData`
   - Implement prefetching

## 🐛 Common tRPC Patterns

### Pattern 1: Simple Query

```typescript
// Server
getAllProjects: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.project.findMany();
});

// Client
const { data } = trpc.project.getAllProjects.useQuery();
```

### Pattern 2: Query with Input

```typescript
// Server
getById: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.project.findUnique({ where: { id: input.id } });
  });

// Client
const { data } = trpc.project.getById.useQuery({ id: "123" });
```

### Pattern 3: Mutation with Cache Invalidation

```typescript
// Server
create: protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.project.create({ data: { ...input, userId: ctx.userId } });
  });

// Client
const utils = trpc.useUtils();
const mutation = trpc.project.create.useMutation({
  onSuccess: () => {
    utils.project.getAllProjects.invalidate();
  },
});
```

## 📚 Resources

- [tRPC Docs](https://trpc.io)
- [React Query Docs](https://tanstack.com/query)
- [Prisma Docs](https://prisma.io)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Clerk Auth](https://clerk.com/docs)

## 🎓 What You'll Learn

After completing this project, you'll understand:

- ✅ How tRPC provides end-to-end type safety
- ✅ The difference between queries and mutations
- ✅ How to structure tRPC routers and procedures
- ✅ Using middleware for cross-cutting concerns (auth, logging)
- ✅ React Query integration with tRPC
- ✅ Optimistic updates for better UX
- ✅ Server Components + tRPC direct calls
- ✅ Client Components + React Query hooks
- ✅ Cache invalidation strategies
- ✅ Real-world authentication patterns
- ✅ Database integration with Prisma

**Happy Learning! 🎉**

Built with ❤️ to learn tRPC
