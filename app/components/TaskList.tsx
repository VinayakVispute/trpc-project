"use client";

import { useState } from "react";
import { trpc } from "@/trpc/provider";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  userId: string;
}

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  tasks: Task[];
}

interface TaskListProps {
  initialProject: Project;
  projectId: string;
}

export function TaskList({ initialProject, projectId }: TaskListProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const utils = trpc.useUtils();

  // Use the project query to get live updates
  const { data: project } = trpc.project.getProjectById.useQuery(
    { projectId },
    { initialData: initialProject }
  );

  const tasks = project?.tasks || initialProject.tasks;

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.project.getProjectById.invalidate({ projectId });
      setNewTaskTitle("");
      setIsAddingTask(false);
    },
  });

  const toggleTaskMutation = trpc.task.toggle.useMutation({
    onMutate: async ({ taskId, completed }) => {
      await utils.project.getProjectById.cancel({ projectId });
      const previousProject = utils.project.getProjectById.getData({ projectId });

      utils.project.getProjectById.setData({ projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((task) =>
            task.id === taskId ? { ...task, completed } : task
          ),
        };
      });

      return { previousProject };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProject) {
        utils.project.getProjectById.setData({ projectId }, context.previousProject);
      }
    },
    onSettled: () => {
      utils.project.getProjectById.invalidate({ projectId });
    },
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskTitle.length < 3) return;

    createTaskMutation.mutate({
      projectId,
      title: newTaskTitle,
    });
  };

  const toggleTaskCompletion = (taskId: string, currentStatus: boolean) => {
    toggleTaskMutation.mutate({
      taskId,
      completed: !currentStatus,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Tasks
        </h2>
        <button
          type="button"
          onClick={() => setIsAddingTask(true)}
          disabled={isAddingTask}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Add Icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      {isAddingTask && (
        <form onSubmit={handleAddTask} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title (min 3 characters)..."
              autoFocus
              disabled={createTaskMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={createTaskMutation.isPending || newTaskTitle.length < 3}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {createTaskMutation.isPending ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }}
              disabled={createTaskMutation.isPending}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {createTaskMutation.isError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {createTaskMutation.error.message}
            </p>
          )}
        </form>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Empty Tasks Icon</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              No tasks yet. Add your first task to get started!
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggleTaskCompletion(task.id, task.completed)}
                disabled={toggleTaskMutation.isPending}
                className="flex-shrink-0 mt-0.5 disabled:opacity-50"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.completed
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-blue-600"
                    }`}
                >
                  {task.completed && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <title>Checkmark</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-gray-900 dark:text-white ${task.completed
                      ? "line-through text-gray-500 dark:text-gray-500"
                      : ""
                    }`}
                >
                  {task.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${task.completed
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
              >
                {task.completed ? "Completed" : "In Progress"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
