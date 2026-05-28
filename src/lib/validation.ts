import { z } from 'zod';
import { UserRole, TicketPriority, TicketStatus } from './types';

// Auth Validation
export const LoginSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(50, 'El usuario no puede exceder 50 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128, 'La contraseña es demasiado larga'),
});

// User Management
export const CreateUserSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres').max(50),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128),
  role: z.enum([UserRole.User, UserRole.Technician] as const, {
    message: 'Rol inválido',
  }),
  projects: z.array(z.string()).default([]),
});

export const UpdateUserSchema = z.object({
  id: z.number({ message: 'ID inválido' }),
  role: z.enum([UserRole.User, UserRole.Technician] as const, {
    message: 'Rol inválido',
  }),
  projects: z.array(z.string()).default([]),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128).optional().or(z.literal('')),
});

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres').max(128),
});

// Ticket Management
export const CreateTicketSchema = z.object({
  text: z.string().min(10, 'Describe la solicitud con al menos 10 caracteres.').max(20000, 'El texto no puede superar 20,000 caracteres.'),
  project: z.string().max(200).optional().default('General'),
});

export const UpdateTicketStatusSchema = z.object({
  status: z.enum([TicketStatus.Open, TicketStatus.WaitingOnClient, TicketStatus.Closed] as const, {
    message: 'Estado inválido',
  }),
});

// Comments
export const CreateCommentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(8000, 'El comentario no puede superar 8000 caracteres.'),
});
