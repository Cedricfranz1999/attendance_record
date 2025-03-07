"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { format, subDays, startOfMonth } from "date-fns";
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  Activity,
  PieChartIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "../(components)/Loader";
import { Button } from "@/components/ui/button";

// Custom color palette
const COLORS = [
  "#4ade80",
  "#f87171",
  "#facc15",
  "#60a5fa",
  "#c084fc",
  "#34d399",
  "#fb923c",
  "#a3e635",
];
const STATUS_COLORS = {
  PRESENT: "#4ade80",
  ABSENT: "#f87171",
  LATE: "#facc15",
};

const DashboardPage = () => {
  const [timeRange, setTimeRange] = useState<string>("week");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  // Add error states
  const [hasError, setHasError] = useState(false);

  // Get current date and calculate date ranges
  const today = new Date();
  const startDate =
    timeRange === "week"
      ? subDays(today, 7)
      : timeRange === "month"
        ? startOfMonth(today)
        : subDays(today, 30);

  // Fetch summary statistics
  const {
    data: summaryData,
    isLoading: loadingSummary,
    error: summaryError,
  } = api.dashboard.getSummaryStats.useQuery(undefined, {});

  // Fetch attendance status distribution
  const {
    data: statusDistribution,
    isLoading: loadingStatus,
    error: statusError,
  } = api.dashboard.getAttendanceStatusDistribution.useQuery(undefined, {});

  // Fetch attendance trends
  const { data: attendanceTrends, isLoading: loadingTrends } =
    api.dashboard.getAttendanceTrends.useQuery({
      startDate,
      endDate: today,
    });

  // Fetch subject-wise attendance
  const { data: subjectAttendance, isLoading: loadingSubjects } =
    api.dashboard.getSubjectAttendance.useQuery();

  // Fetch student attendance performance
  const { data: studentPerformance, isLoading: loadingStudents } =
    api.dashboard.getStudentPerformance.useQuery({
      limit: 10,
    });

  // Fetch day of week attendance patterns
  const { data: dayOfWeekData, isLoading: loadingDayOfWeek } =
    api.dashboard.getDayOfWeekAttendance.useQuery();

  // Fetch subjects for filter
  const { data: subjects } = api.attendanceOverview.getSubjects.useQuery({
    take: 100,
  });

  // Fetch monthly comparison data
  const { data: monthlyData, isLoading: loadingMonthly } =
    api.dashboard.getMonthlyComparison.useQuery();

  // Fetch time of day patterns
  const { data: timeOfDayData, isLoading: loadingTimeOfDay } =
    api.dashboard.getTimeOfDayPatterns.useQuery();

  // Fetch teacher performance
  const { data: teacherData, isLoading: loadingTeacher } =
    api.dashboard.getTeacherPerformance.useQuery();

  // Fetch attendance duration data
  const { data: durationData, isLoading: loadingDuration } =
    api.dashboard.getAttendanceDuration.useQuery();

  // Check if any data is loading
  const isLoading =
    (loadingSummary ||
      loadingStatus ||
      loadingTrends ||
      loadingSubjects ||
      loadingStudents ||
      loadingDayOfWeek ||
      loadingMonthly ||
      loadingTimeOfDay ||
      loadingTeacher ||
      loadingDuration) &&
    !hasError;

  // Format data for charts
  const formatStatusData = () => {
    if (!statusDistribution) return [];

    return [
      {
        name: "Present",
        value: statusDistribution.present,
        color: STATUS_COLORS.PRESENT,
      },
      {
        name: "Absent",
        value: statusDistribution.absent,
        color: STATUS_COLORS.ABSENT,
      },
      {
        name: "Late",
        value: statusDistribution.late,
        color: STATUS_COLORS.LATE,
      },
    ];
  };

  const formatTrendsData = () => {
    if (!attendanceTrends) return [];

    return attendanceTrends.map((item) => ({
      date: format(new Date(item.date), "MMM dd"),
      present: item.present,
      absent: item.absent,
      late: item.late,
    }));
  };

  const formatSubjectData = () => {
    if (!subjectAttendance) return [];

    return subjectAttendance.map((item, index) => ({
      name:
        item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
      presentRate: Number.parseFloat((item.presentRate * 100).toFixed(1)),
      absentRate: Number.parseFloat((item.absentRate * 100).toFixed(1)),
      lateRate: Number.parseFloat((item.lateRate * 100).toFixed(1)),
      color: COLORS[index % COLORS.length],
    }));
  };

  const formatStudentData = () => {
    if (!studentPerformance) return [];

    return studentPerformance.map((item, index) => ({
      name: `${item.firstname} ${item.lastName.charAt(0)}.`,
      attendanceRate: Number.parseFloat((item.attendanceRate * 100).toFixed(1)),
      lateRate: Number.parseFloat((item.lateRate * 100).toFixed(1)),
      color: COLORS[index % COLORS.length],
    }));
  };

  const formatDayOfWeekData = () => {
    if (!dayOfWeekData) return [];

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayOfWeekData.map((item) => ({
      name: days[item.dayOfWeek],
      present: item.present,
      absent: item.absent,
      late: item.late,
    }));
  };

  const formatMonthlyData = () => {
    if (!monthlyData) return [];

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((month) => {
      const monthData = monthlyData.find(
        (item) => format(new Date(item.month), "MMM") === month,
      );
      return {
        month,
        attendance: monthData
          ? Number.parseFloat((monthData.attendanceRate * 100).toFixed(1))
          : 0,
      };
    });
  };

  const formatTimeOfDayData = () => {
    if (!timeOfDayData) return [];

    return timeOfDayData.map((item) => ({
      hour: `${item.hour}:00`,
      count: item.count,
      lateCount: item.lateCount,
    }));
  };

  const formatTeacherData = () => {
    if (!teacherData) return [];

    return teacherData.map((item, index) => ({
      name: `${item.firstname} ${item.lastName.charAt(0)}.`,
      presentRate: Number.parseFloat((item.presentRate * 100).toFixed(1)),
      absentRate: Number.parseFloat((item.absentRate * 100).toFixed(1)),
      lateRate: Number.parseFloat((item.lateRate * 100).toFixed(1)),
      color: COLORS[index % COLORS.length],
    }));
  };

  const formatDurationData = () => {
    if (!durationData) return [];

    return durationData.map((item) => ({
      duration: `${item.durationHours} hr`,
      count: item.count,
    }));
  };

  // Calculate attendance rate
  const calculateAttendanceRate = () => {
    if (!statusDistribution) return 0;
    const total =
      statusDistribution.present +
      statusDistribution.absent +
      statusDistribution.late;
    return total > 0 ? (statusDistribution.present / total) * 100 : 0;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded border bg-background p-2 shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={`item-${index}`}
              style={{ color: entry.color || entry.fill }}
            >
              {entry.name}: {entry.value}
              {entry.name === "attendanceRate" ||
              entry.name === "presentRate" ||
              entry.name === "absentRate" ||
              entry.name === "lateRate"
                ? "%"
                : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto p-2 md:p-4">
      {!isLoading ? (
        <Loader />
      ) : hasError ? (
        <div className="container mx-auto p-6 text-center">
          <h2 className="mb-4 text-2xl font-bold text-red-600">
            Error Loading Dashboard
          </h2>
          <p className="mb-4">
            There was a problem loading the dashboard data. This could be due
            to:
          </p>
          <ul className="mx-auto mb-6 max-w-md list-inside list-disc text-left">
            <li>Missing or incomplete database records</li>
            <li>Server connection issues</li>
            <li>API configuration problems</li>
          </ul>
          <Button onClick={() => window.location.reload()}>
            Retry Loading
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Attendance Dashboard
              </h1>
              <p className="text-muted-foreground">
                Analytics and insights for your attendance system
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects?.data.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData?.totalStudents || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaryData?.activeStudents || 0} active in the last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Subjects
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData?.totalSubjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {summaryData?.totalTeachers || 0} teachers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Attendance Rate
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {calculateAttendanceRate().toFixed(1)}%
                </div>
                <Progress value={calculateAttendanceRate()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Records
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData?.totalRecords || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summaryData?.recentRecords || 0} in the last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 md:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Attendance Status Distribution & Trends */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="mr-2 h-5 w-5" />
                      Attendance Status Distribution
                    </CardTitle>
                    <CardDescription>
                      Overall attendance status breakdown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formatStatusData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                        >
                          {formatStatusData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Attendance Trends
                    </CardTitle>
                    <CardDescription>
                      Daily attendance patterns over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatTrendsData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="present"
                          stroke={STATUS_COLORS.PRESENT}
                          activeDot={{ r: 8 }}
                          name="Present"
                        />
                        <Line
                          type="monotone"
                          dataKey="absent"
                          stroke={STATUS_COLORS.ABSENT}
                          name="Absent"
                        />
                        <Line
                          type="monotone"
                          dataKey="late"
                          stroke={STATUS_COLORS.LATE}
                          name="Late"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Day of Week Patterns & Time of Day Patterns */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Day of Week Patterns
                    </CardTitle>
                    <CardDescription>
                      Attendance patterns by day of week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatDayOfWeekData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="present"
                          fill={STATUS_COLORS.PRESENT}
                          name="Present"
                        />
                        <Bar
                          dataKey="absent"
                          fill={STATUS_COLORS.ABSENT}
                          name="Absent"
                        />
                        <Bar
                          dataKey="late"
                          fill={STATUS_COLORS.LATE}
                          name="Late"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2 h-5 w-5" />
                      Time of Day Patterns
                    </CardTitle>
                    <CardDescription>
                      Attendance and late arrivals by hour
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={formatTimeOfDayData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stackId="1"
                          stroke={STATUS_COLORS.PRESENT}
                          fill={STATUS_COLORS.PRESENT}
                          name="Attendance"
                        />
                        <Area
                          type="monotone"
                          dataKey="lateCount"
                          stackId="2"
                          stroke={STATUS_COLORS.LATE}
                          fill={STATUS_COLORS.LATE}
                          name="Late Arrivals"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Comparison & Attendance Duration */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="mr-2 h-5 w-5" />
                      Monthly Attendance Comparison
                    </CardTitle>
                    <CardDescription>
                      Attendance rates across months
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={90} data={formatMonthlyData()}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="month" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Attendance Rate"
                          dataKey="attendance"
                          stroke={COLORS[3]}
                          fill={COLORS[3]}
                          fillOpacity={0.6}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="mr-2 h-5 w-5" />
                      Attendance Duration Distribution
                    </CardTitle>
                    <CardDescription>
                      Distribution of time spent in attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatDurationData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="duration" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                          dataKey="count"
                          fill={COLORS[4]}
                          name="Number of Records"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              {/* Student Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Student Attendance Performance
                  </CardTitle>
                  <CardDescription>
                    Top 10 students by attendance rate
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatStudentData()}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="attendanceRate"
                        fill={STATUS_COLORS.PRESENT}
                        name="Attendance Rate"
                      />
                      <Bar
                        dataKey="lateRate"
                        fill={STATUS_COLORS.LATE}
                        name="Late Rate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Student Attendance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Student Attendance Trends
                  </CardTitle>
                  <CardDescription>
                    Attendance patterns over time for selected students
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex h-full items-center justify-center">
                    <p className="text-muted-foreground">
                      Select specific students to view their attendance trends
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-4">
              {/* Subject Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Subject-wise Attendance
                  </CardTitle>
                  <CardDescription>Attendance rates by subject</CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatSubjectData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="presentRate"
                        fill={STATUS_COLORS.PRESENT}
                        name="Present Rate"
                      />
                      <Bar
                        dataKey="absentRate"
                        fill={STATUS_COLORS.ABSENT}
                        name="Absent Rate"
                      />
                      <Bar
                        dataKey="lateRate"
                        fill={STATUS_COLORS.LATE}
                        name="Late Rate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Teacher Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Teacher-wise Subject Attendance
                  </CardTitle>
                  <CardDescription>Attendance rates by teacher</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatTeacherData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="presentRate"
                        fill={STATUS_COLORS.PRESENT}
                        name="Present Rate"
                      />
                      <Bar
                        dataKey="absentRate"
                        fill={STATUS_COLORS.ABSENT}
                        name="Absent Rate"
                      />
                      <Bar
                        dataKey="lateRate"
                        fill={STATUS_COLORS.LATE}
                        name="Late Rate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
