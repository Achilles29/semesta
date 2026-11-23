-- One grant per account. Existing Wisma / construction progress is untouched.
CREATE TABLE IF NOT EXISTS citizen_starter_grants (
  citizen_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  grant_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  coins_granted INT UNSIGNED NOT NULL DEFAULT 1000,
  coin_balance BIGINT UNSIGNED NOT NULL DEFAULT 1000,
  occupation_at_grant VARCHAR(48) NOT NULL,
  tool_id VARCHAR(48) NOT NULL,
  tool_label VARCHAR(120) NOT NULL,
  home_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  granted_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_starter_home (home_id),
  CONSTRAINT chk_starter_amount CHECK (coins_granted = 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
