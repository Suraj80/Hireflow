import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const stats = [
  { label: "Open Positions", value: "24", change: "+3 this week", icon: Briefcase, trend: "up" },
  { label: "Total Candidates", value: "1,284", change: "+127 this month", icon: Users, trend: "up" },
  { label: "Avg. Time to Hire", value: "18 days", change: "-2 days", icon: Clock, trend: "up" },
  { label: "Offer Accept Rate", value: "87%", change: "+5%", icon: TrendingUp, trend: "up" },
];

const applicationData = [
  { name: "Jan", applications: 65 },
  { name: "Feb", applications: 85 },
  { name: "Mar", applications: 120 },
  { name: "Apr", applications: 95 },
  { name: "May", applications: 140 },
  { name: "Jun", applications: 180 },
  { name: "Jul", applications: 165 },
];

const hiringByDept = [
  { dept: "Engineering", hires: 12 },
  { dept: "Design", hires: 5 },
  { dept: "Marketing", hires: 8 },
  { dept: "Sales", hires: 10 },
  { dept: "Product", hires: 6 },
];

const upcomingInterviews = [
  { name: "Sarah Chen", role: "Senior Frontend Dev", time: "Today, 2:00 PM", initials: "SC" },
  { name: "Alex Kim", role: "Product Designer", time: "Today, 4:30 PM", initials: "AK" },
  { name: "Maria Garcia", role: "Data Analyst", time: "Tomorrow, 10:00 AM", initials: "MG" },
];

const recentActivity = [
  { action: "New application", detail: "James Park applied for Backend Engineer", time: "5m ago" },
  { action: "Interview scheduled", detail: "Sarah Chen — Senior Frontend Dev", time: "1h ago" },
  { action: "Candidate moved", detail: "Alex Kim moved to Final Round", time: "2h ago" },
  { action: "Job posted", detail: "UI/UX Designer position published", time: "4h ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, here's your hiring overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border border-border hover:shadow-elevated transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs text-success font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {s.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={applicationData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="applications" stroke="hsl(221, 83%, 53%)" fillOpacity={1} fill="url(#colorApps)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Hires by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hiringByDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="hires" fill="hsl(221, 83%, 53%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingInterviews.map((i) => (
              <div key={i.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs gradient-primary text-primary-foreground">{i.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.role}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{i.time}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((a, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="h-2 w-2 rounded-full gradient-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
