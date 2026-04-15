import React, { useEffect, useState } from "react";
import { useListAssignments, useGetAssignmentsSummary } from "@workspace/api-client-react";
import { SummaryBar } from "@/components/summary-bar";
import { AssignmentCard } from "@/components/assignment-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";
import { isPast } from "date-fns";

export default function Dashboard() {
  const { data: assignments, isLoading: loadingAssignments } = useListAssignments();
  const { data: summary, isLoading: loadingSummary } = useGetAssignmentsSummary();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (summary && summary.dueSoon > 0 && "Notification" in window && Notification.permission === "granted") {
      // Show notification if there are assignments due soon
      new Notification("DeadlineZone Alert", {
        body: `You have ${summary.dueSoon} assignment(s) due within 24 hours! Get to work!`,
        icon: "/favicon.svg" // fallback
      });
    }
  }, [summary]);

  const filteredAssignments = React.useMemo(() => {
    if (!assignments) return [];
    
    // Sort by due date ascending
    const sorted = [...assignments].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    switch (filter) {
      case "pending":
        return sorted.filter(a => a.status === "pending");
      case "done":
        return sorted.filter(a => a.status === "done");
      case "overdue":
        return sorted.filter(a => a.status === "pending" && isPast(new Date(a.dueDate)));
      default:
        return sorted;
    }
  }, [assignments, filter]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Welcome to the Zone</h1>
        <p className="text-muted-foreground text-lg">Keep your deadlines in check. Don't let them crash you.</p>
      </div>

      {loadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : summary ? (
        <SummaryBar summary={summary} />
      ) : null}

      <div className="space-y-6">
        <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Your Assignments</h2>
            <TabsList className="grid w-full sm:w-auto grid-cols-4 bg-muted">
              <TabsTrigger value="all" className="font-bold">All</TabsTrigger>
              <TabsTrigger value="pending" className="font-bold">Pending</TabsTrigger>
              <TabsTrigger value="done" className="font-bold">Done</TabsTrigger>
              <TabsTrigger value="overdue" className="font-bold text-destructive data-[state=active]:text-destructive">Overdue</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="mt-6">
            {loadingAssignments ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : filteredAssignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssignments.map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-4 border-2 border-dashed border-border rounded-xl bg-card">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderKanban className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">No assignments found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {filter === "all" 
                    ? "Looks like you have a clean slate. Time to relax or add some new tasks!" 
                    : `No ${filter} assignments match this filter. You're doing great!`}
                </p>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
