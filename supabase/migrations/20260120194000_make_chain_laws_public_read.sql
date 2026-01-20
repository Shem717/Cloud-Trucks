-- Make chain_laws publicly readable.

ALTER TABLE IF EXISTS public.chain_laws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.chain_laws;
DROP POLICY IF EXISTS "Allow public read" ON public.chain_laws;

CREATE POLICY "Allow public read"
ON public.chain_laws
FOR SELECT
TO anon, authenticated
USING (true);
