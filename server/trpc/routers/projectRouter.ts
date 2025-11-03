import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../init";


export const projectRouter = router({
    getAllProjects: protectedProcedure
        .query(async ({ ctx }) => {
            return await ctx.db.project.findMany({
                where: {
                    userId: ctx.userId
                },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    tasks: {
                        select: {
                            completed: true
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            })

        }),
    getProjectById: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
            }))
        .query(async ({ ctx, input }) => {
            return await ctx.db.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.userId,
                },
                include: {
                    tasks: true
                }
            })
        }),
    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(5),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.project.create({
                data: {
                    name: input.name,
                    userId: ctx.userId
                }
            })
        }),
    delete: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.project.delete({
                where: { id: input.projectId, userId: ctx.userId },
            });
            return { success: true };
        }),
    getAllUsersProjectReport: publicProcedure
        .query(async ({ ctx }) => {
            // Get all projects from all users with their tasks
            const allProjects = await ctx.db.project.findMany({
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true,
                    tasks: {
                        select: {
                            id: true,
                            title: true,
                            completed: true,
                            createdAt: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

            // Calculate global statistics
            const totalProjects = allProjects.length;
            const totalTasks = allProjects.reduce((sum, project) => sum + project.tasks.length, 0);
            const completedTasks = allProjects.reduce(
                (sum, project) => sum + project.tasks.filter(t => t.completed).length,
                0
            );
            const inProgressTasks = totalTasks - completedTasks;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Get unique users count
            const uniqueUsers = new Set(allProjects.map(p => p.userId)).size;

            // Project categorization
            const projectsWithAllTasksCompleted = allProjects.filter(
                project => project.tasks.length > 0 &&
                    project.tasks.every(t => t.completed)
            ).length;

            const projectsWithNoTasks = allProjects.filter(
                project => project.tasks.length === 0
            ).length;

            const projectsInProgress = totalProjects - projectsWithAllTasksCompleted - projectsWithNoTasks;

            return {
                statistics: {
                    totalProjects,
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    completionRate,
                    totalUsers: uniqueUsers,
                    projectsWithAllTasksCompleted,
                    projectsWithNoTasks,
                    projectsInProgress,
                },
                projects: allProjects.map(project => ({
                    id: project.id,
                    name: project.name,
                    createdAt: project.createdAt,
                    totalTasks: project.tasks.length,
                    completedTasks: project.tasks.filter(t => t.completed).length,
                    completionRate: project.tasks.length > 0
                        ? Math.round((project.tasks.filter(t => t.completed).length / project.tasks.length) * 100)
                        : 0,
                }))
            };
        }),
});

export type ProjectRouter = typeof projectRouter;
