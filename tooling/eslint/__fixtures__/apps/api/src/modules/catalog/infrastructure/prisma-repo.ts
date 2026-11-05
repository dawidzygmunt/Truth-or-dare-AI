import { prismaService } from '../../../database/prisma.service.js';
import { useCase } from '../application/use-case.js';
export const prismaRepo = [prismaService, useCase];
