CREATE DATABASE IF NOT EXISTS semesta_nyasar
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE semesta_nyasar;

CREATE TABLE IF NOT EXISTS episodes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  payload LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_episodes_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_ideas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(80) NOT NULL,
  name VARCHAR(50) NOT NULL DEFAULT '',
  comment VARCHAR(500) NOT NULL,
  platform VARCHAR(24) NOT NULL DEFAULT '',
  status ENUM('baru','dipilih','dipakai','disimpan') NOT NULL DEFAULT 'baru',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_citizen_ideas_public_id (public_id),
  KEY idx_citizen_ideas_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS citizens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_type VARCHAR(16) NOT NULL DEFAULT 'citizen',
  username VARCHAR(32) NOT NULL,
  email VARCHAR(190) NOT NULL,
  display_name VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  verification_token_hash CHAR(64) DEFAULT NULL,
  verification_expires_at DATETIME DEFAULT NULL,
  avatar VARCHAR(32) NOT NULL DEFAULT 'warga',
  avatar_config TEXT DEFAULT NULL,
  house VARCHAR(24) NOT NULL DEFAULT 'rumah-kayu',
  gender VARCHAR(32) DEFAULT NULL,
  religion VARCHAR(48) DEFAULT NULL,
  birth_province VARCHAR(64) DEFAULT NULL,
  birth_city VARCHAR(80) DEFAULT NULL,
  birth_date DATE DEFAULT NULL,
  occupation VARCHAR(48) DEFAULT NULL,
  education_level VARCHAR(48) DEFAULT NULL,
  domicile_province VARCHAR(64) DEFAULT NULL,
  domicile_city VARCHAR(80) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_citizens_google_sub (google_sub),
  UNIQUE KEY uq_citizens_username (username),
  UNIQUE KEY uq_citizens_email (email),
  KEY idx_citizens_account_type (account_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_master_data (
  master_type VARCHAR(32) NOT NULL,
  master_value VARCHAR(64) NOT NULL,
  label VARCHAR(100) NOT NULL,
  avatar_style VARCHAR(32) DEFAULT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (master_type, master_value),
  KEY idx_citizen_master_active (master_type, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visited_at DATETIME NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  visitor_hash CHAR(64) NOT NULL,
  session_hash CHAR(64) DEFAULT NULL,
  request_path VARCHAR(255) NOT NULL,
  referrer_host VARCHAR(190) DEFAULT NULL,
  referrer_path VARCHAR(255) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  browser VARCHAR(32) NOT NULL DEFAULT 'Lainnya',
  device_type VARCHAR(16) NOT NULL DEFAULT 'desktop',
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  language VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_visitor_logs_time (visited_at),
  KEY idx_visitor_logs_ip (ip_address, visited_at),
  KEY idx_visitor_logs_visitor (visitor_hash, visited_at),
  KEY idx_visitor_logs_referrer (referrer_host, visited_at),
  KEY idx_visitor_logs_device (device_type, visited_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(80) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS world_scenes (
  region VARCHAR(24) NOT NULL,
  scene_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_presence (
  citizen_id BIGINT UNSIGNED NOT NULL,
  destination VARCHAR(24) NOT NULL,
  region VARCHAR(24) NOT NULL,
  x DOUBLE NOT NULL DEFAULT 0,
  z DOUBLE NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (citizen_id),
  KEY idx_citizen_presence_scope (destination, region, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id BIGINT UNSIGNED NOT NULL,
  recipient_id BIGINT UNSIGNED NOT NULL,
  destination VARCHAR(24) NOT NULL,
  region VARCHAR(24) NOT NULL,
  message VARCHAR(280) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_citizen_messages_pair (sender_id, recipient_id, id),
  KEY idx_citizen_messages_recipient (recipient_id, sender_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shared republic world (additive migration 20261123).
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

-- Private citizen homes (additive migration 20261123).
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
