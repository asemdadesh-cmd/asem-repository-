import Link from "next/link";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/ledger";
import { AddProductForm, ProductRow } from "./ProductForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "الأصناف — دفتر الحلويات" };

export default async function ProductsPage() {
  const products = await listProducts(db());
  return (
    <>
      <Link href="/" className="back">
        → الزبائن
      </Link>
      <h1 className="page-title">الأصناف</h1>
      <AddProductForm />
      <h2 className="history-title">الأصناف الحالية</h2>
      {products.length === 0 ? (
        <div className="card empty">لا توجد أصناف بعد. أضف «بسبوسة» مثلاً.</div>
      ) : (
        <ul className="list" aria-label="الأصناف">
          {products.map((p) => (
            <li key={p.id}>
              <ProductRow product={p} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
