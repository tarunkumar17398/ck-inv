-- Drop all old insecure policies with 'true' conditions

-- admin_users table
DROP POLICY IF EXISTS "Admin can insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin can view admin_users" ON public.admin_users;

-- categories table
DROP POLICY IF EXISTS "Admin can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can view categories" ON public.categories;

-- item_code_counters table
DROP POLICY IF EXISTS "Admin can insert counters" ON public.item_code_counters;
DROP POLICY IF EXISTS "Admin can update counters" ON public.item_code_counters;
DROP POLICY IF EXISTS "Admin can view counters" ON public.item_code_counters;

-- item_pieces table
DROP POLICY IF EXISTS "Admin can delete item_pieces" ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can insert item_pieces" ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can update item_pieces" ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can view item_pieces" ON public.item_pieces;

-- items table
DROP POLICY IF EXISTS "Admin can delete items" ON public.items;
DROP POLICY IF EXISTS "Admin can insert items" ON public.items;
DROP POLICY IF EXISTS "Admin can update items" ON public.items;
DROP POLICY IF EXISTS "Admin can view items" ON public.items;

-- subcategories table
DROP POLICY IF EXISTS "Admin can delete subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admin can insert subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admin can update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Admin can view subcategories" ON public.subcategories;