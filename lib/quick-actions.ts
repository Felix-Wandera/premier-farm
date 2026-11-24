export type QuickActionId =
  | "add-animal"
  | "log-milk"
  | "log-breeding"
  | "log-health"
  | "record-transaction"
  | "record-stock"
  | "new-item"
  | "invite-member";

export const QUICK_ACTION_EVENT = "premier:quick-action";

export function dispatchQuickAction(action: QuickActionId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ action: QuickActionId }>(QUICK_ACTION_EVENT, {
      detail: { action },
    })
  );
}
