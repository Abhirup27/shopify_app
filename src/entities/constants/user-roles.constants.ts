export const ALL_PERMS: string[] = [
    "read_orders", "write_orders", "read_customers", "write_customers",
    "read_products", "write_products", "write_teamusers", "read_teamusers"
];

export const SUPER_ADMIN = 'SUPER_ADMIN'
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    SUPER_ADMIN: ALL_PERMS
};
