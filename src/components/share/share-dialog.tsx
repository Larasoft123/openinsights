'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Link, Trash2, Calendar, Loader2, FileText, Lightbulb } from 'lucide-react';

interface ShareLink {
  id: string;
  token: string;
  includeEvidence: boolean;
  includeInsights: boolean;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'project' | 'source';
  resourceId: string;
  resourceName: string;
}

const EXPIRY_OPTIONS = [
  { label: 'No expiry', value: null },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export function ShareDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
}: ShareDialogProps) {
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchShareLinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint =
        resourceType === 'project'
          ? `/api/projects/${resourceId}/share`
          : `/api/sources/${resourceId}/share`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch share links');

      const data = await response.json();
      setShareLinks(data.shareLinks.filter((link: ShareLink) => link.isActive));
    } catch (err) {
      setError('Failed to load existing share links');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [resourceType, resourceId]);

  // Fetch existing share links when dialog opens
  useEffect(() => {
    if (open) {
      fetchShareLinks();
    }
  }, [open, fetchShareLinks]);

  const createShareLink = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const endpoint =
        resourceType === 'project'
          ? `/api/projects/${resourceId}/share`
          : `/api/sources/${resourceId}/share`;

      const expiresAt = expiryDays
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const body =
        resourceType === 'project'
          ? { includeEvidence, includeInsights, expiresAt }
          : { expiresAt };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to create share link');

      const newLink = await response.json();
      setShareLinks((prev) => [newLink, ...prev]);
      copyToClipboard(newLink.token);
    } catch (err) {
      setError('Failed to create share link');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const revokeShareLink = async (linkId: string) => {
    try {
      const response = await fetch(`/api/share/${linkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to revoke share link');

      setShareLinks((prev) => prev.filter((link) => link.id !== linkId));
    } catch (err) {
      setError('Failed to revoke share link');
      console.error(err);
    }
  };

  const copyToClipboard = (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            Share {resourceType === 'project' ? 'Project' : 'Source'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a read-only shareable link for &quot;{resourceName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Options for project sharing */}
          {resourceType === 'project' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Include in share</label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeEvidence}
                    onChange={(e) => setIncludeEvidence(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-green-400" />
                    <span className="text-sm text-gray-300">Evidence Hub</span>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeInsights}
                    onChange={(e) => setIncludeInsights(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-yellow-400" />
                    <span className="text-sm text-gray-300">Insights Board</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Expiry selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Link expiration</label>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setExpiryDays(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    expiryDays === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <Button
            onClick={createShareLink}
            disabled={
              isCreating || (resourceType === 'project' && !includeEvidence && !includeInsights)
            }
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link size={16} />
                Create Share Link
              </>
            )}
          </Button>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          {/* Existing share links */}
          {shareLinks.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Active links</label>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-800 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {resourceType === 'project' && (
                          <>
                            {link.includeEvidence && (
                              <span className="flex items-center gap-1">
                                <FileText size={12} className="text-green-400" />
                                Evidence
                              </span>
                            )}
                            {link.includeInsights && (
                              <span className="flex items-center gap-1">
                                <Lightbulb size={12} className="text-yellow-400" />
                                Insights
                              </span>
                            )}
                            <span>|</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : 'No expiry'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyToClipboard(link.token)}
                      >
                        {copiedToken === link.token ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => revokeShareLink(link.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
