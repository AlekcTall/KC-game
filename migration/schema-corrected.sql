-- =====================================================
-- ИСПРАВЛЕННАЯ СХЕМА SUPABASE ДЛЯ KC-GAMES
-- На основе реальных данных из Firestore
-- =====================================================

-- Включаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ФУНКЦИЯ ПРОВЕРКИ АДМИНА
-- =====================================================
CREATE OR REPLACE FUNCTION check_is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO is_admin
  FROM users
  WHERE uid = user_id;
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ТАБЛИЦЫ
-- =====================================================

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,  -- Firebase UID (не UUID!)
  email TEXT,
  username TEXT,
  department TEXT,
  role TEXT DEFAULT 'user',
  description TEXT,
  custom_status TEXT,
  avatar_emoji TEXT,
  active_theme TEXT DEFAULT 'light',
  points INTEGER DEFAULT 0,
  lokoin_balance INTEGER DEFAULT 0,
  show_gold_frame BOOLEAN DEFAULT false,
  show_animated_avatar BOOLEAN DEFAULT false,
  purchased_items TEXT[] DEFAULT '{}',
  owned_avatars TEXT[] DEFAULT '{}',
  easter_eggs_found TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  completed_games TEXT[] DEFAULT '{}',
  daily_login JSONB DEFAULT '{}',
  game_stats JSONB DEFAULT '{}',
  battleship_stats JSONB DEFAULT '{}',
  tictactoe_stats JSONB DEFAULT '{}',
  rps_stats JSONB DEFAULT '{}',
  game_history JSONB DEFAULT '[]',
  active_effects JSONB DEFAULT '{}',
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уведомления пользователей
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
  message TEXT,
  type TEXT,
  link TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT false
);

-- Выданные награды пользователям
CREATE TABLE IF NOT EXISTS user_awarded (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
  award_id TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  awarded_by TEXT
);

-- Товары магазина
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  price INTEGER,
  effect_type TEXT,
  effect_params JSONB,
  duration INTEGER,
  icon TEXT,
  description TEXT,
  category TEXT
);

-- Заявки на покупку
CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid),
  item_id TEXT,
  item_name TEXT,
  item_title TEXT,
  item_effect TEXT,
  price INTEGER,
  department TEXT,
  email TEXT,
  username TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  done_at TIMESTAMPTZ
);

-- Отделы
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,  -- Не UUID!
  name TEXT
);

-- Новости
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  icon TEXT,
  image_url TEXT,
  video_url TEXT,
  link TEXT,
  expire_at TIMESTAMPTZ,
  publish_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Реакции на новости
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id TEXT PRIMARY KEY,
  announcement_id TEXT REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(uid),
  emoji TEXT,
  type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Каталог игр
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,  -- Не UUID! (например, "2048", "snake")
  title TEXT,
  description TEXT,
  icon TEXT,
  url TEXT,
  hidden BOOLEAN DEFAULT false
);

-- Награды
CREATE TABLE IF NOT EXISTS awards (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  icon_url TEXT,
  lokoin_reward INTEGER
);

-- Ивенты
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT,
  type TEXT,
  icon TEXT,
  description TEXT,
  url TEXT,
  status TEXT DEFAULT 'active',
  health JSONB,
  settings JSONB,
  rewards JSONB,
  participants JSONB DEFAULT '{}',
  statistics JSONB DEFAULT '{}',
  painter_stats JSONB DEFAULT '{}',
  board_data JSONB DEFAULT '{}',
  final_stats JSONB,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вопросы квиза
CREATE TABLE IF NOT EXISTS event_questions (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  question TEXT,
  options JSONB,
  correct_index INTEGER,
  order_index INTEGER
);

-- Задачи ивента (бинго)
CREATE TABLE IF NOT EXISTS event_tasks (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  task TEXT,
  reward_points INTEGER,
  reward_lokoin INTEGER,
  completed BOOLEAN DEFAULT false
);

-- Админ-события ивента (дерево)
CREATE TABLE IF NOT EXISTS event_admin_events (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  type TEXT,
  name TEXT,
  icon TEXT,
  description TEXT,
  health_change INTEGER,
  duration INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT
);

-- Активность ивента
CREATE TABLE IF NOT EXISTS event_activity (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(uid),
  username TEXT,
  action_key TEXT,
  action_icon TEXT,
  health_boost INTEGER,
  points_reward INTEGER,
  cost_lokoin INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Настройки
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- Обращения
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(uid),
  name TEXT,
  topic TEXT,
  message TEXT,
  email TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ответы на обращения
CREATE TABLE IF NOT EXISTS feedback_replies (
  id TEXT PRIMARY KEY,
  feedback_id TEXT REFERENCES feedback(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(uid),
  text TEXT,
  is_admin BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- PvP Морской бой
CREATE TABLE IF NOT EXISTS battles (
  id TEXT PRIMARY KEY,
  participants TEXT[],
  players JSONB,
  boards JSONB,
  shots JSONB DEFAULT '{}',
  status TEXT DEFAULT 'waiting',
  turn TEXT,
  winner TEXT,
  is_ai BOOLEAN DEFAULT false,
  abandoned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  setup_deadline TIMESTAMPTZ
);

-- PvP Крестики-нолики
CREATE TABLE IF NOT EXISTS tictactoe_games (
  id TEXT PRIMARY KEY,
  participants TEXT[],
  players JSONB,
  board JSONB,
  status TEXT DEFAULT 'waiting',
  turn TEXT,
  winner TEXT,
  is_ai BOOLEAN DEFAULT false,
  ai_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PvP Камень-ножницы-бумага
CREATE TABLE IF NOT EXISTS rps_games (
  id TEXT PRIMARY KEY,
  participants TEXT[],
  players JSONB,
  current_round JSONB DEFAULT '{}',
  rounds_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'waiting',
  winner TEXT,
  is_ai BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица лидербордов (денормализованная для производительности)
CREATE TABLE IF NOT EXISTS leaderboards (
  user_id TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  username TEXT,
  points INTEGER DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ИНДЕКСЫ
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_awarded_user_id ON user_awarded(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON announcements(publish_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_event_questions_event_id ON event_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_activity_event_id ON event_activity(event_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_tictactoe_games_status ON tictactoe_games(status);
CREATE INDEX IF NOT EXISTS idx_rps_games_status ON rps_games(status);
CREATE INDEX IF NOT EXISTS idx_leaderboards_points ON leaderboards(points DESC);

-- =====================================================
-- RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_awarded ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tictactoe_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rps_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Users: чтение всем, запись только себе или админу
CREATE POLICY "Users read all" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users update own" ON users
  FOR UPDATE USING (
    auth.uid()::TEXT = uid OR check_is_admin(auth.uid()::TEXT)
  );

CREATE POLICY "Users insert own" ON users
  FOR INSERT WITH CHECK (auth.uid()::TEXT = uid);

-- Notifications: только владелец видит свои
CREATE POLICY "Notifications owner read" ON user_notifications
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Notifications owner update" ON user_notifications
  FOR UPDATE USING (auth.uid()::TEXT = user_id OR check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Notifications admin insert" ON user_notifications
  FOR INSERT WITH CHECK (check_is_admin(auth.uid()::TEXT));

-- Awarded: чтение всем, запись только админам
CREATE POLICY "Awarded read all" ON user_awarded
  FOR SELECT USING (true);

CREATE POLICY "Awarded admin write" ON user_awarded
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Shop items: чтение всем, запись админам
CREATE POLICY "Shop items read all" ON shop_items
  FOR SELECT USING (true);

CREATE POLICY "Shop items admin write" ON shop_items
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Purchase requests: создание любому, чтение/обновление админам
CREATE POLICY "Purchase requests create" ON purchase_requests
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Purchase requests admin read" ON purchase_requests
  FOR SELECT USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Purchase requests admin update" ON purchase_requests
  FOR UPDATE USING (check_is_admin(auth.uid()::TEXT));

-- Departments: чтение всем, запись админам
CREATE POLICY "Departments read all" ON departments
  FOR SELECT USING (true);

CREATE POLICY "Departments admin write" ON departments
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Announcements: чтение всем, запись админам
CREATE POLICY "Announcements read all" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "Announcements admin write" ON announcements
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Announcement reactions: чтение авторизованным, запись только себе
CREATE POLICY "Reactions read authenticated" ON announcement_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Reactions owner write" ON announcement_reactions
  FOR ALL USING (auth.uid()::TEXT = user_id);

-- Games: чтение всем, запись админам
CREATE POLICY "Games read all" ON games
  FOR SELECT USING (true);

CREATE POLICY "Games admin write" ON games
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Awards: чтение авторизованным, запись админам
CREATE POLICY "Awards read authenticated" ON awards
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Awards admin write" ON awards
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Events: чтение/запись авторизованным, вопросы/задачи - только админам
CREATE POLICY "Events read authenticated" ON events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Events write authenticated" ON events
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event questions read authenticated" ON event_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event questions admin write" ON event_questions
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Event tasks read authenticated" ON event_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event tasks admin write" ON event_tasks
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Event admin events read authenticated" ON event_admin_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event admin events admin write" ON event_admin_events
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Event activity read authenticated" ON event_activity
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Event activity create authenticated" ON event_activity
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Settings: чтение всем, запись админам
CREATE POLICY "Settings read all" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Settings admin write" ON settings
  FOR ALL USING (check_is_admin(auth.uid()::TEXT));

-- Feedback: создание любому, остальное админам
CREATE POLICY "Feedback create" ON feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Feedback admin read" ON feedback
  FOR SELECT USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Feedback admin update" ON feedback
  FOR UPDATE USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Feedback admin delete" ON feedback
  FOR DELETE USING (check_is_admin(auth.uid()::TEXT));

-- Feedback replies: чтение админам, создание автору или админу
CREATE POLICY "Feedback replies admin read" ON feedback_replies
  FOR SELECT USING (check_is_admin(auth.uid()::TEXT));

CREATE POLICY "Feedback replies create" ON feedback_replies
  FOR INSERT WITH CHECK (
    check_is_admin(auth.uid()::TEXT) OR 
    EXISTS (SELECT 1 FROM feedback WHERE id = feedback_id AND user_id = auth.uid()::TEXT)
  );

-- Battles: чтение/создание авторизованным, обновление участникам
CREATE POLICY "Battles read authenticated" ON battles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Battles create authenticated" ON battles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Battles update participants" ON battles
  FOR UPDATE USING (
    auth.uid()::TEXT = ANY(participants) OR check_is_admin(auth.uid()::TEXT)
  );

CREATE POLICY "Battles admin delete" ON battles
  FOR DELETE USING (check_is_admin(auth.uid()::TEXT));

-- Tictactoe games: аналогично battles
CREATE POLICY "Tictactoe read authenticated" ON tictactoe_games
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Tictactoe create authenticated" ON tictactoe_games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Tictactoe update participants" ON tictactoe_games
  FOR UPDATE USING (
    auth.uid()::TEXT = ANY(participants) OR check_is_admin(auth.uid()::TEXT)
  );

CREATE POLICY "Tictactoe admin delete" ON tictactoe_games
  FOR DELETE USING (check_is_admin(auth.uid()::TEXT));

-- RPS games: аналогично battles
CREATE POLICY "RPS read authenticated" ON rps_games
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "RPS create authenticated" ON rps_games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "RPS update participants" ON rps_games
  FOR UPDATE USING (
    auth.uid()::TEXT = ANY(participants) OR check_is_admin(auth.uid()::TEXT)
  );

CREATE POLICY "RPS admin delete" ON rps_games
  FOR DELETE USING (check_is_admin(auth.uid()::TEXT));

-- Leaderboards: чтение всем
CREATE POLICY "Leaderboards read all" ON leaderboards
  FOR SELECT USING (true);

-- =====================================================
-- REALTIME
-- =====================================================
-- Включаем realtime для игровых таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE tictactoe_games;
ALTER PUBLICATION supabase_realtime ADD TABLE rps_games;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- =====================================================
-- ТРИГГЕРЫ
-- =====================================================

-- Триггер для обновления leaderboard при изменении points у пользователя
CREATE OR REPLACE FUNCTION update_leaderboard_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO leaderboards (user_id, username, points, updated_at)
  VALUES (NEW.uid, NEW.username, NEW.points, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    username = NEW.username,
    points = NEW.points,
    updated_at = NOW();
  
  -- Пересчитываем ранги
  WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY points DESC) as new_rank
    FROM leaderboards
  )
  UPDATE leaderboards l
  SET rank = r.new_rank
  FROM ranked r
  WHERE l.user_id = r.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_entry();

-- Триггер для установки updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- VIEW ДЛЯ ПУБЛИЧНОГО ПРОФИЛЯ
-- =====================================================
CREATE OR REPLACE VIEW public_profile AS
SELECT 
  uid,
  username,
  department,
  role,
  description,
  custom_status,
  avatar_emoji,
  active_theme,
  points,
  achievements,
  completed_games,
  show_gold_frame,
  show_animated_avatar,
  created_at
FROM users;

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================
-- Добавляем настройки по умолчанию
INSERT INTO settings (key, value) VALUES
  ('maintenance', '{"enabled": false, "message": ""}'),
  ('cacheVersion', '{"version": 0}')
ON CONFLICT (key) DO NOTHING;
