import { notFound } from "next/navigation";

import { GuestExperience } from "@/components/menu/guest-experience";
import { getMenuData, resolveTable } from "@/lib/menu-data";
import { ensureOpenTableSession } from "@/lib/table-session";

export default async function TableMenuPage(
  props: PageProps<"/menu/[restaurant]/[branch]/[table]">,
) {
  const { restaurant: restaurantSlug, branch: branchSlug, table: tableId } = await props.params;
  const data = await getMenuData(restaurantSlug, branchSlug);

  if (!data) notFound();

  const table = await resolveTable(data.branch.id, tableId);

  if (!table) notFound();

  const session = await ensureOpenTableSession(data.branch.id, table.id);

  return (
    <GuestExperience
      restaurant={data.restaurant}
      categories={data.categories}
      tableLabel={table.label}
      restaurantSlug={data.restaurant.slug}
      branchSlug={data.branch.slug}
      branchId={data.branch.id}
      tableId={table.id}
      sessionOpenedAt={session?.openedAt ?? new Date().toISOString()}
    />
  );
}
