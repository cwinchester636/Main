-- Card condition, ordered worst -> best: HP (Heavily Played), MP
-- (Moderately Played), LP (Lightly Played), NM (Near Mint), graded (a
-- third-party grading slab, with its 1-10 grade in the separate `grade`
-- column). Both nullable — older rows and anyone who skips the picker
-- simply have no recorded condition, same as any other optional field here.
--
-- SQLite can't reference another column in an ALTER TABLE ADD COLUMN CHECK,
-- so "grade only makes sense when condition = 'graded'" is enforced in
-- worker/src/routes/collection.js, not here.
ALTER TABLE collection_items ADD COLUMN condition TEXT
  CHECK (condition IS NULL OR condition IN ('HP', 'MP', 'LP', 'NM', 'graded'));
ALTER TABLE collection_items ADD COLUMN grade INTEGER
  CHECK (grade IS NULL OR (grade BETWEEN 1 AND 10));
