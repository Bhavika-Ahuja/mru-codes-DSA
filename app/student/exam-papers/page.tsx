import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { FileText, ExternalLink, Download, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentExamPapersPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  const examPapers = await prisma.examPaper.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: {
        select: { fullName: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Previous Exam Papers
        </h1>
        <p className="text-muted-foreground mt-1">
          View and download past exam papers shared by your teachers
        </p>
      </div>

      {examPapers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No exam papers available yet. Check back later.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examPapers.map((paper) => (
            <Card key={paper.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg">{paper.title}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                      <span>{paper.subject}</span>
                      {paper.year != null && (
                        <Badge variant="secondary" className="text-xs">
                          {paper.year}
                        </Badge>
                      )}
                      {paper.semester && (
                        <span className="text-muted-foreground">
                          {paper.semester}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    PDF
                  </Badge>
                </div>
                {paper.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {paper.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(paper.createdAt).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button variant="default" size="sm" asChild>
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={paper.fileName}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
