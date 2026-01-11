/**
 * Activity Timeline Component
 *
 * Displays recent activity in the workspace.
 * Follows Modern Smart Home Dashboard list pattern.
 */

'use client';

import { FileVideo, Tag, FolderPlus, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'source_created' | 'highlight_created' | 'project_created' | 'theme_created';
  description: string;
  createdAt: Date;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const activityConfig: Record<ActivityItem['type'], { icon: LucideIcon; color: string }> = {
  source_created: { icon: FileVideo, color: 'text-purple-500' },
  highlight_created: { icon: Tag, color: 'text-green-500' },
  project_created: { icon: FolderPlus, color: 'text-blue-500' },
  theme_created: { icon: Sparkles, color: 'text-orange-500' },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="border-border bg-background rounded-2xl border p-6">
      <h3 className="text-foreground mb-6 text-lg font-semibold">Recent Activity</h3>

      {activities.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">No recent activity</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <Icon size={18} strokeWidth={1.5} className={`flex-shrink-0 ${config.color}`} />

                <div className="flex-1 overflow-hidden">
                  <p className="text-foreground text-sm">{activity.description}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
