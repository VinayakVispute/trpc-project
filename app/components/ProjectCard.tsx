import Link from "next/link";

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{ completed: boolean }>;
}

export function ProjectCard({ project }: { project: Project }) {
  const taskCount = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t) => t.completed).length || 0;
  const progress = taskCount > 0 ? (completedTasks / taskCount) * 100 : 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-6">
        {/* Project Name */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {project.name}
        </h3>

        {/* Task Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Tasks Icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>
            {completedTasks} / {taskCount} tasks completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Date */}
        <div className="text-xs text-gray-500 dark:text-gray-500">
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </Link>
  );
}
