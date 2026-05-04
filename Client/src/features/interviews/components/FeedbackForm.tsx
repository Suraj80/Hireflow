import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedbackFormSchema } from "@/features/interviews/schema";
import { InterviewFeedbackValues } from "@/features/interviews/types";

type FeedbackFormProps = {
  onSubmit: (values: InterviewFeedbackValues) => Promise<void>;
};

export function FeedbackForm({ onSubmit }: FeedbackFormProps) {
  const form = useForm<InterviewFeedbackValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      rating: 4,
      strengths: "",
      concerns: "",
      recommendation: "Hire",
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(async (values) => onSubmit(values))}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={5} value={field.value} onChange={(event) => field.onChange(Number(event.target.value))} className="h-11 rounded-2xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recommendation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recommendation</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["Strong Hire", "Hire", "Leaning Hire", "No Hire", "Strong No Hire"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="strengths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strengths</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} className="rounded-2xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="concerns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concerns</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} className="rounded-2xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="rounded-2xl">
          Submit feedback
        </Button>
      </form>
    </Form>
  );
}
