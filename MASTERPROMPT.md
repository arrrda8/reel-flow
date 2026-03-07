# ReelFlow – Claude Code Prompt

## Projektbeschreibung

Baue **ReelFlow** – eine vollständige Web-Plattform zur Erstellung von Faceless Videos (z.B. Zitat-Videos, Motivationsvideos, Drohnenaufnahmen mit Voice Over). Die Plattform führt den Nutzer Schritt für Schritt durch den gesamten Prozess: von der Idee über das Skript, die Bild- und Videogenerierung, Voice Over, Hintergrundmusik bis zum fertigen Video mit Untertiteln.

Du entscheidest selbst über Technologie-Stack, Architektur, Datenbank, Frontend-Framework und alle technischen Implementierungsdetails. Dieser Prompt beschreibt ausschließlich WAS gebaut werden soll, nicht WIE.

---

## Kern-Workflow (Step-by-Step Wizard)

Der Nutzer wird durch einen geführten Workflow geleitet. Jeder Schritt muss abgeschlossen sein, bevor der nächste beginnt. Der Nutzer kann jederzeit zu vorherigen Schritten zurückspringen und Änderungen vornehmen.

### Step 1: Projekt-Setup

- Projektname vergeben
- Zielplattform auswählen: YouTube (16:9), YouTube Shorts (9:16), Instagram Reels (9:16), TikTok (9:16), Custom
- Aspect Ratio wird automatisch aus der Plattform abgeleitet, kann aber manuell überschrieben werden
- Geschätzte Gesamtlänge des Videos angeben (z.B. 30s, 60s, 3min)
- Style Preset auswählen (siehe Abschnitt "Style Presets")

### Step 2: Idee & Konzept

- Texteingabe für die Video-Idee (Freitext)
- Die Plattform analysiert die Idee und stellt intelligente Rückfragen:
  - Zielgruppe?
  - Tonalität (motivierend, informativ, dramatisch, ruhig)?
  - Kernbotschaft?
  - Besondere Wünsche?
- Aus den Antworten wird ein strukturiertes Treatment/Konzept generiert
- Der Nutzer kann das Konzept überarbeiten oder bestätigen

### Step 3: Skript-Generierung

- Aus dem bestätigten Konzept wird ein szenenbasiertes Skript generiert
- Jede Szene enthält:
  - Szenen-Nummer
  - Narrations-Text (was gesprochen wird)
  - Visuelle Beschreibung (was im Bild zu sehen sein soll)
  - Geschätzte Dauer
  - Mood/Stimmung (für Musik-Zuordnung)
- Das Skript wird in einem strukturierten JSON-Format gespeichert
- Der Nutzer kann:
  - Szenen bearbeiten, hinzufügen, löschen, umsortieren
  - Den Narrations-Text anpassen
  - Die visuelle Beschreibung anpassen

### Step 4: Voice Over Generierung

- Integration mit **ElevenLabs API**
- Vor der Generierung: Stimmen-Auswahl über die Oberfläche
  - Öffentliche Stimmen aus der ElevenLabs-Bibliothek durchsuchen und vorhören
  - Eigene/geklonte Stimmen des Nutzers anzeigen
  - Stimme pro Projekt auswählen (eine Stimme für das gesamte Video)
- Voice Over wird pro Szene einzeln generiert
- Nach der Generierung:
  - Jede Szene einzeln vorhören
  - Einzelne Szenen bei Bedarf neu generieren (Retry)
  - Die exakte Dauer jedes Voice-Over-Clips wird gespeichert – sie bestimmt die Video-Länge der jeweiligen Szene

**ElevenLabs API Details:**
- API Key wird vom Nutzer in den Einstellungen hinterlegt
- Endpoints: `/v1/voices` (Stimmen laden), `/v1/text-to-speech/{voice_id}` (Generierung)
- Unterstützte Einstellungen: Stability, Similarity Boost, Style, Speaker Boost

### Step 5: Bild-Prompt Review (Optional)

- Dieser Schritt ist **optional und per Toggle aktivierbar**
- Wenn aktiviert: Der Nutzer sieht für jede Szene den automatisch generierten Bild-Prompt
- Prompts können einzeln bearbeitet und verfeinert werden
- Wenn deaktiviert: Prompts werden automatisch aus dem Skript generiert und direkt an die Bild-API gesendet
- Die Prompts müssen dem Style Preset folgen und konsistent sein (gleicher Stil über alle Szenen)

### Step 6: Bildgenerierung

- Integration mit **Nanobanana 2** (nutzt Gemini API)
- Pro Szene werden Bilder generiert basierend auf:
  - Dem Bild-Prompt (aus Step 5 oder automatisch)
  - Dem gewählten Style Preset
  - Dem Aspect Ratio aus Step 1
- Varianten-System:
  - Pro Szene werden 2-3 Varianten generiert
  - Der Nutzer wählt die beste Variante aus
  - Einzelne Szenen können mit angepasstem Prompt neu generiert werden
- Die Prompts müssen im korrekten JSON-Format für die Nanobanana API geschrieben werden

**Nanobanana API Details:**
- Nutzt einen Gemini API Key (wird in den Einstellungen hinterlegt)
- Die Plattform muss die Prompts im von Nanobanana erwarteten JSON-Format generieren
- Aspect Ratio muss korrekt übergeben werden

### Step 7: Video-Generierung (Image-to-Video)

- Integration mit **Kling API** (oder kompatible Image-to-Video API)
- Jedes ausgewählte Bild aus Step 6 wird zu einem Video-Clip animiert
- Die Dauer des Clips orientiert sich an der Voice-Over-Dauer der jeweiligen Szene
- **Frame-Continuity für lange Szenen:**
  - Wenn eine Szene länger als 10-15 Sekunden ist (weil das Voice Over länger dauert als ein einzelner Video-Clip):
    1. Generiere Video-Clip 1 aus dem Originalbild
    2. Extrahiere den letzten Frame von Clip 1
    3. Nutze diesen Frame als Startbild für Clip 2 (Image-to-Video)
    4. Wiederhole bis die gewünschte Gesamtdauer erreicht ist
    5. Die Clips werden nahtlos zusammengefügt
- Queue/Batch-Processing:
  - Alle Video-Clips werden parallel in eine Queue geschickt
  - Fortschrittsanzeige pro Clip
  - Geschätzte Gesamtdauer der Generierung anzeigen
- Retry-Möglichkeit pro Clip

**Kling API Details:**
- API Key wird in den Einstellungen hinterlegt
- Image-to-Video Endpoint
- Die API liefert asynchrone Ergebnisse (Polling oder Callback)

### Step 8: Musik & Audio

- Hintergrundmusik pro Szene oder für das gesamte Video zuweisen
- Musikquellen:
  - Eigene Uploads (MP3, WAV)
  - Integrierte Library mit lizenzfreier Musik (eine Sammlung von mitgelieferten Tracks, kategorisiert nach Mood/Genre)
- Audio-Ducking: Musik wird automatisch leiser wenn Voice Over spricht
- Lautstärke-Verhältnis (Voice vs. Musik) einstellbar
- Fade In/Fade Out für Musik an Szenen-Übergängen

### Step 9: Untertitel

- Automatische Generierung von Untertiteln aus dem Narrations-Text des Skripts
- Zeitliche Synchronisation mit dem Voice Over
- Styling-Optionen:
  - Schriftart, Größe, Farbe
  - Position (unten, mitte, oben)
  - Hintergrund/Box (transparent, halbtransparent, solid)
  - Animations-Stil (Wort-für-Wort Highlight, Einblenden, etc.)
- Untertitel können manuell korrigiert werden
- Export als separate SRT-Datei möglich

### Step 10: Preview & Finales Rendering

- **Preview-Modus (schnell, kostenlos):**
  - Slideshow aus den generierten Bildern + Voice Over als schnelle Vorschau
  - Zeigt Timing, Szenen-Übergänge und Audio-Mix
  - Kein aufwändiges Video-Rendering nötig
- **Finales Rendering:**
  - Zusammenführung aller Assets über **FFmpeg**:
    - Video-Clips zusammenschneiden
    - Voice Over synchron auf die Video-Spur legen
    - Hintergrundmusik mit Ducking einmischen
    - Untertitel einbrennen (Hardcoded) oder als separate Spur
    - Transitions zwischen Szenen (Cut, Fade, Crossfade)
  - Export-Optionen:
    - Qualität: 720p, 1080p, 4K
    - Format: MP4 (H.264), WebM
    - Nur Audio exportieren (MP3)
    - Nur Bilder exportieren (ZIP)
    - Nur Untertitel exportieren (SRT)
  - Fortschrittsanzeige während des Renderings

---

## Style Presets

Vordefinierte visuelle Stile die den gesamten Look des Videos bestimmen. Jedes Preset beeinflusst:
- Die Bild-Prompts (Nanobanana): Stil-Beschreibung wird automatisch in jeden Prompt integriert
- Die Transitions und Overlays im finalen Video
- Die Standard-Untertitel-Optik

Beispiel-Presets (erweiterbar):
- **Cinematic**: Filmische Farben, Letterbox, dramatische Beleuchtung
- **Minimalist**: Cleane Ästhetik, viel Weißraum, sanfte Töne
- **Dark & Moody**: Dunkle Farbpalette, Kontrast, Schatten
- **Nature Documentary**: Natürliche Farben, weiche Übergänge
- **Neon/Cyberpunk**: Leuchtende Farben, urbaner Look
- **Vintage/Retro**: Filmkorn, warme Töne, Vignette
- **Abstract/Artistic**: Abstrakte Formen, künstlerische Interpretationen

Nutzer können eigene Presets erstellen und speichern (Name + Style-Prompt-Suffix + Transition-Typ + Untertitel-Stil).

---

## Projekt-Persistenz

- Jedes Video-Projekt wird vollständig gespeichert (alle Daten, Einstellungen, generierte Assets)
- Projekte können jederzeit geöffnet, fortgesetzt und bearbeitet werden
- Einzelne Szenen können nachträglich neu generiert werden (Bild, Video, Voice Over) ohne das gesamte Projekt zu verlieren
- Projektliste als Dashboard mit Thumbnail, Name, Status, Erstelldatum
- Projekt-Status: Draft, In Progress, Rendering, Completed
- Projekte können dupliziert werden (als Vorlage für neue Videos)

---

## Admin Panel

Separater Bereich mit:

### API Key Management
- ElevenLabs API Key eingeben und testen
- Gemini API Key (für Nanobanana) eingeben und testen
- Kling API Key eingeben und testen
- Status-Anzeige ob Keys valide sind

### Cost Tracking
- Übersicht über API-Kosten pro Projekt
- Gesamtkosten über alle Projekte
- Aufschlüsselung nach API (ElevenLabs, Gemini, Kling)
- Kosten pro Generierung loggen (basierend auf API-Responses oder geschätzt)
- Vor jeder Generierung: geschätzte Kosten anzeigen

### Musik-Library Management
- Lizenzfreie Musik-Tracks hochladen
- Tracks kategorisieren: Genre, Mood, BPM, Dauer
- Tracks vorhören und verwalten (umbenennen, löschen, Tags bearbeiten)

### Style Preset Management
- Bestehende Presets bearbeiten
- Neue Presets erstellen
- Presets aktivieren/deaktivieren

---

## Technische Anforderungen

### FFmpeg
- FFmpeg wird für alles Video/Audio-Processing genutzt
- Zusammenschneiden von Video-Clips
- Audio-Mixing (Voice Over + Musik mit Ducking)
- Untertitel einbrennen
- Transitions zwischen Szenen
- Format-Konvertierung und Qualitäts-Export
- Frame-Extraktion (letzter Frame für Continuity)

### API-Integrationen
Alle API Keys werden sicher gespeichert (nicht im Frontend sichtbar). Alle API-Calls laufen über das Backend.

| API | Zweck | Auth |
|-----|-------|------|
| ElevenLabs | Text-to-Speech / Voice Over | API Key |
| Gemini (Nanobanana) | Bildgenerierung | API Key |
| Kling | Image-to-Video | API Key |

### Queue System
- Video-Generierung (Kling) ist asynchron und kann mehrere Minuten dauern
- Alle Generierungs-Aufträge kommen in eine Queue
- Parallele Verarbeitung wo möglich
- Fortschrittsanzeige für jeden Auftrag
- Fehlerbehandlung mit automatischem Retry-Versuch

### Responsive UI
- Die Plattform soll als Web-App laufen
- Desktop-optimiert (primär), aber mobile-friendly
- Der Wizard/Workflow soll intuitiv und übersichtlich sein
- Jeder Step zeigt klar an wo man sich befindet (Progress-Indikator)

---

## Zusammenfassung der Module

1. **Projekt-Manager** – Projekte erstellen, laden, speichern, duplizieren, löschen
2. **Konzept-Engine** – Idee analysieren, Rückfragen stellen, Treatment generieren
3. **Skript-Generator** – Treatment in szenenbasiertes Skript mit JSON-Struktur umwandeln
4. **Voice-Over-Modul** – ElevenLabs Integration, Stimmen-Browser, Generierung pro Szene
5. **Prompt-Generator** – Bild-Prompts aus Skript ableiten, Style Preset einarbeiten, optionaler Review
6. **Bildgenerierung** – Nanobanana/Gemini Integration, Varianten, Auswahl
7. **Video-Generierung** – Kling Integration, Image-to-Video, Frame-Continuity, Queue
8. **Audio-Mixer** – Musik-Zuweisung, Ducking, Lautstärke, Fade
9. **Untertitel-Engine** – Auto-Generierung aus Skript, Sync mit Audio, Styling
10. **Preview-Engine** – Schnelle Slideshow-Vorschau mit Audio
11. **Render-Engine** – FFmpeg-basiert, finales Video mit allen Assets zusammenführen
12. **Admin Panel** – API Keys, Cost Tracking, Musik-Library, Presets
