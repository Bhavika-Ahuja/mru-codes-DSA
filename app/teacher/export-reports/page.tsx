"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  BarChart3,
  FileText,
  Target,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";
import type { Department } from "@/lib/departments";
import { DEPARTMENT_OPTIONS, SECTION_OPTIONS, departmentRequiresSection } from "@/lib/departments";

export default function ExportReportsPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();

      if (selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }
      if (
        selectedSection !== "all" &&
        departmentRequiresSection(selectedDepartment as Department)
      ) {
        params.append("section", selectedSection);
      }
      params.append("type", reportType);
      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.append("dateTo", dateTo);
      }

      const loadingToast = toast.loading("Generating comprehensive Excel report...");

      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const timestamp = new Date().toISOString().split("T")[0];
      const deptPart = selectedDepartment !== "all" ? `-${selectedDepartment}` : "";
      const sectionPart =
        selectedSection !== "all" &&
        departmentRequiresSection(selectedDepartment as Department)
          ? `-Section${selectedSection}`
          : "";
      const typePart = reportType !== "all" ? `-${reportType}` : "";
      const filename = `Performance-Report${deptPart}${sectionPart}${typePart}-${timestamp}.xlsx`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Excel report downloaded successfully!", { id: loadingToast });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.dismiss(loadingToast);
      toast.error(
        error instanceof Error ? error.message : "Failed to export data. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          Export Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive Excel reports with detailed analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>
              Customize your export report settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Comprehensive Report (All Data)
                    </div>
                  </SelectItem>
                  <SelectItem value="detailed">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Detailed Report (Advanced Analytics)
                    </div>
                  </SelectItem>
                  <SelectItem value="quizzes">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Quiz Performance Only
                    </div>
                  </SelectItem>
                  <SelectItem value="assignments">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Assignment Submissions Only
                    </div>
                  </SelectItem>
                  <SelectItem value="performance">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Performance Summary Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={(value) => {
                  setSelectedDepartment(value);
                  if (!departmentRequiresSection(value as Department)) {
                    setSelectedSection("all");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Filter (CSE/AIML only) */}
            {departmentRequiresSection(selectedDepartment as Department) && (
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {SECTION_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        Section {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-4">
              <Label>Date Range (Optional)</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom" className="text-sm">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo" className="text-sm">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              size="lg"
              className="w-full gap-2"
            >
              {isExporting ? (
                <>
                  <Download className="h-4 w-4 animate-pulse" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Generate & Download Excel Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Report Information */}
        <Card>
          <CardHeader>
            <CardTitle>Report Contents</CardTitle>
            <CardDescription>
              What&apos;s included in your export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Report Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Executive summary with report metadata and filters applied
                  </p>
                </div>
              </div>

              {(reportType === "all" || reportType === "performance" || reportType === "detailed") && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Student Overview</p>
                    <p className="text-sm text-muted-foreground">
                      Complete student list with rankings, scores, and performance grades
                    </p>
                  </div>
                </div>
              )}

              {(reportType === "all" || reportType === "quizzes" || reportType === "detailed") && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Target className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Quiz Participation</p>
                    <p className="text-sm text-muted-foreground">
                      Detailed quiz results with scores, accuracy, time taken, and room codes
                    </p>
                  </div>
                </div>
              )}

              {(reportType === "all" || reportType === "assignments" || reportType === "detailed") && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Assignment Submissions</p>
                    <p className="text-sm text-muted-foreground">
                      All assignment submissions with grades, feedback, and status
                    </p>
                  </div>
                </div>
              )}

              {(reportType === "all" || reportType === "performance" || reportType === "detailed") && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Performance Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Student performance metrics with best/weak topics identified
                    </p>
                  </div>
                </div>
              )}

              {(reportType === "all" || reportType === "detailed") && (
                <>
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Target className="h-5 w-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Topic Performance</p>
                      <p className="text-sm text-muted-foreground">
                        Topic-wise analysis with average accuracy and best performers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-pink-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Question Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Question-level statistics with accuracy and average time
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-cyan-500 mt-0.5" />
                    <div>
                      <p className="font-semibold">Time Analytics</p>
                      <p className="text-sm text-muted-foreground">
                        Daily performance trends and activity patterns
                      </p>
                    </div>
                  </div>
                </>
              )}

              {(reportType === "all" || reportType === "performance" || reportType === "detailed") && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">Section Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Class-wise performance comparison with improvement rates
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Options</CardTitle>
          <CardDescription>
            Export specific reports with one click
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              className="gap-2 h-auto py-4 flex-col"
              onClick={() => {
                setReportType("all");
                handleExport();
              }}
              disabled={isExporting}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="font-semibold">All Reports</span>
              <span className="text-xs text-muted-foreground">Complete data</span>
            </Button>

            <Button
              variant="outline"
              className="gap-2 h-auto py-4 flex-col"
              onClick={() => {
                setReportType("detailed");
                handleExport();
              }}
              disabled={isExporting}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">Detailed</span>
              <span className="text-xs text-muted-foreground">Advanced analytics</span>
            </Button>

            <Button
              variant="outline"
              className="gap-2 h-auto py-4 flex-col"
              onClick={() => {
                setReportType("quizzes");
                handleExport();
              }}
              disabled={isExporting}
            >
              <Target className="h-5 w-5" />
              <span className="font-semibold">Quizzes Only</span>
              <span className="text-xs text-muted-foreground">Quiz performance</span>
            </Button>

            <Button
              variant="outline"
              className="gap-2 h-auto py-4 flex-col"
              onClick={() => {
                setReportType("performance");
                handleExport();
              }}
              disabled={isExporting}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-semibold">Performance</span>
              <span className="text-xs text-muted-foreground">Summary only</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
