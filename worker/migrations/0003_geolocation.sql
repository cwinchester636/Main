-- Real geodistance support. `lat`/`lng` are a best-effort ZIP-centroid
-- geocode (see worker/src/geocode.js) — nullable, since geocoding is an
-- external call that can fail or simply never have run yet for an older
-- account. `radius_miles` is the user's own "how far to look" preference;
-- null means no limit (today's behavior, unchanged).
ALTER TABLE accounts ADD COLUMN lat REAL;
ALTER TABLE accounts ADD COLUMN lng REAL;
ALTER TABLE accounts ADD COLUMN radius_miles INTEGER;
