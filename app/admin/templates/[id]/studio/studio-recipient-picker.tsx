"use client";

import { ChevronsUpDown, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type StudioSubscriberOption = {
  personId: number;
  displayName: string;
  email: string;
};

type StudioRecipientPickerProps = {
  selected: StudioSubscriberOption[];
  onAdd: (option: StudioSubscriberOption) => void;
  onRemove: (personId: number) => void;
  onError?: (message: string) => void;
};

export function StudioRecipientPicker({
  selected,
  onAdd,
  onRemove,
  onError,
}: StudioRecipientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<StudioSubscriberOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      void loadRecipients(query);
    }, 180);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search
  }, [query, open, selected]);

  async function loadRecipients(search: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: "subscribed",
        topic: "weekly",
      });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/admin/newsletters/subscribers?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as {
        subscribers?: Array<{ personId: number; displayName: string; email: string }>;
        error?: string;
      };
      if (!response.ok) {
        onError?.(payload.error || "Unable to load recipients.");
        setOptions([]);
        return;
      }
      const selectedIds = new Set(selected.map((item) => item.personId));
      setOptions(
        (payload.subscribers ?? [])
          .filter((row) => row.email && !selectedIds.has(row.personId))
          .slice(0, 40)
          .map((row) => ({
            personId: row.personId,
            displayName: row.displayName || row.email,
            email: row.email,
          })),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Search subscribers by name or email"
            className="h-11 w-full justify-between rounded-xl font-medium"
          >
            <span className="truncate text-[var(--color-muted)]">
              {loading ? "Searching…" : "Search subscribers by name or email"}
            </span>
            <ChevronsUpDown className="opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(34rem,calc(100vw-2rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search confirmed weekly subscribers"
            />
            <CommandList>
              <CommandEmpty>{loading ? "Searching…" : "No matching subscribed recipients"}</CommandEmpty>
              <CommandGroup heading="Confirmed weekly">
                {options.map((option) => (
                  <CommandItem
                    key={option.personId}
                    value={`${option.displayName} ${option.email}`}
                    onSelect={() => {
                      onAdd(option);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{option.displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{option.email}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((recipient) => (
            <Badge
              key={recipient.personId}
              className="normal-case tracking-normal before:hidden gap-1.5 px-2.5 py-1 text-xs font-semibold"
            >
              {recipient.displayName}
              <button
                type="button"
                className="inline-flex rounded-full p-0.5 hover:bg-black/5"
                aria-label={`Remove ${recipient.displayName}`}
                onClick={() => onRemove(recipient.personId)}
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-[var(--color-muted)]">
          Choose one or more confirmed weekly subscribers, preview the audience, then send via SendGrid.
        </p>
      )}
    </div>
  );
}
