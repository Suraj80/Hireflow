import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Plus, Clock, Video, MapPin } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const hours = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];

const interviews = [
  { id: 1, name: "Sarah Chen", role: "Senior Frontend Dev", time: "Today, 2:00 PM", type: "Video", duration: "45 min", initials: "SC", day: 0, hour: 5 },
  { id: 2, name: "Alex Kim", role: "Product Designer", time: "Today, 4:30 PM", type: "In-person", duration: "60 min", initials: "AK", day: 0, hour: 7 },
  { id: 3, name: "Maria Garcia", role: "Data Analyst", time: "Tomorrow, 10:00 AM", type: "Video", duration: "30 min", initials: "MG", day: 1, hour: 1 },
  { id: 4, name: "James Park", role: "Backend Engineer", time: "Wed, 11:00 AM", type: "Phone", duration: "30 min", initials: "JP", day: 2, hour: 2 },
];

export default function InterviewsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="text-muted-foreground">Schedule and manage interviews</p>
        </div>
        <Button className="gradient-primary text-primary-foreground border-0">
          <Plus className="h-4 w-4 mr-2" /> Schedule Interview
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 min-w-[600px]">
                <div className="border-r border-border">
                  <div className="h-10" />
                  {hours.map((h) => (
                    <div key={h} className="h-14 flex items-start justify-end pr-2 text-xs text-muted-foreground pt-1">{h}</div>
                  ))}
                </div>
                {days.map((day, di) => (
                  <div key={day} className="relative border-r border-border last:border-0">
                    <div className="h-10 flex items-center justify-center text-sm font-medium border-b border-border">
                      {day}
                    </div>
                    {hours.map((_, hi) => (
                      <div key={hi} className="h-14 border-b border-border/30" />
                    ))}
                    {interviews
                      .filter((i) => i.day === di)
                      .map((i) => (
                        <div
                          key={i.id}
                          className="absolute left-1 right-1 rounded-lg gradient-primary p-2 text-primary-foreground z-10"
                          style={{ top: `${40 + i.hour * 56}px`, height: i.duration === "60 min" ? "56px" : "42px" }}
                        >
                          <p className="text-xs font-semibold truncate">{i.name}</p>
                          <p className="text-[10px] opacity-80 truncate">{i.duration}</p>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {interviews.map((i) => (
              <div key={i.id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs gradient-primary text-primary-foreground">{i.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.role}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> {i.time}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {i.type === "Video" ? <Video className="h-3 w-3 mr-1" /> : <MapPin className="h-3 w-3 mr-1" />}
                    {i.type}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
