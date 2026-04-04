import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, CheckCircle, Circle } from "lucide-react";
import { Link } from "react-router-dom";

const stages = [
  { name: "Applied", completed: true },
  { name: "Screening", completed: true },
  { name: "Interview", completed: true },
  { name: "Final Round", completed: false, current: true },
  { name: "Offer", completed: false },
];

const currentIndex = stages.findIndex((s) => s.current);
const progress = ((currentIndex) / (stages.length - 1)) * 100;

export default function CandidateStatusPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">HireFlow</span>
        </div>

        <Card className="border border-border animate-scale-in">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Application Status</h1>
              <p className="text-muted-foreground text-sm">Senior Frontend Developer</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress</span>
                <Badge variant="secondary" className="bg-warning/10 text-warning">Final Round</Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-3">
              {stages.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-3">
                  {stage.completed ? (
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  ) : stage.current ? (
                    <div className="h-5 w-5 rounded-full gradient-primary animate-pulse-subtle shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className={`text-sm ${stage.completed ? "text-foreground font-medium" : stage.current ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                    {stage.name}
                  </span>
                  {stage.current && (
                    <Badge variant="secondary" className="ml-auto text-xs bg-primary/10 text-primary">Current</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-muted/40 text-center">
              <p className="text-sm text-muted-foreground">
                Questions? Contact <a href="mailto:hiring@hireflow.com" className="text-primary hover:underline">hiring@hireflow.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
