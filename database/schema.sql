-- ============================================
-- Mojo Party Bot - Database Schema v1
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
-- Seed: first activity type - EuroTruck Simulator 2 Convoy
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
            {"key": "server", "type": "select", "label": "Server", "options": ["Simulation 1", "Simulation 2", "[SGP] Simulation", "Arcade", "ProMods Simulation", "ProMods Arcade", "Event Server"]},
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
-- Seed: EuroTruck Simulator 2 - VTC.World
-- (VTC.World is a separate platform/client layered on top of TruckersMP,
-- with its own gameplay modes, profile system, and events - distinct
-- from plain TruckersMP servers.)
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, icon, field_schema)
VALUES (
    'ets2_vtc_world',
    'EuroTruck Simulator 2 - VTC.World',
    'EuroTruck Simulator 2',
    '#5A8F3D',
    'https://cdn.akamai.steamstatic.com/steam/apps/227300/header.jpg',
    '{
        "fields": [
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Vanilla", "Simplified", "Simulation"]},
            {"key": "route", "type": "text", "label": "Route", "placeholder": "e.g. Berlin -> Rotterdam"},
            {"key": "vtc_name", "type": "text", "label": "VTC name (optional)"},
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
-- Seed: Star Citizen activities - tests grouping with several
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
            {"key": "ship", "type": "select", "label": "Ship", "options": ["Prospector", "MOLE", "Orion", "ROC (ground)"]},
            {"key": "location", "type": "text", "label": "Location", "placeholder": "e.g. Aaron Halo, Daymar"},
            {"key": "roles_needed", "type": "text", "label": "Roles needed", "placeholder": "e.g. 2x Laser Operator, 1x Co-pilot"},
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
            {"key": "ship", "type": "select", "label": "Ship", "options": ["Vulture", "Reclaimer"]},
            {"key": "location", "type": "text", "label": "Location"},
            {"key": "roles_needed", "type": "text", "label": "Roles needed", "placeholder": "e.g. 2x Salvage Operator, 1x Cargo Technician"},
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
            {"key": "theater", "type": "select", "label": "Theater", "options": ["Stanton", "Pyro", "Nyx"]},
            {"key": "fleet_size", "type": "slots", "label": "Fleet size needed"}
        ]
    }'
),
(
    'sc_exploration',
    'Star Citizen - Exploration',
    'Star Citizen',
    '#3E8EA8',
    '{
        "fields": [
            {"key": "ship", "type": "text", "label": "Ship", "placeholder": "e.g. Carrack, Terrapin, 600i"},
            {"key": "region", "type": "select", "label": "Region", "options": ["Stanton", "Pyro", "Nyx", "Unexplored / Frontier"]},
            {"key": "roles_needed", "type": "text", "label": "Roles needed", "placeholder": "e.g. Co-pilot, Scanning Operator"},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
),
(
    'sc_bounty_pve',
    'Star Citizen - Bounty Hunting',
    'Star Citizen',
    '#B8792B',
    '{
        "fields": [
            {"key": "ship_class", "type": "text", "label": "Ship class", "placeholder": "e.g. Gladius, Vanguard, Hawk"},
            {"key": "difficulty", "type": "select", "label": "Difficulty", "options": ["Low threat", "Medium threat", "High threat"]},
            {"key": "region", "type": "select", "label": "Region", "options": ["Stanton", "Pyro", "Nyx"]},
            {"key": "slots_needed", "type": "slots", "label": "Slots needed"}
        ]
    }'
),
(
    'sc_bunker',
    'Star Citizen - Bunker Mission',
    'Star Citizen',
    '#7A2E2E',
    '{
        "fields": [
            {"key": "mission_type", "type": "select", "label": "Mission type", "options": ["Assist Security", "Retake"]},
            {"key": "region", "type": "select", "label": "Region", "options": ["Stanton", "Pyro", "Nyx"]},
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
            {"key": "archetype", "type": "select", "label": "Archetype", "options": ["Tank", "DPS", "Mage", "Support"]},
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
            {"key": "archetype", "type": "select", "label": "Archetype", "options": ["Tank", "DPS", "Mage", "Support"]},
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
            {"key": "role_needed", "type": "select", "label": "Role needed", "options": ["Tank", "DPS", "Mage", "Support"]},
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
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Competitive", "Unrated", "Swiftplay", "Premier"]},
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
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Ranked", "Unranked", "Mixtape", "Wildcard"]},
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
            {"key": "mode", "type": "select", "label": "Mode", "options": ["Ranked Solo/Duo", "Ranked Flex", "Normal"]},
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
            {"key": "class", "type": "select", "label": "Class", "options": ["Warrior", "Paladin", "Hunter", "Rogue", "Priest", "Death Knight", "Shaman", "Mage", "Warlock", "Monk", "Druid", "Demon Hunter", "Evoker"]},
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
            {"key": "system", "type": "text", "label": "System", "placeholder": "e.g. 5th Edition (2014), 5th Edition (2024 revised)"},
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
            {"key": "title", "type": "text", "label": "Title", "placeholder": "e.g. Black Ops 7, Warzone, Modern Warfare 4"},
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

-- ============================================
-- Seed: Custom Game (fallback / safety net)
--
-- Covers any game not yet added to the database with proper research
-- (real servers, classes, modes, etc). Every field is free text since
-- we can't know a given game's structured options in advance, so this
-- activity gets no compatibility-based matching and no thumbnail. It's
-- meant to be a temporary stand-in, not a permanent substitute for
-- adding the game properly - see CONTRIBUTING.md for how to request
-- a new game.
-- ============================================
INSERT INTO activities (slug, display_name, game_group, accent_color, field_schema)
VALUES (
    'custom_game',
    'Custom Game',
    'Custom Game',
    '#6B7280',
    '{
        "fields": [
            {"key": "game_name", "type": "text", "label": "Game name", "placeholder": "e.g. Sea of Thieves"},
            {"key": "activity_type", "type": "text", "label": "Activity type", "placeholder": "e.g. PvP, Co-op grinding, Raid"},
            {"key": "details", "type": "text", "label": "Details", "placeholder": "e.g. Need 2 more for crew, EU server"},
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
-- New activity notifications: lets us DM server owners when a new
-- activity is added to the database, without auto-activating anything
-- on their server (they still choose via /setup or /setup-game).
-- ============================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS notified BOOLEAN NOT NULL DEFAULT false;

-- One-time backfill: activities that already existed before this feature
-- shipped shouldn't retroactively DM every server owner. Only activities
-- inserted after this cutoff are genuinely "new" and should trigger a DM.
-- Safe to re-run: rows created after the cutoff are never touched here,
-- so they keep notified = false until the notification job processes them.
UPDATE activities SET notified = true
WHERE created_at < '2026-07-13 00:00:00+00' AND notified = false;

-- ============================================
-- Per-activity channel storage: lets a server post different activities
-- to different channels (e.g. a separate forum per game category),
-- instead of one shared channel for the whole server. Previously
-- servers.forum_channel_id / fallback_channel_id were server-wide,
-- which meant activating a second game silently overwrote the first
-- game's channel.
-- ============================================
ALTER TABLE server_activities ADD COLUMN IF NOT EXISTS channel_id VARCHAR(20);
ALTER TABLE server_activities ADD COLUMN IF NOT EXISTS is_forum BOOLEAN;
