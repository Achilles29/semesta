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
