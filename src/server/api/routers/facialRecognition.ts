import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const facialRecognitionRouter = createTRPCRouter({
  studentsDAta: publicProcedure.query(async ({ ctx, input }) => {
    const data = await ctx.db.standbyStudents.findMany();

    return data;
  }),
});
