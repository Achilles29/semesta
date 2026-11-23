CREATE TABLE IF NOT EXISTS citizen_homes (
  citizen_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  mission_status VARCHAR(16) NOT NULL DEFAULT 'not_started',
  mission_accepted_at DATETIME(6) DEFAULT NULL,
  mission_completed_at DATETIME(6) DEFAULT NULL,
  welcome_plant TINYINT UNSIGNED NOT NULL DEFAULT 0,
  decoration_placed TINYINT UNSIGNED NOT NULL DEFAULT 0,
  interior_session_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT chk_citizen_home_mission CHECK (mission_status IN ('not_started','carrying','completed')),
  CONSTRAINT chk_citizen_home_plant CHECK (welcome_plant <= 1 AND decoration_placed <= 1 AND welcome_plant + decoration_placed <= 1),
  CONSTRAINT chk_citizen_home_reward CHECK (mission_status = 'completed' OR (welcome_plant = 0 AND decoration_placed = 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_home_requests (
  citizen_id BIGINT UNSIGNED NOT NULL,
  request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(24) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (citizen_id,request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_home_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  citizen_id BIGINT UNSIGNED NOT NULL,
  request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(24) NOT NULL,
  plant_delta SMALLINT NOT NULL DEFAULT 0,
  placed_before TINYINT UNSIGNED NOT NULL,
  placed_after TINYINT UNSIGNED NOT NULL,
  mission_status VARCHAR(16) NOT NULL,
  home_version BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_citizen_home_action (citizen_id,request_id),
  KEY idx_citizen_home_history (citizen_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
