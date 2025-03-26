"use client";

import Link from "next/link";
import {
  KeyboardMusic,
  LayoutDashboard,
  NotebookText,
  ShieldUser,
  SquareArrowDown,
  Users2,
} from "lucide-react";

import { usePathname } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  const links = [
    {
      href: "/attendanceRecord/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/attendanceRecord/students",
      label: "Students",
      icon: <ShieldUser className="h-4 w-4" />,
    },
    {
      href: "/attendanceRecord/teachers",
      label: "Teachers",
      icon: <Users2 className="h-4 w-4" />,
    },

    {
      href: "/attendanceRecord/subjects",
      label: "Subjects",
      icon: <NotebookText className="h-4 w-4" />,
    },

    {
      href: "/attendanceRecord/attendance",
      label: "Attendance",
      icon: <NotebookText className="h-4 w-4" />,
    },
    {
      href: "/attendanceRecord/testers",
      label: "Facial Recognition Attendance",
      icon: <NotebookText className="h-4 w-4" />,
    },

    {
      href: "/attendanceRecord/facial-recognition-standby",
      label: "Standy Facial Recognition",
      icon: <NotebookText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="sticky top-0 hidden h-screen w-64 overflow-y-auto border-r bg-muted md:block">
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl font-semibold text-[#383838]">
              Attendance Record
            </span>
          </Link>
        </div>

        <div className="mt-6 flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`my-1 flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  isActive(href)
                    ? "bg-teal-700 text-white"
                    : "text-muted-foreground"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
