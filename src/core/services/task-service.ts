import type {
  CreateProjectRequest,
  CreateTaskRequest,
  Project,
  Task,
  TaskCount,
  TaskStatus,
} from '../domain/types';
import type { TaskService } from '../interfaces/task-service';
import type { ProjectRepository } from '../repositories/project-repository';
import type { TaskRepository } from '../repositories/task-repository';

export class TaskServiceImpl implements TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private projectRepository: ProjectRepository
  ) {}

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskRepository.findByProjectId(projectId);
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.taskRepository.findByStatus(status);
  }

  async getTask(taskId: string): Promise<Task | null> {
    return this.taskRepository.findById(taskId);
  }

  async createTask(task: CreateTaskRequest): Promise<string> {
    return this.taskRepository.create(task);
  }

  async createMultipleTasks(projectId: string, tasks: CreateTaskRequest[]): Promise<string[]> {
    return this.taskRepository.createMultiple(projectId, tasks);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    return this.taskRepository.updateStatus(taskId, status);
  }

  async getAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async getProject(projectId: string): Promise<Project | null> {
    return this.projectRepository.findById(projectId);
  }

  async createProject(project: CreateProjectRequest): Promise<string> {
    return this.projectRepository.create(project);
  }

  async createMultipleProjects(projects: CreateProjectRequest[]): Promise<string[]> {
    return this.projectRepository.createMultiple(projects);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.projectRepository.delete(projectId);
  }

  async getTaskCount(): Promise<TaskCount> {
    return this.taskRepository.getCount();
  }

  async getRecentTasks(limit?: number): Promise<Task[]> {
    return this.taskRepository.findRecent(limit);
  }

  async getPriorityTasks(limit?: number): Promise<Task[]> {
    return this.taskRepository.findPriority(limit);
  }
}
