import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const AttendanceOverview = createTRPCRouter({
  // Attendance Records procedures
  getAttendanceRecords: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        studentIds: z.array(z.number()).optional(),
        subjectIds: z.array(z.number()).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        status: z.enum(["PRESENT", "ABSENT", "LATE"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause based on filters
      const where: any = {};

      // Filter by student IDs
      if (input.studentIds && input.studentIds.length > 0) {
        where.studentId = { in: input.studentIds };
      }

      // Filter by subject IDs
      if (input.subjectIds && input.subjectIds.length > 0) {
        where.subjectId = { in: input.subjectIds };
      }

      // Filter by status
      if (input.status) {
        where.status = input.status;
      }

      // Filter by date range
      if (input.startDate || input.endDate) {
        where.attendance = {
          date: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        };
      }

      // Count total records with filters
      const total = await ctx.db.attendanceRecord.count({ where });

      // Get filtered records with pagination
      const data = await ctx.db.attendanceRecord.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [
          { attendance: { date: "desc" } },
          { subject: { order: "asc" } },
        ],
        include: {
          attendance: true,
          student: {
            select: {
              id: true,
              firstname: true,
              middleName: true,
              lastName: true,
              image: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      return { data, total };
    }),

  // Attendance statistics procedure
  getAttendanceStats: publicProcedure
    .input(
      z.object({
        studentId: z.number().optional(),
        subjectId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build the where clause based on filters
      const where: any = {};

      if (input.studentId) {
        where.studentId = input.studentId;
      }

      if (input.subjectId) {
        where.subjectId = input.subjectId;
      }

      if (input.startDate || input.endDate) {
        where.attendance = {
          date: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        };
      }

      // Get counts for each status
      const presentCount = await ctx.db.attendanceRecord.count({
        where: {
          ...where,
          status: "PRESENT",
        },
      });

      const absentCount = await ctx.db.attendanceRecord.count({
        where: {
          ...where,
          status: "ABSENT",
        },
      });

      const lateCount = await ctx.db.attendanceRecord.count({
        where: {
          ...where,
          status: "LATE",
        },
      });

      const totalCount = presentCount + absentCount + lateCount;

      return {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        total: totalCount,
        presentPercentage:
          totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
        absentPercentage: totalCount > 0 ? (absentCount / totalCount) * 100 : 0,
        latePercentage: totalCount > 0 ? (lateCount / totalCount) * 100 : 0,
      };
    }),

  // Subjects procedures (moved from subjects-router.ts)
  getSubjects: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.db.subject.count({
        where: input.search
          ? {
              name: { contains: input.search, mode: "insensitive" },
            }
          : undefined,
      });

      const data = await ctx.db.subject.findMany({
        where: input.search
          ? {
              name: { contains: input.search, mode: "insensitive" },
            }
          : undefined,
        skip: input.skip,
        take: input.take,
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: {
          teacher: {
            select: {
              firstname: true,
              lastName: true,
            },
          },
        },
      });

      return { data, total };
    }),
});
