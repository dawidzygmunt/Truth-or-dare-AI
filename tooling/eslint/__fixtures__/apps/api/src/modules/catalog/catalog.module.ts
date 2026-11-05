import { repo } from './infrastructure/repo.js';
import { controller } from './presentation/controller.js';
import { prismaService } from '../../database/prisma.service.js';
export const catalogModule = [repo, controller, prismaService];
