import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { StudentsRouter } from "./routers/students";
import { TeachersRouter } from "./routers/teachers";
import { SubjectsRouter } from "./routers/subjects";
import { AttendanceRouter } from "./routers/attendance";
import attendanceRecord from "./routers/attendanceRecord";
import { AttendanceOverview } from "./routers/attendanceOverview";
import { DashboardRouter } from "./routers/dashboard";
import { authRouter } from "./routers/auth";
import { cronForAttendanceRouter } from "./routers/cronForAttendance";
import { StandbyStudentsRouter } from "./routers/standyByStudents";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  students: StudentsRouter,
  teachers: TeachersRouter,
  subjects: SubjectsRouter,
  attendances: AttendanceRouter,
  attendanceRecord: attendanceRecord,
  attendanceOverview: AttendanceOverview,
  dashboard: DashboardRouter,
  auth: authRouter,
  cronforAttendance: cronForAttendanceRouter,
  standbyStudents: StandbyStudentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
