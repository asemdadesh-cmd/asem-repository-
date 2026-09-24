import { CustomerForm } from "@/components/CustomerForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "زبون جديد — دفتر الصواني" };

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ name?: string; next?: string }> }) {
  const { name, next } = await searchParams;
  const flow = next === "take" ? "take" : undefined;
  return (
    <>
      <PageHeader title="زبون جديد" back={flow ? "/record" : "/customers"} />
      <CustomerForm customer={{ name: (name ?? "").slice(0, 80), phone: "" }} next={flow} />
    </>
  );
}
