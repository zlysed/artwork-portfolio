# jakobaeis – Portfolio

Next.js-Seite (App Router) für Vercel. Die Artworks hängen als „Wheatpaste-Wand“ an der Wand,
dein Admin liegt unter `/admin`.

## In 5 Schritten live

1. **Projekt zu Vercel bringen**
   Ordner in ein GitHub-Repo pushen und bei vercel.com „Add New → Project“ wählen
   (oder im Ordner `npx vercel` ausführen). Framework wird automatisch als Next.js erkannt.
2. **Blob Store anlegen** (hier landen deine Uploads)
   Vercel Dashboard → dein Projekt → *Storage* → *Create* → **Blob** → Access: **Public** → mit dem Projekt verbinden.
   Vercel setzt `BLOB_READ_WRITE_TOKEN` dann automatisch.
3. **Passwort setzen**
   Projekt → *Settings → Environment Variables*:
   - `ADMIN_PASSWORD` = ein langes, einzigartiges Passwort
   - `AUTH_SECRET` = beliebiger langer Zufallstext (optional, aber empfohlen)
4. **Neu deployen** (Deployments → ⋯ → Redeploy), damit die Variablen greifen.
5. **`/admin` öffnen**, einloggen, Bilder reinziehen. Fertig.

## Was der Admin kann

- Mehrere Bilder per Drag & Drop oder Dateiauswahl hochladen (PNG, JPG, WebP, GIF, AVIF)
- Beim Upload optional auf 2400 px verkleinern und zu WebP umwandeln (schnellere Seite)
- Titel, Kategorie und Jahr ändern, Reihenfolge ändern, Werke entfernen
- Kategorien erscheinen automatisch als Filter oben auf der Seite

Neue Uploads stehen oben links auf der Wand. Beim ersten Speichern übernimmt der Blob Store die Liste;
die 7 mitgelieferten Werke kannst du im Admin genauso bearbeiten oder entfernen.

## Anpassen

- Name, Instagram-Handle und Untertitel: `lib/site.js`
- Farben und Abstände: `app/globals.css` (Variablen ganz oben)
- Texturen: `public/tex/wall.jpg` (Wand) und `public/tex/wrinkle.jpg` (Knitter auf den Postern)

## Lokal testen

```bash
npm install
npx vercel link
npx vercel env pull .env.local
npm run dev
```
