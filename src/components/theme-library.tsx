'use client';

import { ThemeLibraryEntry, formatDate } from '@/lib/theme-library';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface ThemeLibraryProps {
  entries: ThemeLibraryEntry[];
  onDelete: (id: string) => void;
  onPreview: (entry: ThemeLibraryEntry) => void;
}

export default function ThemeLibrary({ entries, onDelete, onPreview }: ThemeLibraryProps) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <Separator className="mb-8" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Theme Library</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All generated themes — click Preview to open in a new tab
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">{entries.length} saved · max 30</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map((entry) => (
          <Card key={entry.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{entry.name}</CardTitle>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">
                  {formatDate(entry.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{entry.slug}</p>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3">
              {/* Attribute badges */}
              <div className="flex flex-wrap gap-1">
                {entry.siteType && <Badge variant="outline" className="text-[10px] h-5">{entry.siteType}</Badge>}
                {entry.style    && <Badge variant="outline" className="text-[10px] h-5">{entry.style}</Badge>}
                {entry.colorMood && <Badge variant="outline" className="text-[10px] h-5">{entry.colorMood}</Badge>}
                {entry.industry && <Badge variant="outline" className="text-[10px] h-5">{entry.industry}</Badge>}
              </div>

              {/* User description */}
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
                {entry.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono border-t pt-2">
                <span>{entry.fileCount} files</span>
                <span>·</span>
                <span>{entry.toolCallCount} AI calls</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onPreview(entry)}
                >
                  Preview in New Tab
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
