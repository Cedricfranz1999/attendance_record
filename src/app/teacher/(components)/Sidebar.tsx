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
      href: "/teacher/attendance",
      label: "Attendance",
      icon: <NotebookText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="sticky top-0 hidden h-screen w-64 overflow-y-auto border-r bg-muted md:block">
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo.jpg" width={50} className="rounded-full" />
            <span className="text-3xl font-semibold text-[#383838]">NLCM</span>
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
