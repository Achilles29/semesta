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
