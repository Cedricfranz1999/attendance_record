import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const AttendanceRouter = createTRPCRouter({
  getAttendance: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause based on search and date range
      const where: any = {};

      if (input.startDate && input.endDate) {
        where.date = {
          gte: input.startDate,
          lte: input.endDate,
        };
      } else if (input.startDate) {
        where.date = {
          gte: input.startDate,
        };
      } else if (input.endDate) {
        where.date = {
          lte: input.endDate,
        };
      }

      if (input.search) {
        // Convert search string to date if possible
        const searchDate = new Date(input.search);
        if (!isNaN(searchDate.getTime())) {
          where.date = {
            equals: searchDate,
          };
        }
      }

      const total = await ctx.db.attendance.count({ where });

      const data = await ctx.db.attendance.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: { date: "desc" },
      });

      return { data, total };
    }),

  getAttendanceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.attendance.findUnique({
        where: { id: input.id },
      });
    }),

  createOrUpdateAttendance: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if attendance for this date already exists
        const existingAttendance = await ctx.db.attendance.findFirst({
          where: {
            date: input.date,
            ...(input.id ? { NOT: { id: input.id } } : {}),
          },
        });

        if (existingAttendance) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Attendance for this date already exists",
          });
        }

        if (input.id) {
          return ctx.db.attendance.update({
            where: { id: input.id },
            data: {
              date: input.date,
            },
          });
        } else {
          return ctx.db.attendance.create({
            data: {
              date: input.date,
            },
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create or update attendance",
        });
      }
    }),

  deleteAttendance: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.attendance.delete({
        where: { id: input.id },
      });
      return { message: "Attendance record deleted successfully" };
    }),
});
