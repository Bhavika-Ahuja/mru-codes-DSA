"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopicSelectorProps {
  value: string[];
  onChange: (topics: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TopicSelector({
  value = [],
  onChange,
  suggestions = [],
  placeholder = "Type or select topics...",
  className,
}: TopicSelectorProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) {
      return suggestions.filter((s) => !value.includes(s));
    }
    return suggestions.filter(
      (s) =>
        !value.includes(s) &&
        s.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue, suggestions, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTopic(inputValue.trim());
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last topic if backspace on empty input
      removeTopic(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const addTopic = (topic: string) => {
    if (topic && !value.includes(topic)) {
      onChange([...value, topic]);
      setInputValue("");
      setIsOpen(false);
    }
  };

  const removeTopic = (topic: string) => {
    onChange(value.filter((t) => t !== topic));
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTopic(suggestion);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selected topics as badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((topic) => (
            <Badge
              key={topic}
              variant="secondary"
              className="px-2 py-1 text-sm flex items-center gap-1.5"
            >
              {topic}
              <button
                type="button"
                onClick={() => removeTopic(topic)}
                className="ml-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Remove ${topic}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length === 0 ? placeholder : "Add another topic..."}
          className="h-11"
        />

        {/* Suggestions dropdown */}
        {isOpen && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
            <div className="p-1">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Show message if input doesn't match suggestions */}
        {isOpen &&
          inputValue.trim() &&
          !filteredSuggestions.some(
            (s) => s.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
              <button
                type="button"
                onClick={() => addTopic(inputValue.trim())}
                className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add &quot;{inputValue.trim()}&quot;
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
