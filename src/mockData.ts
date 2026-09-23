import type { Task, Project } from './types';

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'Ecommerce Automation',
    description: 'Building automated workflows for ecommerce operations using n8n',
  },
  {
    id: 'p2',
    name: 'Client Work',
    description: 'Active client projects and deliverables',
  },
  {
    id: 'p3',
    name: 'Python & AI',
    description: 'Learning Python and exploring AI/ML integration',
  },
  {
    id: 'p4',
    name: 'Wizmerce',
    description: 'Personal ecommerce store setup and growth',
  },
  {
    id: 'p5',
    name: 'Personal',
    description: 'Personal development, health, and life admin',
  },
];

export const initialTasks: Task[] = [
  {
    id: 't1',
    title: 'Build my first ecommerce automation workflow',
    category: 'BUILD',
    status: 'ACTIVE',
    priority: 'BIG_ROCK',
    nextAction: 'Open n8n and create webhook and send test payload',
    projectId: 'p1',
    createdAt: '2026-09-23T08:00:00Z',
  },
  {
    id: 't2',
    title: 'Research webhook authentication',
    category: 'BUILD',
    status: 'ACTIVE',
    priority: 'SUPPORT',
    nextAction: '',
    projectId: 'p1',
    createdAt: '2026-09-23T08:05:00Z',
  },
  {
    id: 't3',
    title: 'Document the workflow',
    category: 'BUILD',
    status: 'ACTIVE',
    priority: 'SUPPORT',
    nextAction: '',
    projectId: 'p1',
    createdAt: '2026-09-23T08:10:00Z',
  },
  {
    id: 't4',
    title: 'Reply to client messages',
    category: 'ADMIN',
    status: 'COMPLETED',
    priority: 'ADMIN',
    nextAction: '',
    projectId: 'p2',
    createdAt: '2026-09-23T07:00:00Z',
  },
  {
    id: 't5',
    title: 'Check email',
    category: 'ADMIN',
    status: 'ACTIVE',
    priority: 'ADMIN',
    nextAction: '',
    projectId: null,
    createdAt: '2026-09-23T07:05:00Z',
  },
  {
    id: 't6',
    title: 'Organize downloads',
    category: 'ADMIN',
    status: 'ACTIVE',
    priority: 'ADMIN',
    nextAction: '',
    projectId: null,
    createdAt: '2026-09-23T07:10:00Z',
  },
];
