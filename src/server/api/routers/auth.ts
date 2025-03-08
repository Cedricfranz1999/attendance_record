import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
  studentLogin: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find student with matching username
      const student = await ctx.db.students.findFirst({
        where: {
          username: input.username,
        },
      });

      // Check if student exists and password matches
      if (!student || student.password !== input.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Return student data (excluding password)
      return {
        id: student.id,
        firstname: student.firstname,
        lastName: student.lastName,
        username: student.username,
        image: student.image,
      };
    }),

  teacherLogin: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find teacher with matching username
      const teacher = await ctx.db.teacher.findFirst({
        where: {
          username: input.username,
        },
      });

      // Check if teacher exists and password matches
      if (!teacher || teacher.password !== input.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Return teacher data (excluding password)
      return {
        id: teacher.id,
        firstname: teacher.firstname,
        lastName: teacher.lastName,
        username: teacher.username,
        image: teacher.image,
      };
    }),

  verifyAuth: publicProcedure.query(async ({ ctx }) => {
    // This is a placeholder for session verification
    // In a real application, you would verify JWT or session cookie here

    return {
      authenticated: false,
      message: "No active session",
    };
  }),
});
