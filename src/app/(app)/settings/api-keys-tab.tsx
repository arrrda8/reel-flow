"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash,
  Flask,
  Key,
  SpinnerGap,
  Robot,
  Brain,
  Waveform,
  FilmSlate,
  Sparkle,
  CheckCircle,
  XCircle,
  Clock,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { addApiKey, deleteApiKey, testApiKey } from "@/lib/settings-actions";
import type { ApiKeyEntry } from "@/lib/settings-actions";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

type ProviderMeta = {
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: React.ReactNode;
};

const PROVIDERS: Record<string, ProviderMeta> = {
  anthropic: {
    label: "Anthropic (Claude)",
    description: "AI text generation",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    borderClass: "border-orange-500/20",
    icon: <Brain weight="duotone" className="size-5 text-orange-400" />,
  },
  openai: {
    label: "OpenAI",
    description: "Alternative AI provider",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: <Robot weight="duotone" className="size-5 text-emerald-400" />,
  },
  gemini: {
    label: "Google Gemini",
    description: "Image generation",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
    icon: <Sparkle weight="duotone" className="size-5 text-blue-400" />,
  },
  elevenlabs: {
    label: "ElevenLabs",
    description: "Voice generation",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    borderClass: "border-cyan-500/20",
    icon: <Waveform weight="duotone" className="size-5 text-cyan-400" />,
  },
  kling: {
    label: "Kling AI",
    description: "Video generation",
    colorClass: "text-pink-400",
    bgClass: "bg-pink-500/10",
    borderClass: "border-pink-500/20",
    icon: <FilmSlate weight="duotone" className="size-5 text-pink-400" />,
  },
};

const PROVIDER_ORDER = ["anthropic", "openai", "gemini", "elevenlabs", "kling"] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ApiKeysTabProps {
  apiKeys: ApiKeyEntry[];
}

export function ApiKeysTab({ apiKeys }: ApiKeysTabProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<string>("");
  const [newKey, setNewKey] = useState("");
  const [isAdding, startAddTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Build a map for quick lookup
  const keysByProvider = new Map<string, ApiKeyEntry>();
  for (const key of apiKeys) {
    keysByProvider.set(key.provider, key);
  }

  // Get available providers that don't have keys yet
  const availableProviders = PROVIDER_ORDER.filter(
    (p) => !keysByProvider.has(p)
  );

  function handleAdd() {
    if (!newProvider || !newKey.trim()) {
      toast.error("Please select a provider and enter an API key");
      return;
    }

    startAddTransition(async () => {
      const result = await addApiKey(newProvider, newKey.trim());
      if (result.success) {
        toast.success("API key added successfully");
        setAddDialogOpen(false);
        setNewProvider("");
        setNewKey("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    if (!selectedKeyId) return;

    startDeleteTransition(async () => {
      const result = await deleteApiKey(selectedKeyId);
      if (result.success) {
        toast.success("API key deleted");
        setDeleteDialogOpen(false);
        setSelectedKeyId(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete key");
      }
    });
  }

  async function handleTest(keyId: string) {
    setTestingKeyId(keyId);
    try {
      const result = await testApiKey(keyId);
      if (result.success) {
        toast.success(
          result.isValid
            ? "API key is valid"
            : "API key marked as invalid"
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Test failed");
      }
    } finally {
      setTestingKeyId(null);
    }
  }

  function openDeleteConfirm(keyId: string) {
    setSelectedKeyId(keyId);
    setDeleteDialogOpen(true);
  }

  function formatDate(date: Date | null): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for AI providers
          </p>
        </div>

        {/* Add Key Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={availableProviders.length === 0}
            >
              <Plus weight="bold" className="size-4" />
              Add Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add API Key</DialogTitle>
              <DialogDescription>
                Add a new API key for an AI provider. The key will be encrypted before storage.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={newProvider} onValueChange={setNewProvider}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((p) => {
                      const meta = PROVIDERS[p];
                      return (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2">
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key-input">API Key</Label>
                <Input
                  id="api-key-input"
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Your key is encrypted with AES-256-GCM before storage
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isAdding}>
                {isAdding ? (
                  <SpinnerGap weight="bold" className="size-4 animate-spin" />
                ) : (
                  <Key weight="duotone" className="size-4" />
                )}
                {isAdding ? "Adding..." : "Add Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {PROVIDER_ORDER.map((provider) => {
          const meta = PROVIDERS[provider];
          const key = keysByProvider.get(provider);

          return (
            <div
              key={provider}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                key
                  ? `border-border bg-card ${meta.borderClass}`
                  : "border-border/50 bg-card/50"
              }`}
            >
              {/* Provider icon */}
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bgClass}`}
              >
                {meta.icon}
              </div>

              {/* Provider info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {meta.label}
                  </span>
                  {key && (
                    <Badge
                      variant="outline"
                      className={
                        key.isValid
                          ? "border-success/30 bg-success/10 text-success"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }
                    >
                      {key.isValid ? (
                        <CheckCircle weight="fill" className="mr-1 size-3" />
                      ) : (
                        <XCircle weight="fill" className="mr-1 size-3" />
                      )}
                      {key.isValid ? "Valid" : "Invalid"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {meta.description}
                </p>
                {key && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{key.maskedKey}</span>
                    <span className="flex items-center gap-1">
                      <Clock weight="duotone" className="size-3" />
                      Tested: {formatDate(key.lastTestedAt)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {key ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(key.id)}
                    disabled={testingKeyId === key.id}
                  >
                    {testingKeyId === key.id ? (
                      <SpinnerGap
                        weight="bold"
                        className="size-3.5 animate-spin"
                      />
                    ) : (
                      <Flask weight="duotone" className="size-3.5" />
                    )}
                    <span className="hidden sm:inline">Test</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteConfirm(key.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash weight="duotone" className="size-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Not configured
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot
              be undone. You will need to add a new key to use this provider.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <SpinnerGap weight="bold" className="size-4 animate-spin" />
              ) : (
                <Trash weight="duotone" className="size-4" />
              )}
              {isDeleting ? "Deleting..." : "Delete Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
