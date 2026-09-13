import { EmptyState } from "@/components/features/desk/EmptyState";

export default function UsagePage() {
  return (
    <EmptyState
      title="Usage"
      body="Quota and wallet detail is not on this page yet. Desk does not insert usage_events on load."
    />
  );
}
