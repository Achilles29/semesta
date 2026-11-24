CREATE TABLE IF NOT EXISTS citizen_proposals (
 citizen_id BIGINT UNSIGNED NOT NULL,
 request_id VARCHAR(64) NOT NULL,
 idea_public_id VARCHAR(64) NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 created_at DATETIME NOT NULL,
 PRIMARY KEY (citizen_id, request_id),
 UNIQUE KEY proposal_idea (idea_public_id),
 KEY proposal_rate (citizen_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
