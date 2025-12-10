import { getCuratedCollections } from "@/app/actions/curated-collections";
import { CuratedCollectionsManager } from "@/components/admin/CuratedCollectionsManager";

export default async function AdminCollectionsPage() {
  const result = await getCuratedCollections();

  return (
    <div className="space-y-6 max-w-none">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Collections</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Manage curated movie collections for search and home page
        </p>
      </div>
      <CuratedCollectionsManager collections={result.data} />
    </div>
  );
}
