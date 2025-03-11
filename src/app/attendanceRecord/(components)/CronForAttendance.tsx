"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

export default function CronForAttendance() {
  const { mutateAsync, isPending } =
    api.cronforAttendance.ensureAttendanceForToday.useMutation();
  const [isLoading, setIsLoading] = useState(false);

  const utils = api.useUtils();

  const ensureAttendance = async () => {
    setIsLoading(true);
    try {
      await mutateAsync();
      console.log("Attendance record ensured for today.");

      await utils.attendances.getAttendance.invalidate();
      console.log("Attendance data refetched.");
    } catch (error) {
      console.error("Failed to ensure or refetch attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ensureAttendance();

    const interval = setInterval(() => {
      ensureAttendance();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [mutateAsync, utils]);

  if (isLoading || isPending) {
    return <div>Ensuring attendance record...</div>;
  }

  return null;
}
