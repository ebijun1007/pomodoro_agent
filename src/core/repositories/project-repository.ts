import type { Project, CreateProjectRequest } from '../domain/types';

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(projectId: string): Promise<Project | null>;
  create(project: CreateProjectRequest): Promise<string>;
  createMultiple(projects: CreateProjectRequest[]): Promise<string[]>;
  delete(projectId: string): Promise<void>;
}
