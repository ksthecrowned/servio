import { AutoRefresh } from "@/components/auto-refresh";
import { BillCard } from "@/components/staff/bill-card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffSession } from "@/lib/staff-session";
import { staffLogout } from "@/app/actions/staff-auth";

export default async function CashierPage() {
  const session = await requireStaffSession("cashier");
  const admin = createAdminClient();

  let query = admin
    .from("bills")
    .select("id, total_amount, table_sessions!bills_table_session_id_fkey(restaurant_tables!table_sessions_table_id_fkey(label))")
    .neq("status", "paid")
    .eq("restaurant_id", session.restaurantId)
    .order("created_at");

  if (session.branchId) {
    query = query.eq("branch_id", session.branchId);
  }

  const { data: bills } = await query;

  const cards = (bills ?? []).map((bill) => {
    const tableLabel =
      (bill.table_sessions as unknown as { restaurant_tables: { label: string } } | null)
        ?.restaurant_tables.label ?? "—";
    return { id: bill.id, total_amount: bill.total_amount, tableLabel, paymentQrDataUrl: null };
  });

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-muted/20 p-4 sm:p-6">
      <AutoRefresh intervalMs={5000} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cashier</h1>
          <p className="text-muted-foreground">{session.name}</p>
        </div>
        <form action={staffLogout}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((bill) => (
          <BillCard key={bill.id} bill={bill} />
        ))}
        {cards.length === 0 && <p className="text-sm text-muted-foreground">No open bills.</p>}
      </div>
    </div>
  );
}
