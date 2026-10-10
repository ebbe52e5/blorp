import { Fragment } from "react";
import _ from "lodash";
import { abbriviateNumber } from "../lib/format";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export function AggregateBadges({
  aggregates,
  links,
  className,
  children,
}: {
  aggregates: Record<string, number | undefined | null>;
  /** Wraps the badge for a label, e.g. in a Link to the list it counts */
  links?: Partial<Record<string, (badge: React.ReactNode) => React.ReactNode>>;
  className?: string;
  children?: React.ReactNode;
}) {
  const entries = Object.entries(aggregates);
  const isEmpty = entries.findIndex(([_key, val]) => _.isNumber(val)) < 0;

  if (isEmpty && !children) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {children}
      {entries.map(([label, value]) => {
        if (!_.isNumber(value)) {
          return null;
        }
        const wrap = links?.[label];
        const badge = (
          <Badge
            key={label}
            variant="secondary"
            className={cn(wrap && "text-brand hover:underline")}
          >
            <span className="block" key={label}>
              {abbriviateNumber(value)} {label}
            </span>
          </Badge>
        );
        return wrap ? <Fragment key={label}>{wrap(badge)}</Fragment> : badge;
      })}
    </div>
  );
}
