import { PageHeader } from "@/components/PageHeader";
import { loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/ledger";
import { AddProductForm, ProductRow } from "./ProductForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "الأصناف والأسعار — دفتر الصواني" };

export default async function ProductsPage() {
  const [settings, products] = await Promise.all([loadSettings(), listProducts(db())]);
  return (
    <>
      <PageHeader title="الأصناف والأسعار" sub="سعر الصينية الكاملة لكل صنف" back="/settings" backLabel="الإعدادات" />
      {products.length > 0 && (
        <ul className="list" aria-label="الأصناف">
          {products.map((p) => (
            <li key={p.id}>
              <ProductRow product={p} currency={settings.currency} />
            </li>
          ))}
        </ul>
      )}
      <section className="section" aria-labelledby="add-h">
        <div className="section-head">
          <h2 id="add-h">إضافة صنف</h2>
        </div>
        <AddProductForm currency={settings.currency} />
      </section>
      <p className="small muted section">
        تغيير السعر يطبّق على العمليات الجديدة فقط؛ العمليات السابقة تحتفظ بسعرها.
      </p>
    </>
  );
}
