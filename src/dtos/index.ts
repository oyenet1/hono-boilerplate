import { z } from "zod";
import { existEmail } from "../validators/emailValidation";

// User DTOs
export const CreateUserDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const LoginDto = z.object({
  email: existEmail,
  password: z.string().min(1, "Password is required"),
});

export const UpdateUserDto = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
});

// Post DTOs
export const CreatePostDto = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const UpdatePostDto = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
});

// Query DTOs
export const PaginationDto = z.object({
  page: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? parseInt(val) : 10)),
});

export type CreateUserDto = z.infer<typeof CreateUserDto>;
export type LoginDto = z.infer<typeof LoginDto>;
export type UpdateUserDto = z.infer<typeof UpdateUserDto>;
export type CreatePostDto = z.infer<typeof CreatePostDto>;
export type UpdatePostDto = z.infer<typeof UpdatePostDto>;
export type PaginationDto = z.infer<typeof PaginationDto>;
