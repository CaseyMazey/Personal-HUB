// =========================
// SYNC-KONFIGURATION — VORLAGE
// Nook ist ein offenes Projekt — jeder kann sich seine eigene Instanz mit
// eigenem Geräte-Sync aufsetzen, ohne den Kern-Code (js/sync.js) anfassen
// zu müssen.
//
// So richtest du deinen eigenen Sync ein:
//   1. Kostenloses Projekt auf https://supabase.com anlegen
//   2. Im SQL Editor das Schema aus der Projekt-Doku ausführen
//      (Tabelle kv_store + Row-Level-Security-Policy + Realtime)
//   3. Unter Project Settings → API: Project URL und den
//      "Publishable"/"anon"-Key kopieren (NICHT den "Secret"-Key!)
//   4. Diese Datei kopieren zu "sync-config.js" (liegt im selben
//      Ordner) und die beiden Werte unten eintragen
//
// sync-config.js ist in .gitignore eingetragen — deine eigenen
// Zugangsdaten landen dadurch nie im Git-Repo.
// =========================

const SUPABASE_URL = "https://DEIN-PROJEKT.supabase.co";
const SUPABASE_ANON_KEY = "DEIN-PUBLISHABLE-KEY";
