import { Fragment } from "react";
import { parseInline, type InlineNode } from "@/lib/article-blocks";

function render(nodes: InlineNode[]): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.kind) {
      case "text":
        return <Fragment key={index}>{node.text}</Fragment>;
      case "bold":
        return <strong key={index} className="font-semibold">{render(node.children)}</strong>;
      case "italic":
        return <em key={index}>{render(node.children)}</em>;
      case "link": {
        const external = /^https?:\/\//.test(node.href);
        return (
          <a
            key={index}
            href={node.href}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="underline decoration-foreground/30 underline-offset-[3px] transition-colors hover:decoration-psg-red"
          >
            {render(node.children)}
          </a>
        );
      }
    }
  });
}

/** **bold**, *italic* and [links](https://…) as elements: never raw HTML. */
export function RichText({ text }: { text: string }) {
  return <>{render(parseInline(text))}</>;
}
