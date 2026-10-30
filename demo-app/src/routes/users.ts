import { Router, Request, Response } from 'express';

export const usersRouter = Router();

const SAMPLE_USERS = [
  {
    id: 'usr_101',
    name: 'Alice Chen',
    email: 'alice.chen@example.com',
    role: 'Staff SRE',
    department: 'Infrastructure',
  },
  {
    id: 'usr_102',
    name: 'Bob Martinez',
    email: 'bob.m@example.com',
    role: 'Backend Engineer',
    department: 'Orders & Billing',
  },
  {
    id: 'usr_103',
    name: 'Charlie Kim',
    email: 'charlie.k@example.com',
    role: 'Tech Lead',
    department: 'Core Platform',
  },
  {
    id: 'usr_104',
    name: 'Devon Patel',
    email: 'devon.p@example.com',
    role: 'DevOps Engineer',
    department: 'Infrastructure',
  },
];

usersRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    total: SAMPLE_USERS.length,
    users: SAMPLE_USERS,
    service: 'user-service-proxy',
    status: 'healthy',
  });
});
