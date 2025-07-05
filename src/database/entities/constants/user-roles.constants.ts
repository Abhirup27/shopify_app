export const ALL_PERMS: string[] = [
  'all_access',
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_products',
  'write_products',
  'write_members',
  'read_members',
  'read_locations',
  'write_locations',
];
export const ADMIN_PERMS: string[] = [
  'read_orders',
  'write_orders',
  'read_customers',
  'write_customers',
  'read_products',
  'write_products',
  'write_members',
  'read_members',
  'read_locations',
  'write_locations',
];
export const SUB_USER_PERMS: string[] = ['read_orders', 'read_customers', 'read_products', 'read_teamusers'];
export const SUPER_ADMIN = 'SUPER_ADMIN';
export const ADMIN = 'ADMIN';
export const SUB_USER = 'SUB_USER';
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_PERMS,
  ADMIN: ADMIN_PERMS,
  SUB_USER: SUB_USER_PERMS,
};
