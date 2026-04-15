import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { useCreateAssignment, getListAssignmentsQueryKey, getGetAssignmentsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { CreateAssignmentBodyPriority } from "@workspace/api-client-react/src/generated/api.schemas";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  course: z.string().min(1, "Course code is required").max(20, "Course code is too long"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["low", "medium", "high"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewAssignment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAssignment();

  // Default to tomorrow at 11:59 PM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(23, 59, 0, 0);
  const defaultDateStr = defaultDate.toISOString().slice(0, 16); // format: YYYY-MM-DDTHH:mm

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      course: "",
      description: "",
      dueDate: defaultDateStr,
      priority: "medium",
    },
  });

  const onSubmit = (data: FormValues) => {
    // Ensure date is in full ISO format with timezone
    const isoDate = new Date(data.dueDate).toISOString();
    
    createMutation.mutate(
      {
        data: {
          ...data,
          dueDate: isoDate,
          priority: data.priority as CreateAssignmentBodyPriority,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAssignmentsSummaryQueryKey() });
          toast({
            title: "Assignment created!",
            description: "Time to get to work.",
          });
          setLocation("/");
        },
        onError: (err) => {
          toast({
            title: "Failed to create assignment",
            description: "Something went wrong. Try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button 
        variant="ghost" 
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card className="border-border shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-border pb-6">
          <CardTitle className="text-2xl font-black">Add New Assignment</CardTitle>
          <CardDescription className="text-base">
            Put it in the system so you don't forget it later.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="font-bold">Assignment Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Implement Dijkstra's Algorithm" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Course Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. CS 201" className="bg-background uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select a priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low" className="font-bold text-green-600 dark:text-green-400">Low (Chill)</SelectItem>
                          <SelectItem value="medium" className="font-bold text-yellow-600 dark:text-yellow-400">Medium (Normal)</SelectItem>
                          <SelectItem value="high" className="font-bold text-red-600 dark:text-red-400">High (Panic!)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="font-bold">Due Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          className="bg-background font-mono" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>When is this nightmare actually due?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="font-bold">Description / Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any extra details, links, or tears go here..." 
                          className="resize-y min-h-[120px] bg-background" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="font-bold w-full sm:w-auto"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Add to Tracker
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
