import { KeyboardEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

type TagSelectorProps = {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  limit?: number;
  disabled?: boolean;
  inputClassName?: string;
};

export function TagSelector({
  values,
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  limit = 10,
  disabled = false,
  inputClassName,
}: TagSelectorProps) {
  const [inputValue, setInputValue] = useState("");

  const addValue = (rawValue: string) => {
    const nextValue = rawValue.trim().toLowerCase();

    if (!nextValue || values.includes(nextValue) || values.length >= limit) {
      setInputValue("");
      return;
    }

    onChange([...values, nextValue]);
    setInputValue("");
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addValue(inputValue);
    }

    if (event.key === "Backspace" && !inputValue && values.length) {
      removeValue(values[values.length - 1]);
    }
  };

  const remainingSuggestions = suggestions.filter((suggestion) => !values.includes(suggestion.toLowerCase()));

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1 rounded-full px-3 py-1">
            <span>{value}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="rounded-full text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length >= limit ? `Limit reached (${limit})` : placeholder}
          disabled={disabled || values.length >= limit}
          className={cn(
            "h-9 min-w-[180px] flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
            inputClassName,
          )}
        />
        {!disabled && inputValue.trim() && values.length < limit && (
          <Button type="button" size="sm" variant="outline" onClick={() => addValue(inputValue)} className="rounded-full">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {remainingSuggestions.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={disabled}
              onClick={() => addValue(suggestion)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
