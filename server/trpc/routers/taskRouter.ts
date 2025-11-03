import { z } from "zod";
import { protectedProcedure, router } from "../init";


export const taskRouter = router({
    create: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                title: z.string().min(3),

            })
        )
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.task.create({
                data: {
                    projectId: input.projectId,
                    title: input.title,
                    userId: ctx.userId,
                }
            })
        }),
    toggle: protectedProcedure
        .input(z.object({ taskId: z.string(), completed: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.task.update({
                where: { id: input.taskId, userId: ctx.userId },
                data: { completed: input.completed }
            })
        }),
    delete: protectedProcedure
        .input(z.object({ taskId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.task.delete({
                where: { id: input.taskId, userId: ctx.userId },
            });
            return { success: true };
        }),

});

export type TaskRouter = typeof taskRouter;
