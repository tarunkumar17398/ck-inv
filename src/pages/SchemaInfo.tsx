import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  "admin_users",
  "categories",
  "estimates",
  "google_drive_tokens",
  "item_code_counters",
  "item_pieces",
  "items",
  "saved_catalogs",
  "subcategories",
  "subcategory_images",
  "user_roles",
] as const;

const SCHEMA: Record<string, Array<{ name: string; type: string; nullable: boolean; default?: string }>> = {
  admin_users: [
    { name: "id", type: "uuid", nullable: false, default: "uuid_generate_v4()" },
    { name: "created_at", type: "timestamptz", nullable: true, default: "now()" },
    { name: "pin_hash", type: "text", nullable: false },
  ],
  categories: [
    { name: "id", type: "uuid", nullable: false, default: "uuid_generate_v4()" },
    { name: "created_at", type: "timestamptz", nullable: true, default: "now()" },
    { name: "prefix", type: "text", nullable: false },
    { name: "name", type: "text", nullable: false },
  ],
  estimates: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "customer_name", type: "text", nullable: true },
    { name: "customer_phone", type: "text", nullable: true },
    { name: "items", type: "jsonb", nullable: false, default: "'[]'" },
    { name: "subtotal", type: "numeric", nullable: false, default: "0" },
    { name: "discount_enabled", type: "boolean", nullable: false, default: "false" },
    { name: "discount_type", type: "text", nullable: false, default: "'amount'" },
    { name: "discount_value", type: "numeric", nullable: false, default: "0" },
    { name: "discount_amount", type: "numeric", nullable: false, default: "0" },
    { name: "extra_enabled", type: "boolean", nullable: false, default: "false" },
    { name: "extra_label", type: "text", nullable: true },
    { name: "extra_amount", type: "numeric", nullable: false, default: "0" },
    { name: "extra_charges_enabled", type: "boolean", nullable: true, default: "false" },
    { name: "extra_charges_label", type: "text", nullable: true },
    { name: "extra_charges_amount", type: "numeric", nullable: true, default: "0" },
    { name: "extra_charges_total", type: "numeric", nullable: true, default: "0" },
    { name: "gst_enabled", type: "boolean", nullable: false, default: "true" },
    { name: "gst_rate", type: "numeric", nullable: false, default: "18" },
    { name: "gst_percentage", type: "numeric", nullable: true, default: "5" },
    { name: "gst_amount", type: "numeric", nullable: false, default: "0" },
    { name: "grand_total", type: "numeric", nullable: false, default: "0" },
    { name: "store_snapshot", type: "jsonb", nullable: true, default: "'{}'" },
  ],
  google_drive_tokens: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "user_id", type: "uuid", nullable: false },
    { name: "access_token", type: "text", nullable: false },
    { name: "refresh_token", type: "text", nullable: false },
    { name: "expires_at", type: "timestamptz", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
  item_code_counters: [
    { name: "id", type: "uuid", nullable: false, default: "uuid_generate_v4()" },
    { name: "category_id", type: "uuid (FK → categories.id)", nullable: false },
    { name: "current_number", type: "integer", nullable: false, default: "1" },
    { name: "current_letter", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz", nullable: true, default: "now()" },
  ],
  item_pieces: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "subcategory_id", type: "uuid (FK → subcategories.id)", nullable: false },
    { name: "piece_code", type: "text", nullable: false },
    { name: "status", type: "text", nullable: false, default: "'available'" },
    { name: "cost_price", type: "numeric", nullable: true },
    { name: "sold_price", type: "numeric", nullable: true },
    { name: "date_added", type: "timestamptz", nullable: false, default: "now()" },
    { name: "date_sold", type: "timestamptz", nullable: true },
    { name: "notes", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
  items: [
    { name: "id", type: "uuid", nullable: false, default: "uuid_generate_v4()" },
    { name: "item_code", type: "text", nullable: false },
    { name: "category_id", type: "uuid (FK → categories.id)", nullable: false },
    { name: "item_name", type: "text", nullable: false },
    { name: "particulars", type: "text", nullable: true },
    { name: "size", type: "text", nullable: true },
    { name: "weight", type: "text (grams)", nullable: true },
    { name: "color_code", type: "text", nullable: true },
    { name: "price", type: "numeric", nullable: true },
    { name: "cost_price", type: "numeric", nullable: true },
    { name: "sold_price", type: "numeric", nullable: true },
    { name: "sold_date", type: "timestamptz", nullable: true },
    { name: "status", type: "text", nullable: false, default: "'in_stock'" },
    { name: "rfid_epc", type: "text", nullable: true },
    { name: "stock_print_hidden", type: "boolean", nullable: true, default: "false" },
    { name: "created_at", type: "timestamptz", nullable: true, default: "now()" },
  ],
  saved_catalogs: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "name", type: "text", nullable: false },
    { name: "settings", type: "jsonb", nullable: false, default: "'{}'" },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
    { name: "updated_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
  subcategories: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "category_id", type: "uuid (FK → categories.id)", nullable: false },
    { name: "subcategory_name", type: "text", nullable: false },
    { name: "default_price", type: "numeric", nullable: true },
    { name: "height", type: "text", nullable: true },
    { name: "image_url", type: "text", nullable: true },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
  subcategory_images: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "subcategory_id", type: "uuid (FK → subcategories.id)", nullable: false },
    { name: "image_url", type: "text", nullable: false },
    { name: "label", type: "text", nullable: false, default: "'Default'" },
    { name: "sort_order", type: "integer", nullable: false, default: "0" },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
  user_roles: [
    { name: "id", type: "uuid", nullable: false, default: "gen_random_uuid()" },
    { name: "user_id", type: "uuid", nullable: false },
    { name: "role", type: "app_role enum (admin|user)", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false, default: "now()" },
  ],
};

const FOREIGN_KEYS = [
  "item_code_counters.category_id → categories.id",
  "item_pieces.subcategory_id → subcategories.id",
  "items.category_id → categories.id",
  "subcategories.category_id → categories.id",
  "subcategory_images.subcategory_id → subcategories.id",
];

export default function SchemaInfo() {
  const [samples, setSamples] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const s: Record<string, any> = {};
      const e: Record<string, string> = {};
      await Promise.all(
        TABLES.map(async (t) => {
          const { data, error } = await supabase.from(t).select("*").limit(1);
          if (error) e[t] = error.message;
          else s[t] = data?.[0] ?? null;
        })
      );
      setSamples(s);
      setErrors(e);
    })();
  }, []);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 text-sm font-mono">
      <h1 className="text-2xl font-bold">Database Schema (hidden)</h1>

      <section>
        <h2 className="text-lg font-bold mb-2">API Endpoints</h2>
        <div className="bg-muted p-3 rounded space-y-1">
          <div><b>Supabase URL:</b> {SUPABASE_URL}</div>
          <div><b>Project Ref:</b> eucxuuepfsrbgktlqyqx</div>
          <div className="break-all"><b>Anon Key (public, safe in clients):</b> {ANON}</div>
          <div><b>REST base:</b> {SUPABASE_URL}/rest/v1/&lt;table&gt;</div>
          <div><b>Storage base:</b> {SUPABASE_URL}/storage/v1</div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Public / Unauthenticated endpoints</h2>
        <div className="bg-muted p-3 rounded space-y-2">
          <div>
            <b>RFID export (no auth, returns 1955+ in-stock items):</b><br />
            GET {SUPABASE_URL}/functions/v1/rfid-export<br />
            Returns: {`{ success, count, data: [{ "ITEM CODE", "PARTICULARS", "SIZE", "Weight", "RFID-EPC" }] }`}
          </div>
          <div>
            <b>Backup signed URL (no auth on function, returns 60-min signed URL):</b><br />
            GET {SUPABASE_URL}/functions/v1/get-backup-signed-url?filename=backup-YYYY-MM-DD.json
          </div>
          <div>
            <b>Direct REST access to tables:</b> Requires the <i>anon key</i> in both
            <code> apikey </code> and <code> Authorization: Bearer </code> headers.
            Public (anon) access is enabled on: <b>items</b> (SELECT), <b>categories</b> (SELECT),
            and <b>estimates</b> (SELECT/INSERT/UPDATE/DELETE). All other tables require a
            logged-in admin user (RLS blocks anonymous access).
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Foreign Keys</h2>
        <ul className="list-disc pl-6 bg-muted p-3 rounded">
          {FOREIGN_KEYS.map((fk) => <li key={fk}>{fk}</li>)}
        </ul>
      </section>

      {TABLES.map((t) => (
        <section key={t}>
          <h2 className="text-lg font-bold mb-2">{t}</h2>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr className="bg-muted">
                <th className="border p-1 text-left">Column</th>
                <th className="border p-1 text-left">Type</th>
                <th className="border p-1 text-left">Nullable</th>
                <th className="border p-1 text-left">Default</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMA[t].map((c) => (
                <tr key={c.name}>
                  <td className="border p-1">{c.name}</td>
                  <td className="border p-1">{c.type}</td>
                  <td className="border p-1">{c.nullable ? "YES" : "NO"}</td>
                  <td className="border p-1">{c.default ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-muted p-2 rounded">
            <b>Sample row:</b>
            {errors[t] ? (
              <pre className="text-destructive whitespace-pre-wrap">Error: {errors[t]}</pre>
            ) : (
              <pre className="whitespace-pre-wrap break-all">
                {samples[t] === undefined ? "loading…" : JSON.stringify(samples[t], null, 2)}
              </pre>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
