import { cn } from "@/lib/utils";

const URL_REGEX = /((?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s|<>]*)?|(?:bit\.ly|amzn\.to|t\.co)\/[^\s|<>]+)/gi;

function normalizeUrl(url: string): string {
  const trimmed = url.replace(/[.,;:!?)]+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface NoteTextProps {
  text?: string | null;
  className?: string;
  emptyText?: string;
}

export function NoteText({ text, className, emptyText = "Nessuna nota presente" }: NoteTextProps) {
  if (!text?.trim()) {
    return <span className={className}>{emptyText}</span>;
  }

  const parts: Array<{ type: "text" | "link"; content: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const url = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, index) });
    }

    parts.push({ type: "link", content: url });
    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <a
            key={`link-${index}`}
            href={normalizeUrl(part.content)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066cc] hover:text-[#0052a3] underline underline-offset-2 break-all"
          >
            {part.content}
          </a>
        ) : (
          <span key={`text-${index}`}>{part.content}</span>
        )
      )}
    </span>
  );
}
