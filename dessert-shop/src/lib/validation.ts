import { z } from "zod";
import { normalizeDigits } from "./digits";

export { normalizeDigits };

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

const text = (max: number, required: string, tooLong: string) =>
  z
    .string()
    .transform(collapse)
    .pipe(z.string().min(1, required).max(max, tooLong));

export const customerSchema = z.object({
  name: text(80, "اكتب اسم الزبون", "الاسم طويل جداً"),
  phone: z
    .string()
    .transform((v) => normalizeDigits(v).replace(/[\s\-()]/g, ""))
    .pipe(
      z
        .string()
        .max(20, "رقم الهاتف طويل جداً")
        .regex(/^\+?\d*$/, "رقم الهاتف يجب أن يحتوي على أرقام فقط"),
    ),
});

export const productSchema = z.object({
  name: text(60, "اكتب اسم الصنف", "اسم الصنف طويل جداً"),
});

export const transactionSchema = z.object({
  productId: z.coerce.number().int().positive("اختر الصنف"),
  kind: z.enum(["take", "return"], { message: "نوع العملية غير صحيح" }),
  quantity: z
    .string()
    .transform((v) => normalizeDigits(v).trim())
    .pipe(z.string().regex(/^\d+$/, "اكتب عدد الصواني").transform(Number))
    .pipe(z.number().int().min(1, "العدد يجب أن يكون ١ على الأقل").max(1000, "العدد كبير جداً")),
  note: z.string().transform(collapse).pipe(z.string().max(200, "الملاحظة طويلة جداً")),
  // Local wall-clock time from <input type="datetime-local">, interpreted in APP_TIMEZONE.
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "التاريخ غير صحيح"),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;

export const idSchema = z.coerce.number().int().positive();

/** First error message per field, for showing next to form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
