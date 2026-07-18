PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scenic_area (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenic_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    intro TEXT NOT NULL,
    open_hours TEXT NOT NULL,
    ticket_policy TEXT NOT NULL,
    reservation_policy TEXT NOT NULL,
    transport_guide TEXT NOT NULL,
    parking_guide TEXT NOT NULL,
    dining_guide TEXT NOT NULL,
    hotel_guide TEXT NOT NULL,
    contact_phone TEXT,
    source_title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenic_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenic_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT NOT NULL,
    summary TEXT NOT NULL,
    ticket_note TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    source_title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenic_id) REFERENCES scenic_area(id)
);

CREATE TABLE IF NOT EXISTS guide_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenic_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_title TEXT NOT NULL,
    sort_no INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenic_id) REFERENCES scenic_area(id)
);

CREATE TABLE IF NOT EXISTS guide_chat_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sources TEXT,
    hit_mode TEXT NOT NULL DEFAULT 'knowledge',
    scenic_code TEXT,
    client_type TEXT NOT NULL DEFAULT 'miniprogram',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scenic_activity_scenic_date ON scenic_activity (scenic_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_guide_knowledge_scenic_category ON guide_knowledge (scenic_id, category, is_active);
CREATE INDEX IF NOT EXISTS idx_guide_chat_log_created_at ON guide_chat_log (created_at DESC);
