"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Plus,
  Loader2,
  Pin,
  Lock,
  Send,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import {
  DEPARTMENT_OPTIONS,
  SECTION_OPTIONS,
  departmentRequiresSection,
  formatDepartmentSection,
  type Department,
} from "@/lib/departments";

type Role = "student" | "teacher";

interface Thread {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isClosed: boolean;
  targetDepartment: string | null;
  targetSection: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
  createdBy: {
    id: string;
    fullName: string;
    role: Role;
    avatarUrl: string | null;
    department: string | null;
    section: string | null;
  };
}

interface Message {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    role: Role;
    avatarUrl: string | null;
    department: string | null;
    section: string | null;
  };
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DiscussionBoard({
  role,
  initialDepartment,
  initialSection,
}: {
  role: Role;
  initialDepartment: string | null;
  initialSection: string | null;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [postingMessage, setPostingMessage] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [moderatingThreadId, setModeratingThreadId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageText, setMessageText] = useState("");

  const [createForm, setCreateForm] = useState({
    title: "",
    content: "",
    targetDepartment: initialDepartment ?? "",
    targetSection: initialSection ?? "",
  });

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const requiresSection = departmentRequiresSection(
    createForm.targetDepartment as Department
  );

  const fetchThreads = async () => {
    try {
      setLoadingThreads(true);
      const params = new URLSearchParams();
      if (role === "teacher" && createForm.targetDepartment) {
        params.set("department", createForm.targetDepartment);
      }
      if (role === "teacher" && createForm.targetSection) {
        params.set("section", createForm.targetSection);
      }
      const query = params.toString();
      const response = await fetch(`/api/discussions${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to fetch discussions");
      }
      const data = await response.json();
      const nextThreads = (data.threads || []) as Thread[];
      setThreads(nextThreads);

      if (nextThreads.length === 0) {
        setActiveThreadId(null);
        setMessages([]);
        return;
      }

      if (!activeThreadId || !nextThreads.some((thread) => thread.id === activeThreadId)) {
        setActiveThreadId(nextThreads[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch discussions");
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/discussions/${threadId}/messages`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
     
  }, [role]);

  useEffect(() => {
    if (activeThreadId) {
      fetchMessages(activeThreadId);
      setReplyTo(null);
      setMessageText("");
    }
  }, [activeThreadId]);

  const handleCreateThread = async () => {
    const title = createForm.title.trim();
    const content = createForm.content.trim();
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }
    if (role === "teacher" && !createForm.targetDepartment) {
      toast.error("Please select target department");
      return;
    }
    if (role === "teacher" && requiresSection && !createForm.targetSection) {
      toast.error("Please select target section");
      return;
    }

    try {
      setCreatingThread(true);
      const response = await fetch("/api/discussions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          ...(role === "teacher"
            ? {
                targetDepartment: createForm.targetDepartment,
                targetSection: requiresSection ? createForm.targetSection : null,
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create thread");
      }
      const data = await response.json();
      const thread = data.thread as Thread;
      toast.success("Discussion created");
      setShowCreateDialog(false);
      setCreateForm((prev) => ({
        ...prev,
        title: "",
        content: "",
      }));
      await fetchThreads();
      setActiveThreadId(thread.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create thread");
    } finally {
      setCreatingThread(false);
    }
  };

  const handlePostMessage = async () => {
    if (!activeThread) return;
    const content = messageText.trim();
    if (!content) return;
    if (activeThread.isClosed && role !== "teacher") {
      toast.error("This thread is closed");
      return;
    }

    try {
      setPostingMessage(true);
      const response = await fetch(`/api/discussions/${activeThread.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          parentId: replyTo?.id ?? null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post message");
      }
      setMessageText("");
      setReplyTo(null);
      await fetchMessages(activeThread.id);
      await fetchThreads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post message");
    } finally {
      setPostingMessage(false);
    }
  };

  const handleModeration = async (thread: Thread, updates: { isPinned?: boolean; isClosed?: boolean }) => {
    try {
      setModeratingThreadId(thread.id);
      const response = await fetch(`/api/discussions/${thread.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update thread");
      }
      await fetchThreads();
      if (activeThreadId === thread.id) {
        await fetchMessages(thread.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update thread");
    } finally {
      setModeratingThreadId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Discussion Board
          </h1>
          <p className="text-muted-foreground mt-1">
            Ask doubts, discuss approaches, and collaborate with classmates and teachers.
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discussion</DialogTitle>
              <DialogDescription>
                Start a thread for questions, ideas, or problem-solving discussions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discussion-title">Title</Label>
                <Input
                  id="discussion-title"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Best approach for assignment question 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discussion-content">Description</Label>
                <Textarea
                  id="discussion-content"
                  rows={4}
                  value={createForm.content}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Share your question and context..."
                />
              </div>

              {role === "teacher" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="discussion-department">Target Department</Label>
                    <Select
                      value={createForm.targetDepartment}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          targetDepartment: value,
                          targetSection: departmentRequiresSection(value as Department)
                            ? prev.targetSection
                            : "",
                        }))
                      }
                    >
                      <SelectTrigger id="discussion-department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresSection && (
                    <div className="space-y-2">
                      <Label htmlFor="discussion-section">Target Section</Label>
                      <Select
                        value={createForm.targetSection}
                        onValueChange={(value) =>
                          setCreateForm((prev) => ({ ...prev, targetSection: value }))
                        }
                      >
                        <SelectTrigger id="discussion-section">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_OPTIONS.map((section) => (
                            <SelectItem key={section} value={section}>
                              Section {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleCreateThread} disabled={creatingThread}>
                  {creatingThread ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Thread"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="lg:h-[72vh] lg:overflow-y-auto">
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <CardDescription>
              {role === "teacher"
                ? "All class discussions"
                : "Discussions visible to your class"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discussions yet.</p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    activeThreadId === thread.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight line-clamp-2">{thread.title}</p>
                    <div className="flex items-center gap-1">
                      {thread.isPinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {thread.isClosed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {thread.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{thread.createdBy.fullName}</span>
                    <span>•</span>
                    <span>{thread._count.messages} message{thread._count.messages !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>{formatDateTime(thread.updatedAt)}</span>
                  </div>
                  {role === "teacher" && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Class: {formatDepartmentSection(thread.targetDepartment, thread.targetSection)}
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:h-[72vh] lg:flex lg:flex-col">
          {!activeThread ? (
            <CardContent className="py-12">
              <p className="text-sm text-muted-foreground text-center">
                Select a discussion thread to view messages.
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{activeThread.title}</CardTitle>
                    <CardDescription className="mt-1 whitespace-pre-wrap">
                      {activeThread.content}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeThread.isPinned && (
                      <Badge variant="outline">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    {activeThread.isClosed && (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>By {activeThread.createdBy.fullName}</span>
                  <span>•</span>
                  <span>{formatDateTime(activeThread.createdAt)}</span>
                  <span>•</span>
                  <span>
                    Class:{" "}
                    {formatDepartmentSection(
                      activeThread.targetDepartment,
                      activeThread.targetSection
                    )}
                  </span>
                </div>

                {role === "teacher" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={moderatingThreadId === activeThread.id}
                      onClick={() =>
                        handleModeration(activeThread, { isPinned: !activeThread.isPinned })
                      }
                    >
                      {activeThread.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={moderatingThreadId === activeThread.id}
                      onClick={() =>
                        handleModeration(activeThread, { isClosed: !activeThread.isClosed })
                      }
                    >
                      {activeThread.isClosed ? "Reopen" : "Close Thread"}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4 lg:flex-1 lg:overflow-y-auto">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Start the discussion.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="rounded-lg border p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.author.avatarUrl ?? undefined} />
                          <AvatarFallback>
                            {message.author.fullName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {message.author.fullName}
                            </span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {message.author.role}
                            </Badge>
                            <span>{formatDateTime(message.createdAt)}</span>
                          </div>
                          {message.parentId && (
                            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              Reply
                            </p>
                          )}
                          <p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p>
                          {!activeThread.isClosed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 px-2 text-xs"
                              onClick={() => setReplyTo(message)}
                            >
                              <Reply className="h-3.5 w-3.5 mr-1" />
                              Reply
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>

              <div className="border-t p-4 space-y-3">
                {replyTo && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    Replying to <span className="font-medium">{replyTo.author.fullName}</span>
                    <button
                      className="ml-2 text-primary underline"
                      onClick={() => setReplyTo(null)}
                    >
                      cancel
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      activeThread.isClosed
                        ? "Thread is closed"
                        : "Write your message..."
                    }
                    disabled={
                      postingMessage || (activeThread.isClosed && role !== "teacher")
                    }
                  />
                  <Button
                    className="self-end"
                    disabled={
                      postingMessage ||
                      !messageText.trim() ||
                      (activeThread.isClosed && role !== "teacher")
                    }
                    onClick={handlePostMessage}
                  >
                    {postingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
