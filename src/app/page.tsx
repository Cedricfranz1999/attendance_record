import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  LogOut,
  Clock,
  ClipboardList,
  BookOpen,
  Users,
  Camera,
  CheckCircle,
  BarChart,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-center px-10 py-4 shadow-md drop-shadow-md">
          <div className="flex w-full max-w-6xl items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src={"/logo.jpg"} width={30} height={30} alt="image" />
              <span className="text-xl font-bold">IAMC</span>
            </div>
            <nav className="hidden gap-6 md:flex">
              <Link
                href="#features"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                How It Works
              </Link>
            </nav>
            <div className="ml-10 flex items-center">
              <Button asChild variant="outline">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted py-20 md:py-32">
        <div className="container flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            IoT-BASED AUTOMATED ATTENDANCE MONITORING SYSTEM FOR CLASSROOMS
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
            Automate classroom attendance with our dual-camera AI system. Track
            entries, exits, and time spent in class with precision and ease.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/demo">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          <div className="relative mt-16 w-full max-w-lg rounded-lg border bg-background p-2 shadow-lg">
            <Image
              src="/camera3.jpeg"
              width={500}
              height={500}
              alt="Classroom with attendance system"
            />
            <div className="absolute -right-1 -top-1 rounded-full bg-primary bg-white p-1">
              <Image
                width={50}
                height={50}
                alt="image"
                src={"/logo.jpg"}
                className="rounded-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container flex flex-col items-center">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Comprehensive Attendance Management
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our system offers a complete solution for classroom attendance
              tracking
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Entry Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatically detect and record when students enter the
                  classroom using advanced facial recognition.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <LogOut className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Exit Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor when students leave the classroom to maintain accurate
                  attendance records throughout the session.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Time Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Calculate and record the exact time each student spends in
                  class for each subject.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Attendance Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Comprehensive dashboard to view, edit, and manage student
                  attendance records with detailed analytics.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Subject Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Easily create, edit, and organize subjects with customizable
                  attendance requirements and schedules.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Teacher Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Assign teachers to subjects, manage permissions, and provide
                  individual dashboards for monitoring class attendance.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted py-20">
        <div className="container flex flex-col items-center">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Dual-Camera System
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Our innovative setup uses two cameras to ensure complete coverage
              of your classroom
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-12 md:grid-cols-2">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-8 min-w-min">
                <Image
                  src="/camera5.jpeg"
                  width={500}
                  height={300}
                  alt="Entry camera"
                  className="min-h-[300px] max-w-[300px] rounded-lg border shadow-md"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background p-2 shadow-md">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Entry Camera</h3>
              <p className="mt-2 text-muted-foreground">
                Positioned at the entrance to detect and record students as they
                enter the classroom, with high-accuracy facial recognition.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="min-w-m relative mb-8">
                <Image
                  src="/camera6.jpeg"
                  width={500}
                  height={300}
                  alt="Exit camera"
                  className="min-h-[300px] max-w-[300px] rounded-lg border shadow-md"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background p-2 shadow-md">
                  <LogOut className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Exit Camera</h3>
              <p className="mt-2 text-muted-foreground">
                Positioned at the exit to track when students leave, ensuring
                accurate time calculations and preventing attendance fraud.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-16 w-full max-w-3xl">
            <div className="rounded-lg border bg-background p-8 shadow-lg">
              <h3 className="mb-6 text-center text-xl font-bold">
                How the System Works:
              </h3>
              <ol className="mx-auto max-w-2xl space-y-4">
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1">
                    <span className="flex h-5 w-5 items-center justify-center font-medium text-primary">
                      1
                    </span>
                  </div>
                  <div>
                    <strong>Student Registration:</strong> Students are
                    registered in the system with their photos for facial
                    recognition.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1">
                    <span className="flex h-5 w-5 items-center justify-center font-medium text-primary">
                      2
                    </span>
                  </div>
                  <div>
                    <strong>Entry Detection:</strong> The entry camera
                    identifies students as they enter and logs their arrival
                    time.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1">
                    <span className="flex h-5 w-5 items-center justify-center font-medium text-primary">
                      3
                    </span>
                  </div>
                  <div>
                    <strong>Exit Detection:</strong> The exit camera records
                    when students leave the classroom.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1">
                    <span className="flex h-5 w-5 items-center justify-center font-medium text-primary">
                      4
                    </span>
                  </div>
                  <div>
                    <strong>Time Calculation:</strong> The system automatically
                    calculates attendance duration for each student.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1">
                    <span className="flex h-5 w-5 items-center justify-center font-medium text-primary">
                      5
                    </span>
                  </div>
                  <div>
                    <strong>Reporting:</strong> Detailed attendance reports are
                    generated for teachers and administrators.
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="container flex flex-col items-center">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Why Choose Our System
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Transform your classroom attendance process with these key
              benefits
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Accuracy</h3>
              <p className="mt-2 text-muted-foreground">
                Eliminate manual errors and proxy attendance with precise facial
                recognition technology.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Time Efficiency</h3>
              <p className="mt-2 text-muted-foreground">
                Save valuable class time by automating the attendance process
                completely.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <BarChart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Detailed Analytics</h3>
              <p className="mt-2 text-muted-foreground">
                Gain insights into attendance patterns and student engagement
                with comprehensive reports.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Security</h3>
              <p className="mt-2 text-muted-foreground">
                Ensure only authorized students are present in your classroom
                with real-time monitoring.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Stakeholder Access</h3>
              <p className="mt-2 text-muted-foreground">
                Provide teachers, administrators, and even parents with
                appropriate access to attendance data.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-bold">Academic Integration</h3>
              <p className="mt-2 text-muted-foreground">
                Easily integrate attendance data with your existing academic
                management systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Ready to Transform Your Classroom?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/90">
            Join the growing number of educational institutions using our smart
            attendance system to save time and improve accuracy.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container flex flex-col items-center">
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="flex items-center gap-2">
              <Image src={"/logo.jpg"} width={30} height={30} alt="image" />
              <span className="text-xl font-bold">IAMC</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6">
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                How It Works
              </Link>

              <Link
                href="/privacy"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
