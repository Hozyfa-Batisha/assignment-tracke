import React from "react";
import { format } from "date-fns";
import { formatCountdown } from "@/lib/date-utils";
import { Assignment } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { useDeleteAssignment, useUpdateAssignment, getListAssignmentsQueryKey, getGetAssignmentsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useDeleteAssignment();
  const updateMutation = useUpdateAssignment();

  const isDone = assignment.status === "done";
  
  // Refreshes every minute to keep countdown accurate
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [isDone]);

  const countdown = isDone 
    ? { text: "Completed", color: "muted" as const }
    : formatCountdown(assignment.dueDate);

  const priorityColor = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  }[assignment.priority];

  const countdownColor = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 font-bold dark:text-red-400",
    muted: "text-muted-foreground",
  }[countdown.color];

  const handleToggleStatus = () => {
    const newStatus = isDone ? "pending" : "done";
    updateMutation.mutate(
      { id: assignment.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAssignmentsSummaryQueryKey() });
          toast({
            title: newStatus === "done" ? "Assignment marked as done!" : "Assignment marked as pending",
            description: assignment.title,
          });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: assignment.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAssignmentsSummaryQueryKey() });
          toast({
            title: "Assignment deleted",
          });
        },
      }
    );
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-200 ${isDone ? "opacity-60 grayscale-[0.5]" : "hover:shadow-md"}`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${
        isDone ? "bg-muted" : countdown.color === "red" ? "bg-red-500" : countdown.color === "yellow" ? "bg-yellow-400" : "bg-green-500"
      }`} />
      
      <CardHeader className="pb-3 pt-5 pl-5 pr-4 flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">{assignment.course}</Badge>
            <Badge variant="outline" className={`font-mono text-xs uppercase ${priorityColor}`}>
              {assignment.priority}
            </Badge>
          </div>
          <h3 className={`font-bold text-lg leading-tight ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {assignment.title}
          </h3>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the assignment from your tracker.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      
      <CardContent className="pl-5 pr-4 pb-4">
        {assignment.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {assignment.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className={`w-4 h-4 ${countdownColor}`} />
          <span className={countdownColor}>{countdown.text}</span>
          <span className="text-muted-foreground font-normal ml-1">
            ({format(new Date(assignment.dueDate), "MMM d, h:mm a")})
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="pl-5 pr-4 pb-5 pt-0">
        <Button 
          variant={isDone ? "outline" : "default"} 
          className={`w-full font-bold ${isDone ? "" : "bg-primary hover:bg-primary/90"}`}
          onClick={handleToggleStatus}
          disabled={updateMutation.isPending}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Pending
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 mr-2" />
              Mark as Done
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
