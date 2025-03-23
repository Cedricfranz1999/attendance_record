import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const facialRecognitionRouter = createTRPCRouter({
  studentsDAta: publicProcedure.query(async ({ ctx, input }) => {
    const data = await ctx.db.standbyStudents.findMany();

    return data;
  }),

  timeIn: publicProcedure.input(z.object({
    id: z.string(),
    type: z.enum(['TIME_IN', 'TIME_OUT'])
  }))
  .mutation(async ({ctx, input}) => {
    
  }),
  
  timeOut: publicProcedure.input(z.object({
    id: z.string(),
    type: z.enum(['TIME_IN', 'TIME_OUT'])
  }))
  .mutation(async ({ctx, input}) => {
    
  }) 
});
