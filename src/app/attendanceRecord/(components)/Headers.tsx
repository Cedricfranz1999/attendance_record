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

const links = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: "/admin/attendance",
    label: "Attendance",
    icon: <SquareArrowDown className="h-5 w-5" />,
  },
  {
    href: "/admin/training",
    label: "Trainee Management",
    icon: <KeyboardMusic className="h-5 w-5" />,
  },
  {
    href: "/admin/members",
    label: "NLCM Members",
    icon: <Users2 className="h-5 w-5" />,
  },
  {
    href: "/admin/soul-winners",
    label: "Soul Winners",
    icon: <Mailbox className="h-5 w-5" />,
  },
  {
    href: "/admin/making-disciple",
    label: "Making Disciple",
    icon: <Component className="h-5 w-5" />,
  },
  {
    href: "/admin/prayer-list",
    label: "Prayer List",
    icon: <HandCoins className="h-5 w-5" />,
  },
  {
    href: "/admin/lifestyle-skill-record",
    label: "Lifestyle and Skill Record",
    icon: <NotepadText className="h-5 w-5" />,
  },
  {
    href: "/admin/baptism",
    label: "Baptism Record",
    icon: <Droplets className="h-5 w-5" />,
  },
  {
    href: "/admin/dedication",
    label: "Dedication Record",
    icon: <Baby className="h-5 w-5" />,
  },
  {
    href: "/admin/marriage",
    label: "Marriage Record",
    icon: <UsersRound className="h-5 w-5" />,
  },
];

const Header = () => {
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
              <img src="/logo.jpg" width={25} className="rounded-full" />
              <span>NLCM</span>
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

      {/* User Account Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;
