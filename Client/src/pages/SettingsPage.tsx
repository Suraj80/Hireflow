import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload, Trash2 } from "lucide-react";

const teamMembers = [
  { name: "John Doe", email: "john@hireflow.com", role: "Admin", initials: "JD" },
  { name: "Jane Smith", email: "jane@hireflow.com", role: "Recruiter", initials: "JS" },
  { name: "Mike Johnson", email: "mike@hireflow.com", role: "Hiring Manager", initials: "MJ" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and team</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg gradient-primary text-primary-foreground">JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" /> Upload Photo</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input defaultValue="John" className="mt-1.5" /></div>
                <div><Label>Last Name</Label><Input defaultValue="Doe" className="mt-1.5" /></div>
              </div>
              <div><Label>Email</Label><Input defaultValue="john@hireflow.com" className="mt-1.5" /></div>
              <div><Label>Job Title</Label><Input defaultValue="HR Manager" className="mt-1.5" /></div>
              <Button className="gradient-primary text-primary-foreground border-0"><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-6">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Team Members</CardTitle>
              <Button size="sm" className="gradient-primary text-primary-foreground border-0">Invite Member</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamMembers.map((m) => (
                <div key={m.email} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs gradient-primary text-primary-foreground">{m.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New applications", desc: "Get notified when candidates apply" },
                { label: "Interview reminders", desc: "Receive reminders before interviews" },
                { label: "Pipeline updates", desc: "When candidates move stages" },
                { label: "Weekly digest", desc: "Summary of hiring activity" },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
