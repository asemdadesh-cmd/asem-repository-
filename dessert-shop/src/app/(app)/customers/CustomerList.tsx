"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerRow, type CustomerRowData } from "@/components/CustomerRow";
import { SearchIcon, UsersIcon } from "@/components/icons";
import { fold } from "@/lib/search";

type Filter = "all" | "owing" | "overdue";

export function CustomerList({ rows, linkSuffix = "" }: { rows: CustomerRowData[]; linkSuffix?: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const indexed = useMemo(() => rows.map((r) => ({ r, key: fold(r.name) + "|" + fold(r.phone) })), [rows]);

  const counts = {
    all: rows.length,
    owing: rows.filter((r) => r.balance > 0).length,
    overdue: rows.filter((r) => r.overdue).length,
  };
  const needle = fold(q);
  const shown = indexed
    .filter(({ r }) => (filter === "owing" ? r.balance > 0 : filter === "overdue" ? r.overdue : true))
    .filter(({ key }) => !needle || key.includes(needle))
    .map(({ r }) => r);

  if (rows.length === 0) {
    return (
      <div className="card empty">
        <UsersIcon size={40} />
        <p className="empty-title">لا يوجد زبائن بعد</p>
        <p className="small" style={{ marginBottom: 16 }}>
          أضف زبائنك لتتبع الصواني التي يأخذونها.
        </p>
        <Link href="/customers/new" className="btn">
          إضافة أول زبون
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="search" role="search">
        <label htmlFor="q" className="sr-only">
          ابحث عن زبون
        </label>
        <input
          id="q"
          type="search"
          placeholder="ابحث بالاسم أو رقم الهاتف"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        <SearchIcon size={18} />
      </div>

      {!linkSuffix && (
        <div className="filters" role="group" aria-label="تصفية">
          {(
            [
              ["all", "الكل"],
              ["owing", "لديهم صواني"],
              ["overdue", "متأخرون"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="filter"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} <span className="count num">{counts[key]}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="card empty">
          <p className="empty-title">لا توجد نتائج</p>
          {q.trim() && (
            <Link
              href={`/customers/new?name=${encodeURIComponent(q.trim())}${linkSuffix ? "&next=take" : ""}`}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 8 }}
            >
              إضافة «{q.trim()}» كزبون جديد
            </Link>
          )}
        </div>
      ) : (
        <ul className="list" aria-label="الزبائن" style={{ marginTop: linkSuffix ? 12 : 0 }}>
          {shown.map((r) => (
            <li key={r.id}>
              <CustomerRow c={r} href={linkSuffix ? `/customers/${r.id}${linkSuffix}` : undefined} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
