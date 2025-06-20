import { z } from "zod";
import { db } from "../config/database";
import { users } from "../database/schema";
import { eq } from "drizzle-orm";

export const existEmail = z
  .string()
  .email()
  .refine(isEmailExist, "No user with this Email address");

export const uniqueEmail = z
  .string()
  .email()
  .refine(isEmailUnique, "User already exist with this Email address");

export async function isEmailExist(email: string): Promise<boolean> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length === 1;
}

export async function isEmailUnique(email: string): Promise<boolean> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length === 0;
}
