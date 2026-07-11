-- ============================================
-- Mojo Party Bot — Database Schema v1
-- Activity-agnostic core: the same schema works for Valorant,
-- D&D, Black Desert, EuroTruck Simulator, etc.
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    discord_id      VARCHAR(20) UNIQUE NOT NULL,
    username        VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    is_banned       BOOLEAN DEFAULT false
);

-- Activity types. Each row is one LFG "context",
-- e.g. 'ets2_convoy', 'bdo_pvp', 'bdo_farm', 'dnd_5e'
CREATE TABLE IF NOT EXISTS activities (
    id              BIGSERIAL PRIMARY KEY,
    slug            VARCHAR(60) UNIQUE NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    game_group      VARCHAR(60),
    accent_color    VARCHAR(7) DEFAULT '#7F77DD',  -- hex color for UI consistency
    icon            VARCHAR(50),
    field_schema    JSONB NOT NULL DEFAULT '{"fields":[]}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_profiles (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(id) ON DELETE CASCADE,
    activity_id     BIGINT REFERENCES activities(id) ON DELETE CASCADE,
    field_data      JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, activity_id)
);

CREATE TABLE IF NOT EXISTS servers (
    id                  BIGSERIAL PRIMARY KEY,
    discord_guild_id    VARCHAR(20) UNIQUE NOT NULL,
    name                VARCHAR(100),
    forum_channel_id    VARCHAR(20),
    fallback_channel_id VARCHAR(20),
    federated_opt_in    BOOLEAN DEFAULT false,
    owner_discord_id    VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS server_activities (
    id              BIGSERIAL PRIMARY KEY,
    server_id       BIGINT REFERENCES servers(id) ON DELETE CASCADE,
    activity_id     BIGINT REFERENCES activities(id) ON DELETE CASCADE,
    forum_tag_id    VARCHAR(20),
    UNIQUE(server_id, activity_id)
);

CREATE TABLE IF NOT EXISTS session_requests (
    id                  BIGSERIAL PRIMARY KEY,
    creator_id          BIGINT REFERENCES users(id),
    activity_id         BIGINT REFERENCES activities(id),
    server_id           BIGINT REFERENCES servers(id),
    is_federated        BOOLEAN DEFAULT false,
    filters              JSONB DEFAULT '{}',
    status               VARCHAR(20) DEFAULT 'open',
    discord_thread_id   VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT now(),
    expires_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS matches (
    id                      BIGSERIAL PRIMARY KEY,
    session_request_id     BIGINT REFERENCES session_requests(id),
    matched_at              TIMESTAMPTZ DEFAULT now(),
    status                   VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS match_participants (
    id          BIGSERIAL PRIMARY KEY,
    match_id    BIGINT REFERENCES matches(id) ON DELETE CASCADE,
    user_id     BIGINT REFERENCES users(id),
    UNIQUE(match_id, user_id)
);

CREATE TABLE IF NOT EXISTS endorsements (
    id              BIGSERIAL PRIMARY KEY,
    match_id        BIGINT REFERENCES matches(id),
    from_user_id    BIGINT REFERENCES users(id),
    to_user_id      BIGINT REFERENCES users(id),
    tag             VARCHAR(30) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, from_user_id, to_user_id, tag)
);

CREATE TABLE IF NOT EXISTS reputation_summary (
    user_id             BIGINT NOT NULL REFERENCES users(id),
    activity_id         BIGINT REFERENCES activities(id),
    total_sessions      INT DEFAULT 0,
    positive_tags       INT DEFAULT 0,
    negative_tags       INT DEFAULT 0,
    score               NUMERIC(3,2) DEFAULT 0,
    last_updated        TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, activity_id)
);

-- Useful indexes for matching queries
CREATE INDEX IF NOT EXISTS idx_session_requests_activity_status
    ON session_requests(activity_id, status);
CREATE INDEX IF NOT EXISTS idx_session_requests_server
    ON session_requests(server_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_profiles_activity
    ON user_activity_profiles(activity_id);

-- Widen icon column to fit full URLs (was VARCHAR(50), too short)
ALTER TABLE activities ALTER COLUMN icon TYPE TEXT;

-- ============================================
-- Seed: first activity type — EuroTruck Simulator 2 Convoy
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, icon, field_schema)
VALUES (
    'ets2_convoy',
    'EuroTruck Simulator 2 - Convoy',
    'EuroTruck Simulator 2',
    '#378ADD',
    'https://cdn.akamai.steamstatic.com/steam/apps/227300/header.jpg',
    '{
        "fields": [
            {"key": "route", "type": "text", "label": "Route", "placeholder": "e.g. Berlin -> Rotterdam"},
            {"key": "server", "type": "select", "label": "Server", "options": ["EU2", "EU1", "Promods EU2"]},
            {"key": "mood", "type": "select", "label": "Pace", "options": ["Chill / no rush", "Timed delivery", "Roleplay"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    icon = EXCLUDED.icon,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Star Citizen activities — tests grouping with several
-- sub-activities under the same game_group. No icon: Star Citizen
-- isn't sold on Steam, so no safe official hotlink URL is available yet.
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES
(
    'sc_mining',
    'Star Citizen - Mining',
    'Star Citizen',
    '#D4A017',
    '{
        "fields": [
            {"key": "ship", "type": "text", "label": "Ship", "placeholder": "e.g. Prospector, Mole, ROC"},
            {"key": "location", "type": "text", "label": "Location", "placeholder": "e.g. Aaron Halo, Daymar"},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
),
(
    'sc_salvage',
    'Star Citizen - Salvage',
    'Star Citizen',
    '#8A8578',
    '{
        "fields": [
            {"key": "ship", "type": "text", "label": "Ship", "placeholder": "e.g. Reclaimer, Vulture"},
            {"key": "location", "type": "text", "label": "Location"},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
),
(
    'sc_pvp',
    'Star Citizen - PvP',
    'Star Citizen',
    '#C13B3B',
    '{
        "fields": [
            {"key": "ship_class", "type": "text", "label": "Ship class", "placeholder": "e.g. Fighter, Bomber"},
            {"key": "theater", "type": "select", "label": "Theater", "options": ["Stanton", "Pyro"]},
            {"key": "fleet_size", "type": "slots", "label": "Fleet size needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Black Desert Online
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, icon, field_schema)
VALUES
(
    'bdo_pvp',
    'Black Desert - PvP / Node War',
    'Black Desert Online',
    '#D4537E',
    'https://cdn.akamai.steamstatic.com/steam/apps/582660/header.jpg',
    '{
        "fields": [
            {"key": "class", "type": "text", "label": "Class", "placeholder": "e.g. Ranger, Warrior, Witch"},
            {"key": "ap_dp", "type": "text", "label": "AP / DP", "placeholder": "e.g. 280/340"},
            {"key": "server", "type": "select", "label": "Server", "options": ["EU", "NA"]}
        ]
    }'
),
(
    'bdo_farm',
    'Black Desert - Farm / Grind',
    'Black Desert Online',
    '#5DCAA5',
    'https://cdn.akamai.steamstatic.com/steam/apps/582660/header.jpg',
    '{
        "fields": [
            {"key": "class", "type": "text", "label": "Class", "placeholder": "e.g. Ranger, Warrior, Witch"},
            {"key": "area", "type": "text", "label": "Area", "placeholder": "e.g. Bashim Base, Sycraia"},
            {"key": "server", "type": "select", "label": "Server", "options": ["EU", "NA"]}
        ]
    }'
),
(
    'bdo_guild',
    'Black Desert - Guild Recruitment',
    'Black Desert Online',
    '#F0997B',
    'https://cdn.akamai.steamstatic.com/steam/apps/582660/header.jpg',
    '{
        "fields": [
            {"key": "role_needed", "type": "text", "label": "Role needed", "placeholder": "e.g. Tank, Healer, DPS"},
            {"key": "guild_name", "type": "text", "label": "Guild name"},
            {"key": "commitment", "type": "select", "label": "Commitment", "options": ["Casual", "Hardcore"]}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    icon = EXCLUDED.icon,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Valorant (Riot exclusive - no Steam listing, no icon)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'valorant_competitive',
    'Valorant - Competitive',
    'Valorant',
    '#EB5757',
    '{
        "fields": [
            {"key": "rank", "type": "text", "label": "Rank", "placeholder": "e.g. Gold 2"},
            {"key": "role", "type": "select", "label": "Role", "options": ["Duelist", "Controller", "Initiator", "Sentinel"]},
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Competitive", "Unrated", "Swiftplay"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Apex Legends
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, icon, field_schema)
VALUES (
    'apex_squad',
    'Apex Legends - Squad',
    'Apex Legends',
    '#C0392B',
    'https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg',
    '{
        "fields": [
            {"key": "rank", "type": "text", "label": "Rank", "placeholder": "e.g. Platinum 3"},
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Ranked", "Casual", "Mixtape"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    icon = EXCLUDED.icon,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Counter-Strike 2
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, icon, field_schema)
VALUES (
    'cs2_competitive',
    'Counter-Strike 2 - Competitive',
    'Counter-Strike 2',
    '#E1A83C',
    'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
    '{
        "fields": [
            {"key": "rank", "type": "text", "label": "Rank", "placeholder": "e.g. Legendary Eagle"},
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Premier", "Competitive", "Casual"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    icon = EXCLUDED.icon,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: League of Legends (Riot exclusive - no Steam listing, no icon)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'lol_ranked',
    'League of Legends - Ranked',
    'League of Legends',
    '#2FA8A0',
    '{
        "fields": [
            {"key": "rank", "type": "text", "label": "Rank", "placeholder": "e.g. Gold 2"},
            {"key": "role", "type": "select", "label": "Role", "options": ["Top", "Jungle", "Mid", "ADC", "Support"]},
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Ranked Solo", "Ranked Flex", "Normal"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: World of Warcraft (Battle.net exclusive - no Steam listing, no icon)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'wow_group',
    'World of Warcraft - Group Content',
    'World of Warcraft',
    '#8B3A9E',
    '{
        "fields": [
            {"key": "role", "type": "select", "label": "Role", "options": ["Tank", "Healer", "DPS"]},
            {"key": "content", "type": "select", "label": "Content", "options": ["Raid", "Mythic+", "PvP"]},
            {"key": "ilvl", "type": "text", "label": "Item level"},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: D&D 5th Edition (tabletop, no icon)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'dnd_5e',
    'D&D 5th Edition',
    'Tabletop RPG',
    '#D85A30',
    '{
        "fields": [
            {"key": "role", "type": "select", "label": "Role", "options": ["Dungeon Master", "Player"]},
            {"key": "system", "type": "text", "label": "System", "placeholder": "e.g. 5th Edition"},
            {"key": "schedule", "type": "text", "label": "Schedule", "placeholder": "e.g. Wednesdays 21:00"},
            {"key": "campaign_length", "type": "select", "label": "Campaign length", "options": ["One-shot", "Short campaign", "Long campaign"]}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;

-- ============================================
-- Seed: Call of Duty (no icon - specific title/platform varies too much
-- to safely link one official artwork)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'cod_multiplayer',
    'Call of Duty - Multiplayer',
    'Call of Duty',
    '#5A6B47',
    '{
        "fields": [
            {"key": "title", "type": "text", "label": "Title", "placeholder": "e.g. Modern Warfare 3, Warzone"},
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Multiplayer", "Warzone", "Ranked"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    game_group = EXCLUDED.game_group,
    accent_color = EXCLUDED.accent_color,
    field_schema = EXCLUDED.field_schema;
