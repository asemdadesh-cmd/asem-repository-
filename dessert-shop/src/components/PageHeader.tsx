import Link from "next/link";
import { BackIcon } from "./icons";

export function PageHeader({
  title,
  sub,
  back,
  backLabel = "رجوع",
  action,
  leading,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  back?: string;
  backLabel?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      {back && (
        <Link href={back} className="back-btn" aria-label={backLabel}>
          <BackIcon />
        </Link>
      )}
      {leading}
      <div className="titles">
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
