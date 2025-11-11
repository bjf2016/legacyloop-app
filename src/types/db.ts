export type UUID = string;

export type Cast = {
  id: string;
  owner_id: string;     // ← restore this
  title: string;
  created_at: string;
  updated_at: string | null;
};

export type Entry = {
  id: UUID;
  cast_id: UUID;
  user_id: UUID;           // was owner_id
  title: string | null;
  created_at: string;
  audio_path: string;      // e.g. "<user_id>/<entry_id>.mp3"  or  "<user_id>/<cast_id>/<entry_id>.mp3"
  duration_ms: number | null;
};

export type CastWithMeta = Cast & {
  entry_count: number;
  last_entry_at: string | null;
};
