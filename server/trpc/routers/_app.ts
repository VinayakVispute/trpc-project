import { projectRouter } from "@/server/trpc/routers/projectRouter";
import { router } from "../init";
import { taskRouter } from "@/server/trpc/routers/taskRouter";

export const appRouter = router({
    project: projectRouter,
    task: taskRouter,
});

export type AppRouter = typeof appRouter;