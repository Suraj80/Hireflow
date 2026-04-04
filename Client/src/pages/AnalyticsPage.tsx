import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, Users, Clock, Target } from "lucide-react";

const kpis = [
  { label: "Total Applications", value: "3,847", change: "+12%", icon: Users },
  { label: "Avg. Time to Hire", value: "18 days", change: "-11%", icon: Clock },
  { label: "Offer Accept Rate", value: "87%", change: "+5%", icon: Target },
  { label: "Pipeline Velocity", value: "94/mo", change: "+8%", icon: TrendingUp },
];

const funnelData = [
  { stage: "Applied", count: 1284 },
  { stage: "Screened", count: 856 },
  { stage: "Interview", count: 428 },
  { stage: "Final", count: 214 },
  { stage: "Offer", count: 142 },
  { stage: "Hired", count: 98 },
];

const timeToHire = [
  { month: "Jan", days: 22 },
  { month: "Feb", days: 21 },
  { month: "Mar", days: 19 },
  { month: "Apr", days: 20 },
  { month: "May", days: 18 },
  { month: "Jun", days: 16 },
];

const sourceData = [
  { name: "LinkedIn", value: 35 },
  { name: "Referrals", value: 25 },
  { name: "Job Boards", value: 20 },
  { name: "Career Page", value: 15 },
  { name: "Other", value: 5 },
];

const COLORS = ["hsl(221, 83%, 53%)", "hsl(250, 95%, 64%)", "hsl(199, 89%, 48%)", "hsl(142, 76%, 36%)", "hsl(215, 16%, 47%)"];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Hiring metrics and insights</p>
        </div>
        <Select defaultValue="30d">
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <k.icon className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="secondary" className="text-xs text-success">{k.change}</Badge>
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-sm text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Hiring Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Time to Hire Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeToHire}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(250, 95%, 64%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(250, 95%, 64%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="days" stroke="hsl(250, 95%, 64%)" fillOpacity={1} fill="url(#colorTime)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base">Source Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={250} className="max-w-xs">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm">{s.name}</span>
                  <span className="text-sm font-semibold">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
