import type { Task, Project } from './types';

export const sampleProjects: Project[] = [
  {
    id: 'p1',
    name: 'Ecommerce Automation',
    description: 'Building automated workflows for ecommerce operations using n8n',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    name: 'Client Work',
    description: 'Active client projects and deliverables',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p3',
    name: 'Python & AI',
    description: 'Learning Python and exploring AI/ML integration',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p4',
    name: 'Wizmerce',
    description: 'Personal ecommerce store setup and growth',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p5',
    name: 'Personal',
    description: 'Personal development, health, and life admin',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const sampleTasks: Task[] = [
  {
    id: 't1',
    title: 'Build my first ecommerce automation workflow',
    categoryId: 'category-build',
    status: 'ACTIVE',
    priority: 'BIG_ROCK',
    nextAction: 'Open n8n and create webhook and send test payload',
    projectId: 'p1',
    createdAt: '2026-09-23T08:00:00Z',
  },
  {
    id: 't2',
    title: 'Research webhook authentication',
    categoryId: 'category-build',
    status: 'ACTIVE',
    priority: 'SUPPORT',
    nextAction: '',
    projectId: 'p1',
    createdAt: '2026-09-23T08:05:00Z',
  },
  {
    id: 't3',
    title: 'Document the workflow',
    categoryId: 'category-build',
    status: 'ACTIVE',
    priority: 'SUPPORT',
    nextAction: '',
    projectId: 'p1',
    createdAt: '2026-09-23T08:10:00Z',
  },
  {
    id: 't4',
    title: 'Reply to client messages',
    categoryId: 'category-admin',
    status: 'COMPLETED',
    priority: 'ADMIN',
    nextAction: '',
    projectId: 'p2',
    createdAt: '2026-09-23T07:00:00Z',
  },
  {
    id: 't5',
    title: 'Check email',
    categoryId: 'category-admin',
    status: 'ACTIVE',
    priority: 'ADMIN',
    nextAction: '',
    projectId: null,
    createdAt: '2026-09-23T07:05:00Z',
  },
  {
    id: 't6',
    title: 'Organize downloads',
    categoryId: 'category-admin',
    status: 'ACTIVE',
    priority: 'ADMIN',
    nextAction: '',
    projectId: null,
    createdAt: '2026-09-23T07:10:00Z',
  },
];

export function createSampleData(): { projects: Project[]; tasks: Task[] } {
  return {
    projects: sampleProjects.map((project) => ({ ...project })),
    tasks: sampleTasks.map((task) => ({ ...task })),
  };
}
