"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  AlertTriangle,
  Users,
  TrendingDown,
  Clock,
  FileText,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViolationReport {
  sessionId: string;
  studentId: string;
  studentName: string;
  violationCount: number;
  violationTypes: string[];
  lastViolation: string;
  quizTitle: string;
  sessionDate: string;
}

interface SessionViolations {
  sessionId: string;
  quizTitle: string;
  totalViolations: number;
  studentsAffected: number;
  startedAt: string;
}

export default function CheatingDetectionPage() {
  const [violations, setViolations] = useState<ViolationReport[]>([]);
  const [sessionViolations, setSessionViolations] = useState<SessionViolations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSession, setFilterSession] = useState<string>("all");

  useEffect(() => {
    fetchViolations();
  }, [filterSession]);

  const fetchViolations = async () => {
    try {
      const response = await fetch(
        `/api/cheating-detection${filterSession !== "all" ? `?sessionId=${filterSession}` : ""}`
      );
      const data = await response.json();
      if (response.ok) {
        setViolations(data.violations || []);
        setSessionViolations(data.sessions || []);
      }
    } catch (error) {
      console.error("Error fetching violations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (count: number) => {
    if (count >= 5) return "bg-red-500/10 text-red-600 border-red-500/20";
    if (count >= 3) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  };

  const totalViolations = violations.reduce((sum, v) => sum + v.violationCount, 0);
  const highRiskStudents = violations.filter((v) => v.violationCount >= 5).length;
  const affectedSessions = new Set(violations.map((v) => v.sessionId)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Cheating Detection Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor and review student behavior during quizzes
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalViolations}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Risk Students</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{highRiskStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">5+ violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Affected Sessions</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{affectedSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions with violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Violations</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {violations.length > 0
                ? (totalViolations / violations.length).toFixed(1)
                : "0"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per student</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessionViolations.map((session) => (
                  <SelectItem key={session.sessionId} value={session.sessionId}>
                    {session.quizTitle} - {new Date(session.startedAt).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">By Student</TabsTrigger>
          <TabsTrigger value="sessions">By Session</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Violations</CardTitle>
              <CardDescription>
                Detailed violation reports for each student
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Loading violations...</p>
                </div>
              ) : violations.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">No violations detected</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Great! All students are following the rules.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Quiz</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Types</TableHead>
                      <TableHead>Last Violation</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {violations.map((violation) => (
                      <TableRow key={`${violation.studentId}-${violation.sessionId}`}>
                        <TableCell className="font-medium">
                          {violation.studentName}
                        </TableCell>
                        <TableCell>{violation.quizTitle}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getSeverityColor(violation.violationCount)}
                          >
                            {violation.violationCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {violation.violationTypes.slice(0, 3).map((type, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {type.replace("_", " ")}
                              </Badge>
                            ))}
                            {violation.violationTypes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{violation.violationTypes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(violation.lastViolation).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session Violations</CardTitle>
              <CardDescription>
                Violation summary by quiz session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionViolations.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No session violations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionViolations.map((session) => (
                    <Card key={session.sessionId} className="border-border/50">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{session.quizTitle}</CardTitle>
                            <CardDescription className="mt-1">
                              {new Date(session.startedAt).toLocaleString()}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="outline"
                            className={getSeverityColor(session.totalViolations)}
                          >
                            {session.totalViolations} violations
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            {session.studentsAffected} students affected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFilterSession(session.sessionId)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
