"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  CircleUser,
  LayoutDashboard,
  SquareArrowDown,
  KeyboardMusic,
  Users2,
  Mailbox,
  Component,
  HandCoins,
  NotepadText,
  Droplets,
  UsersRound,
  Baby,
  NotebookText,
  ShieldUser,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import { Label } from "@/components/ui/label";

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
    href: "/attendanceRecord/attendance_overview",
    label: "Attendances",
    icon: <NotebookText className="h-4 w-4" />,
  },
];

const Header = () => {
  const { user } = useUser();
  console.log(user);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
    localStorage.setItem("loginToken", "noToken");
    router.push("/sign-in");
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      {/* Sidebar Toggle Button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        {/* Sidebar Content */}
        <SheetContent side="left" className="flex flex-col p-0">
          <div className="flex h-14 items-center border-b px-2 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span>Attendance Record</span>
            </Link>
          </div>
          <nav className="grid gap-2 text-lg font-medium">
            {links.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto"></div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="w-full flex-1">
        <form>
          <div className="relative">
            {/* Add search input here if needed */}
          </div>
        </form>
      </div>

      <div>
        {" "}
        <div className="mb-2 flex flex-col">
          <SignedIn>
            <div>
              <div className="flex w-full flex-shrink-0 items-center justify-between gap-2 p-2">
                <div className="ml-2 flex items-center justify-center space-x-2">
                  <div>
                    <UserButton afterSignOutUrl="/sign-in" />
                  </div>
                  <div className="flex flex-col items-start justify-start">
                    <Label className="text-center text-neutral-400">
                      {user?.firstName} <br /> {user?.lastName}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </SignedIn>
          <div className="px-4"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
