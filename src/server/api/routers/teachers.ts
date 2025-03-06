import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const TeachersRouter = createTRPCRouter({
  getTeacher: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.teacher.count({
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

      const data = await ctx.db.teacher.findMany({
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

  getTeacherById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.teacher.findUnique({
        where: { id: input.id },
      });
    }),

  createOrUpdateTeacher: publicProcedure
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
        return ctx.db.teacher.update({
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
        return ctx.db.teacher.create({
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

  deleteTeacher: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teacher.delete({
        where: { id: input.id },
      });
      return { message: "Teachers record deleted successfully" };
    }),
});
