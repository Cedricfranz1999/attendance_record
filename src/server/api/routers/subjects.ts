import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const SubjectsRouter = createTRPCRouter({
  toggleSubjectActive: publicProcedure
    .input(z.object({ subjectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // First, deactivate all subjects
      await ctx.db.subject.updateMany({
        data: {
          active: false,
        },
      });

      // Get the current subject
      const subject = await ctx.db.subject.findUnique({
        where: { id: input.subjectId },
      });

      if (!subject) {
        throw new Error("Subject not found");
      }

      // Toggle the active status of the current subject (always set to true since we deactivated all)
      const updatedSubject = await ctx.db.subject.update({
        where: { id: input.subjectId },
        data: {
          active: true, // Always set to true since we want to activate this one
        },
      });

      return updatedSubject;
    }),
  getSubjects: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
        teacherId: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.subject.count({
        where: {
          AND: [
            input.search
              ? {
                  name: { contains: input.search, mode: "insensitive" },
                }
              : {},
            input.teacherId ? { teacherId: input.teacherId } : {},
          ],
        },
      });

      const data = await ctx.db.subject.findMany({
        where: {
          AND: [
            input.search
              ? {
                  name: { contains: input.search, mode: "insensitive" },
                }
              : {},
            input.teacherId ? { teacherId: input.teacherId } : {},
          ],
        },
        include: {
          teacher: true,
        },
        orderBy: {
          order: "asc",
        },
        skip: input.skip,
        take: input.take,
      });

      return { data, total };
    }),

  getSubjectById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.subject.findUnique({
        where: { id: input.id },
        include: {
          teacher: true,
        },
      });
    }),

  createOrUpdateSubject: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        duration: z.number().optional().nullable(),
        teacherId: z.number(),
        order: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Convert string times to Date objects if provided
      const startTime = input.startTime ? new Date(input.startTime) : null;
      const endTime = input.endTime ? new Date(input.endTime) : null;

      if (input.id) {
        return ctx.db.subject.update({
          where: { id: input.id },
          data: {
            name: input.name,
            startTime,
            endTime,
            duration: input.duration,
            teacherId: input.teacherId,
            order: input.order,
          },
          include: {
            teacher: true,
          },
        });
      } else {
        return ctx.db.subject.create({
          data: {
            name: input.name,
            startTime,
            endTime,
            duration: input.duration,
            teacherId: input.teacherId,
            order: input.order,
          },
          include: {
            teacher: true,
          },
        });
      }
    }),

  deleteSubject: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.subject.delete({
        where: { id: input.id },
      });
      return { message: "Subject deleted successfully" };
    }),

  getAllTeachers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.teacher.findMany({
      orderBy: { firstname: "asc" },
      select: {
        id: true,
        firstname: true,
        middleName: true,
        lastName: true,
        image: true,
      },
    });
  }),
});

export default SubjectsRouter;
