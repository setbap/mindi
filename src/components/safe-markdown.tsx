import {
  useState,
  type ComponentPropsWithoutRef,
  type ImgHTMLAttributes,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { safeMarkdownUrl } from "@/domain/safe-markdown";

interface SafeMarkdownProps {
  markdown: string;
  className?: string;
}

function MarkdownLink({
  href,
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const safeHref = href ? safeMarkdownUrl(href) : "";
  if (!safeHref) {
    return <span {...props}>{children}</span>;
  }

  return (
    <a
      {...props}
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

function MarkdownImage({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  const [failed, setFailed] = useState(offline);
  const safeSrc = src ? safeMarkdownUrl(String(src)) : "";

  if (!safeSrc) {
    return alt ? <span>{alt}</span> : null;
  }

  if (failed) {
    return (
      <a
        href={safeSrc}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {alt && alt.length > 0 ? alt : safeSrc}
      </a>
    );
  }

  return (
    <img
      {...props}
      src={safeSrc}
      alt={alt ?? ""}
      onError={() => setFailed(true)}
    />
  );
}

function MarkdownInput(props: ComponentPropsWithoutRef<"input">) {
  if (props.type !== "checkbox") {
    return null;
  }
  return <input {...props} disabled readOnly />;
}

/** Focused-mode Node body: CommonMark + GFM, no raw HTML execution. */
export function SafeMarkdown({ markdown, className }: SafeMarkdownProps) {
  return (
    <div className={className} data-testid="safe-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeMarkdownUrl}
        components={{
          a: MarkdownLink,
          img: MarkdownImage,
          input: MarkdownInput,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
