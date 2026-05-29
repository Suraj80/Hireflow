import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and workspace defaults</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
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

        <TabsContent value="workspace" className="mt-6 space-y-6">
          <Card className="border border-border">
            <CardHeader><CardTitle className="text-base">Workspace Defaults</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Default timezone</Label>
                  <Select defaultValue="asia-kolkata">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia-kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="america-new-york">America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default dashboard view</Label>
                  <Select defaultValue="hiring-overview">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hiring-overview">Hiring overview</SelectItem>
                      <SelectItem value="pipeline">Pipeline</SelectItem>
                      <SelectItem value="interviews">Interviews</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="gradient-primary text-primary-foreground border-0">
                <Save className="h-4 w-4 mr-2" />
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
