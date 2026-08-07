CREATE TABLE ppdb_periods (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive' COMMENT 'active,inactive',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE ppdb_waves (
  id VARCHAR(50) PRIMARY KEY,
  period_id VARCHAR(50) NOT NULL,
  wave_number INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'inactive' COMMENT 'active,inactive',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (period_id) REFERENCES ppdb_periods(id) ON DELETE CASCADE,
  UNIQUE (period_id, wave_number)
);
