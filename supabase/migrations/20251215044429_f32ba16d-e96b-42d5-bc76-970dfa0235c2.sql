-- Add RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on items table
DROP POLICY IF EXISTS "Admin can view items " ON public.items;
DROP POLICY IF EXISTS "Admin can insert items " ON public.items;
DROP POLICY IF EXISTS "Admin can update items " ON public.items;
DROP POLICY IF EXISTS "Admin can delete items " ON public.items;

-- Create secure policies on items table
CREATE POLICY "Admins can view items"
ON public.items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert items"
ON public.items FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update items"
ON public.items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete items"
ON public.items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on item_pieces table
DROP POLICY IF EXISTS "Admin can view item_pieces " ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can insert item_pieces " ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can update item_pieces " ON public.item_pieces;
DROP POLICY IF EXISTS "Admin can delete item_pieces " ON public.item_pieces;

-- Create secure policies on item_pieces table
CREATE POLICY "Admins can view item_pieces"
ON public.item_pieces FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert item_pieces"
ON public.item_pieces FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update item_pieces"
ON public.item_pieces FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete item_pieces"
ON public.item_pieces FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on categories table
DROP POLICY IF EXISTS "Admin can view categories " ON public.categories;
DROP POLICY IF EXISTS "Admin can insert categories " ON public.categories;
DROP POLICY IF EXISTS "Admin can update categories " ON public.categories;
DROP POLICY IF EXISTS "Admin can delete categories " ON public.categories;

-- Create secure policies on categories table
CREATE POLICY "Admins can view categories"
ON public.categories FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on subcategories table
DROP POLICY IF EXISTS "Admin can view subcategories " ON public.subcategories;
DROP POLICY IF EXISTS "Admin can insert subcategories " ON public.subcategories;
DROP POLICY IF EXISTS "Admin can update subcategories " ON public.subcategories;
DROP POLICY IF EXISTS "Admin can delete subcategories " ON public.subcategories;

-- Create secure policies on subcategories table
CREATE POLICY "Admins can view subcategories"
ON public.subcategories FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert subcategories"
ON public.subcategories FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subcategories"
ON public.subcategories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subcategories"
ON public.subcategories FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on item_code_counters table
DROP POLICY IF EXISTS "Admin can view counters " ON public.item_code_counters;
DROP POLICY IF EXISTS "Admin can insert counters " ON public.item_code_counters;
DROP POLICY IF EXISTS "Admin can update counters " ON public.item_code_counters;

-- Create secure policies on item_code_counters table
CREATE POLICY "Admins can view counters"
ON public.item_code_counters FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert counters"
ON public.item_code_counters FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update counters"
ON public.item_code_counters FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Drop old insecure policies on admin_users table
DROP POLICY IF EXISTS "Admin can view admin_users " ON public.admin_users;
DROP POLICY IF EXISTS "Admin can insert admin_users " ON public.admin_users;

-- Create secure policies on admin_users table
CREATE POLICY "Admins can view admin_users"
ON public.admin_users FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));