"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { normalizeDigits } from "@/lib/digits";

type Row = { id: number; name: string; phone: string; balance: number; detail: string };

// Ignore Arabic diacritics and unify common letter variants so "احمد" finds "أحمد".
function fold(s: string): string {
  return normalizeDigits(s)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s\-()+]/g, "");
}

export function CustomerList({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("");
  const indexed = useMemo(() => customers.map((c) => ({ ...c, key: fold(c.name) + "|" + fold(c.phone) })), [customers]);
  const needle = fold(q);
  const shown = needle ? indexed.filter((c) => c.key.includes(needle)) : indexed;

  if (customers.length === 0) {
    return (
      <div className="card empty">
        <p style={{ margin: "0 0 12px", fontWeight: 700 }}>لا يوجد زبائن بعد</p>
        <p style={{ margin: 0 }}>ابدأ بإضافة أول زبون من الزر في الأسفل.</p>
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
          placeholder="ابحث بالاسم أو الرقم…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        <SearchIcon />
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          لا يوجد زبون بهذا الاسم.{" "}
          <Link href={`/customers/new?name=${encodeURIComponent(q.trim())}`}>أضفه كزبون جديد</Link>
        </div>
      ) : (
        <ul className="list" aria-label="الزبائن">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="list-item">
                <div className="list-main">
                  <div className="list-title">{c.name}</div>
                  <div className="list-sub">{c.detail}</div>
                </div>
                {c.balance > 0 ? (
                  <span className="badge num" aria-label={`عليه ${c.balance}`}>
                    {c.balance}
                  </span>
                ) : (
                  <span className="badge zero">لا شيء</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
