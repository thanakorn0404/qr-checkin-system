// app/components/Card.tsx
import { cx, theme } from "@/app/ui";

export default function Card({
  title,
  right,
  children,
  className,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-3xl", theme.border, theme.shadow, "p-5 md:p-6", className)}>
      {(title || right) ? (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title ? <div className={theme.h2}>{title}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}