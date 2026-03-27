import type { ComponentPropsWithoutRef } from "react";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
}

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  node?: unknown;
};

const linkClassName =
  "font-medium text-[#ffb06b] underline decoration-white/15 underline-offset-4 transition-colors hover:text-[#ffd0a6] hover:decoration-[#ffb06b] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9c52]/60";

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="chat-markdown text-sm leading-7 text-inherit">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 text-base font-semibold tracking-tight text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-white/95">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 text-sm font-semibold text-white/90">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="break-words [&:not(:last-child)]:mb-4">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-disc marker:text-white/40 [&>li:not(:last-child)]:mb-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal marker:text-white/40 [&>li:not(:last-child)]:mb-2">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-l border-white/12 pl-4 text-white/72 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr aria-hidden="true" className="my-4 border-white/10" />,
          a: ({ children, href }) =>
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className={linkClassName}
              >
                {children}
              </a>
            ) : (
              <span className="font-medium text-inherit">{children}</span>
            ),
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto rounded-[1.25rem] border border-white/10 bg-black/45 px-4 py-3 text-[13px] leading-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {children}
            </pre>
          ),
          code: ({ children, className, node, ...props }: CodeProps) => {
            void node;
            const value = String(children).replace(/\n$/, "");
            const isInline = !className && !value.includes("\n");

            return (
              <code
                {...props}
                className={cn(
                  "font-mono text-[0.92em]",
                  isInline
                    ? "rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[#ffd9ba]"
                    : "bg-transparent px-0 py-0 text-white",
                  className,
                )}
              >
                {value}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-[1.1rem] border border-white/10 bg-black/20">
              <table className="min-w-full border-collapse text-left text-[13px] leading-6">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/6 text-white/82">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/8">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="align-top odd:bg-white/[0.02]">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border-b border-white/10 px-3 py-2 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-white/78">{children}</td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
