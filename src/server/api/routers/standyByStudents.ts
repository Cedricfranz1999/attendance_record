import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const StandbyStudentsRouter = createTRPCRouter({
  getStandbyStudents: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.standbyStudents.count({
        where: input.search
          ? {
              student: {
                OR: [
                  {
                    firstname: { contains: input.search, mode: "insensitive" },
                  },
                  {
                    middleName: { contains: input.search, mode: "insensitive" },
                  },
                  { lastName: { contains: input.search, mode: "insensitive" } },
                ],
              },
            }
          : undefined,
      });

      const data = await ctx.db.standbyStudents.findMany({
        include: {
          student: true,
        },
      });

      return { data, total };
    }),

  getStandbyStudentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.standbyStudents.findUnique({
        where: { id: input.id },
        include: {
          student: true,
        },
      });
    }),

  createStandbyStudent: publicProcedure
    .input(
      z.object({
        studentId: z.number(),
        startTime: z.date(),
        status: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.standbyStudents.create({
        data: {
          studentId: input.studentId,
          startTime: input.startTime,
          status: input.status || "PRESENT",
        },
      });
    }),

  updateStandbyStudentStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.standbyStudents.update({
        where: { id: input.id },
        data: {
          status: input.status,
        },
      });
    }),

  deleteStandbyStudent: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.standbyStudents.delete({
        where: { id: input.id },
      });
      return { message: "Standby student record deleted successfully" };
    }),

  FacialcreateStandbyStudent: publicProcedure
    .input(
      z.object({
        studentId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingStudent = await ctx.db.standbyStudents.findFirst({
        where: { studentId: input.studentId },
      });

      if (existingStudent) {
        console.log("already");
      } else {
        const now = new Date();
        const philippinesTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

        return ctx.db.standbyStudents.create({
          data: {
            studentId: input.studentId,
            startTime: philippinesTime,
            status: "PRESENT",
          },
        });
      }
    }),
});
