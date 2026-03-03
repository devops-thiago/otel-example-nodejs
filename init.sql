-- MySQL initialization script
-- This script is automatically executed when the MySQL container starts for the first time

USE otel_example;

-- Create users table with proper indexes
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO users (name, email, bio) VALUES
  ('John Doe', 'john.doe@example.com', 'Software Engineer'),
  ('Jane Smith', 'jane.smith@example.com', 'Product Manager'),
  ('Bob Johnson', 'bob.johnson@example.com', 'DevOps Engineer'),
  ('Alice Williams', 'alice.williams@example.com', 'Data Scientist'),
  ('Charlie Brown', 'charlie.brown@example.com', 'Backend Developer');

-- Display success message
SELECT 'Database initialized successfully' AS message;