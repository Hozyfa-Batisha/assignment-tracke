import React from "react";
import { AssignmentsSummary } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent } from "./ui/card";
import { CheckCircle2, AlertCircle, Clock, ListTodo } from "lucide-react";

interface SummaryBarProps {
  summary: AssignmentsSummary;
}

export function SummaryBar({ summary }: SummaryBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="bg-primary text-primary-foreground border-none shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-wider">
            <ListTodo className="w-4 h-4" />
            Total
          </div>
          <div className="text-3xl md:text-4xl font-black">{summary.total}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-secondary text-secondary-foreground border-none shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <div className="text-3xl md:text-4xl font-black">{summary.pending}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-accent text-accent-foreground border-none shadow-sm">
        <CardContent className="p-4 md:p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            Due Soon
          </div>
          <div className="text-3xl md:text-4xl font-black">{summary.dueSoon}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-green-500 text-white border-none shadow-sm dark:bg-green-600">
        <CardContent className="p-4 md:p-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            Done
          </div>
          <div className="text-3xl md:text-4xl font-black">{summary.done}</div>
        </CardContent>
      </Card>
    </div>
  );
}
