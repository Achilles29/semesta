CREATE TABLE IF NOT EXISTS world_state (
  id VARCHAR(24) NOT NULL PRIMARY KEY,
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  phase VARCHAR(24) NOT NULL,
  published_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_projects (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  plot_id VARCHAR(16) NOT NULL,
  city VARCHAR(24) NOT NULL,
  position_x DOUBLE NOT NULL,
  position_z DOUBLE NOT NULL,
  work_x DOUBLE NOT NULL,
  work_z DOUBLE NOT NULL,
  depot_x DOUBLE NOT NULL,
  depot_z DOUBLE NOT NULL,
  interaction_radius DOUBLE NOT NULL DEFAULT 3,
  required_units INT UNSIGNED NOT NULL,
  delivered_units INT UNSIGNED NOT NULL DEFAULT 0,
  installed_units INT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL,
  completed_at DATETIME(6) DEFAULT NULL,
  CONSTRAINT chk_world_project_progress CHECK (installed_units <= delivered_units AND delivered_units <= required_units)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_publications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  world_version BIGINT UNSIGNED NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_name VARCHAR(80) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  phase VARCHAR(24) NOT NULL,
  project_id VARCHAR(64) DEFAULT NULL,
  request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  before_json LONGTEXT NOT NULL,
  after_json LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_world_publication_request (request_id),
  UNIQUE KEY uq_world_publication_version (world_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_work_state (
  citizen_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  construction_kit TINYINT UNSIGNED NOT NULL DEFAULT 0,
  carrying_project_id VARCHAR(64) DEFAULT NULL,
  picked_up_at DATETIME(6) DEFAULT NULL,
  construction_xp BIGINT UNSIGNED NOT NULL DEFAULT 0,
  install_project_id VARCHAR(64) DEFAULT NULL,
  install_ready_at DATETIME(6) DEFAULT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT chk_citizen_work_kit CHECK (construction_kit <= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_action_requests (
  actor_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  result_json LONGTEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (actor_key, request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_work_ledger (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  citizen_id BIGINT UNSIGNED NOT NULL,
  project_id VARCHAR(64) NOT NULL,
  request_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(24) NOT NULL,
  kit_delta SMALLINT NOT NULL DEFAULT 0,
  xp_delta SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  project_version BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uq_citizen_work_reward (citizen_id, request_id),
  KEY idx_citizen_work_history (citizen_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO world_state (id,version,phase,published_at) VALUES ('republic',1,'after-day2',UTC_TIMESTAMP(6));
INSERT IGNORE INTO world_projects (id,name,plot_id,city,position_x,position_z,work_x,work_z,depot_x,depot_z,interaction_radius,required_units,status,updated_at)
VALUES ('jakartawa-home-01','Rumah contoh P01','P01','jakarta',29,-28,29,-21.5,22,-10,3,12,'draft',UTC_TIMESTAMP(6));
INSERT IGNORE INTO world_publications (world_version,action,actor_name,reason,phase,project_id,request_id,before_json,after_json,created_at)
VALUES (1,'seed','Sistem','Kanon setelah Day 2. Rumah contoh masih rancangan, menunggu aktivasi admin.','after-day2',NULL,'migration-canon-v1','{}','{"phase":"after-day2","projectStatus":"draft"}',UTC_TIMESTAMP(6));
