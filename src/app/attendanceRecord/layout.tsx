"use client";

import { useRouter } from "next/navigation";
import Header from "./(components)/Headers";
import Sidebar from "./(components)/Sidebar";
import { useUser } from "@clerk/nextjs";
import ProtectedAdminRoute from "../_components/protectoradmin";
import CronForAttendance from "./(components)/CronForAttendance";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedAdminRoute>
      <CronForAttendance></CronForAttendance>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminLayout;
