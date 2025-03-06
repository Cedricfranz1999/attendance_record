import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const StudentsRouter = createTRPCRouter({
  getStudents: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.students.count({
        where: input.search
          ? {
              OR: [
                { firstname: { contains: input.search, mode: "insensitive" } },
                { middleName: { contains: input.search, mode: "insensitive" } },
                { lastName: { contains: input.search, mode: "insensitive" } },
                { username: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : undefined,
      });

      const data = await ctx.db.students.findMany({
        where: input.search
          ? {
              OR: [
                { firstname: { contains: input.search, mode: "insensitive" } },
                { middleName: { contains: input.search, mode: "insensitive" } },
                { lastName: { contains: input.search, mode: "insensitive" } },
                { username: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : undefined,
        skip: input.skip,
        take: input.take,
        orderBy: { id: "asc" },
      });

      return { data, total };
    }),

  getStudentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.students.findUnique({
        where: { id: input.id },
      });
    }),

  createOrUpdateStudent: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        firstname: z.string(),
        middleName: z.string().optional().nullable(),
        lastName: z.string(),
        image: z.string(),
        username: z.string().optional().nullable(),
        Password: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.db.students.update({
          where: { id: input.id },
          data: {
            firstname: input.firstname,
            middleName: input.middleName,
            lastName: input.lastName,
            image: input.image,
            username: input.username,
            password: input.Password,
          },
        });
      } else {
        return ctx.db.students.create({
          data: {
            firstname: input.firstname,
            middleName: input.middleName,
            lastName: input.lastName,
            image: input.image,
            username: input.username,
            password: input.Password,
          },
        });
      }
    }),

  deleteStudent: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.students.delete({
        where: { id: input.id },
      });
      return { message: "Student record deleted successfully" };
    }),
});
