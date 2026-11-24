export type AppRole = "ADMIN" | "MANAGER" | "WORKER";

export const ALL_PERMISSION_KEYS = [
  "analytics:view",
  "exports:download",
  "finances:view",
  "finances:manage",
  "herd:view",
  "herd:create",
  "herd:edit",
  "herd:delete",
  "milk:view",
  "milk:log",
  "milk:manage_history",
  "health:view",
  "health:manage",
  "inventory:view",
  "inventory:transact",
  "inventory:manage",
  "users:manage",
  "settings:manage",
] as const;

export type PermissionKey = (typeof ALL_PERMISSION_KEYS)[number];

export type CustomPermissionsMap = Partial<Record<PermissionKey, boolean>>;

export interface PermissionDefinition {
  key: PermissionKey;
  group: string;
  label: string;
  description: string;
  optInOnly?: boolean;
  requires?: PermissionKey;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: "analytics:view",
    group: "Analytics & Reporting",
    label: "View Analytics Dashboard",
    description: "Access the Analytics & Reports hub, production trends, and herd metrics.",
  },
  {
    key: "exports:download",
    group: "Analytics & Reporting",
    label: "Export CSV & Printable Reports",
    description: "Download spreadsheet exports and print management summaries (scoped to viewable modules).",
  },
  {
    key: "finances:view",
    group: "Sales & Finances",
    label: "View Financial Ledgers & Costs",
    description: "See farm income, expenses, animal sale prices, vet costs, and financial analytics.",
  },
  {
    key: "finances:manage",
    group: "Sales & Finances",
    label: "Record & Manage Transactions",
    description: "Add income and expense entries to the farm financial ledger.",
    requires: "finances:view",
  },
  {
    key: "herd:view",
    group: "Herd Management",
    label: "View Herd Directory",
    description: "Browse registered animals, lineage, and profile timelines.",
  },
  {
    key: "herd:create",
    group: "Herd Management",
    label: "Register New Animals",
    description: "Add new livestock or newborn calves to the herd directory.",
    requires: "herd:view",
  },
  {
    key: "herd:edit",
    group: "Herd Management",
    label: "Edit Animal Profiles & Status",
    description: "Modify animal attributes and record Sold, Sick, or Deceased status transitions.",
    requires: "herd:view",
  },
  {
    key: "herd:delete",
    group: "Herd Management",
    label: "Delete Animal Records",
    description: "Permanently soft-delete mistaken animal records (requires exact name confirmation).",
    optInOnly: true,
    requires: "herd:view",
  },
  {
    key: "milk:view",
    group: "Milk Production",
    label: "View Milk Production",
    description: "View daily milking sessions and cow yield breakdowns.",
  },
  {
    key: "milk:log",
    group: "Milk Production",
    label: "Log Daily Milk Sessions",
    description: "Record Morning, Mid-day, and Evening milk yields.",
    requires: "milk:view",
  },
  {
    key: "milk:manage_history",
    group: "Milk Production",
    label: "Edit or Delete Historical Milk Logs",
    description: "Adjust past individual cow yields or delete historical milking sessions.",
    requires: "milk:view",
  },
  {
    key: "health:view",
    group: "Breeding & Health",
    label: "View Breeding & Health Records",
    description: "Browse upcoming breeding schedules, calvings, and health logs.",
  },
  {
    key: "health:manage",
    group: "Breeding & Health",
    label: "Log Breeding & Health Events",
    description: "Record inseminations, pregnancy checks, births, vaccinations, and treatments.",
    requires: "health:view",
  },
  {
    key: "inventory:view",
    group: "Inventory & Stock",
    label: "View Stock & Ledger",
    description: "Inspect feed, medicine, and equipment stock levels and history.",
  },
  {
    key: "inventory:transact",
    group: "Inventory & Stock",
    label: "Record Stock In / Stock Out",
    description: "Add restocks or deduct daily feed and medicine consumption.",
    requires: "inventory:view",
  },
  {
    key: "inventory:manage",
    group: "Inventory & Stock",
    label: "Manage Inventory Items & Pricing",
    description: "Create, edit, or archive inventory items and configure financial unit costs.",
    requires: "inventory:view",
  },
  {
    key: "users:manage",
    group: "Administration",
    label: "Manage Team & Permissions",
    description: "Invite team members, assign roles, and customize granular user permissions.",
  },
  {
    key: "settings:manage",
    group: "Administration",
    label: "Manage Organization Profile",
    description: "Edit ranch name, location, official contact details, and currency.",
  },
];

/**
 * Default permissions by base role.
 * Note: `herd:delete` is intentionally FALSE for every role by default —
 * it must be explicitly granted via per-user customPermissions.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<AppRole, Record<PermissionKey, boolean>> = {
  ADMIN: {
    "analytics:view": true,
    "exports:download": true,
    "finances:view": true,
    "finances:manage": true,
    "herd:view": true,
    "herd:create": true,
    "herd:edit": true,
    "herd:delete": false,
    "milk:view": true,
    "milk:log": true,
    "milk:manage_history": true,
    "health:view": true,
    "health:manage": true,
    "inventory:view": true,
    "inventory:transact": true,
    "inventory:manage": true,
    "users:manage": true,
    "settings:manage": true,
  },
  MANAGER: {
    "analytics:view": true,
    "exports:download": true,
    "finances:view": true,
    "finances:manage": true,
    "herd:view": true,
    "herd:create": true,
    "herd:edit": true,
    "herd:delete": false,
    "milk:view": true,
    "milk:log": true,
    "milk:manage_history": true,
    "health:view": true,
    "health:manage": true,
    "inventory:view": true,
    "inventory:transact": true,
    "inventory:manage": true,
    "users:manage": false,
    "settings:manage": false,
  },
  WORKER: {
    "analytics:view": false,
    "exports:download": false,
    "finances:view": false,
    "finances:manage": false,
    "herd:view": true,
    "herd:create": false,
    "herd:edit": false,
    "herd:delete": false,
    "milk:view": true,
    "milk:log": true,
    "milk:manage_history": false,
    "health:view": true,
    "health:manage": false,
    "inventory:view": true,
    "inventory:transact": true,
    "inventory:manage": false,
    "users:manage": false,
    "settings:manage": false,
  },
};

export function normalizeRole(role?: string | null): AppRole {
  if (role === "ADMIN" || role === "MANAGER" || role === "WORKER") {
    return role;
  }
  return "WORKER";
}

export function parseCustomPermissions(raw: unknown): CustomPermissionsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const result: CustomPermissionsMap = {};
  const record = raw as Record<string, unknown>;
  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof record[key] === "boolean") {
      result[key] = record[key] as boolean;
    }
  }
  return result;
}

/**
 * Resolves the effective boolean map of permissions for a member given their base role and custom overrides,
 * enforcing parent-view dependencies (e.g., if `finances:view` is false, `finances:manage` cannot be true).
 */
export function resolvePermissionMap(
  roleInput?: string | null,
  rawCustom?: unknown
): Record<PermissionKey, boolean> {
  const role = normalizeRole(roleInput);
  const base = { ...ROLE_DEFAULT_PERMISSIONS[role] };
  const overrides = parseCustomPermissions(rawCustom);

  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof overrides[key] === "boolean") {
      base[key] = overrides[key]!;
    }
  }

  // Enforce `requires` dependencies:
  // If a child capability is explicitly granted via override without its parent view,
  // only keep it active if its parent view is also active (unless parent was not explicitly disabled).
  for (const def of PERMISSION_DEFINITIONS) {
    if (def.requires) {
      // If parent was explicitly set to false, child must be false
      if (overrides[def.requires] === false) {
        base[def.key] = false;
      } else if (base[def.key] && !base[def.requires]) {
        // Child was enabled while parent defaulted to false -> enable parent view automatically
        base[def.requires] = true;
      }
    }
  }

  return base;
}

export function resolveEffectivePermissions(
  roleInput?: string | null,
  rawCustom?: unknown
): PermissionKey[] {
  const map = resolvePermissionMap(roleInput, rawCustom);
  return ALL_PERMISSION_KEYS.filter((k) => map[k]);
}

/**
 * Computes a minimal diff object containing only keys whose desired state differs from `ROLE_DEFAULT_PERMISSIONS[role]`.
 */
export function computePermissionOverridesDiff(
  roleInput: string,
  desiredMap: Partial<Record<PermissionKey, boolean>>
): CustomPermissionsMap {
  const role = normalizeRole(roleInput);
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];
  const resolved = resolvePermissionMap(role, desiredMap);
  const diff: CustomPermissionsMap = {};

  for (const key of ALL_PERMISSION_KEYS) {
    if (resolved[key] !== defaults[key]) {
      diff[key] = resolved[key];
    }
  }

  return diff;
}

export function hasCustomPermissionOverrides(
  roleInput?: string | null,
  rawCustom?: unknown
): boolean {
  const role = normalizeRole(roleInput);
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];
  const resolved = resolvePermissionMap(role, rawCustom);
  return ALL_PERMISSION_KEYS.some((key) => resolved[key] !== defaults[key]);
}
