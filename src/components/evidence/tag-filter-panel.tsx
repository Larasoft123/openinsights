/**
 * Tag Filter Panel Component
 *
 * Scrollable tag list for filtering highlights.
 * Follows Modern Smart Home Dashboard Energy Panel pattern.
 */

'use client';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagFilterPanelProps {
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
}

export function TagFilterPanel({ tags, selectedTags, onToggleTag }: TagFilterPanelProps) {
  if (tags.length === 0) {
    return <p className="text-xs text-gray-400">No tags created yet</p>;
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className="flex w-full items-center justify-between rounded-lg bg-gray-800 px-3 py-2 text-sm transition-all hover:bg-gray-700"
            style={{
              borderLeft: isSelected ? `3px solid ${tag.color}` : '3px solid transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className={isSelected ? 'font-medium text-white' : 'text-gray-400'}>
                {tag.name}
              </span>
            </div>
            {isSelected && (
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
