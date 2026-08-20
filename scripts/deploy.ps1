# =============================================================
# DEPLOY.PS1 — Cloudflare Pages Deploy für Nook
#
# `wrangler pages deploy` (das Legacy-Pages-Kommando, das dieses Projekt
# nutzt) liest ".assetsignore" NICHT — das wird nur vom neueren
# Workers-Assets-Deploy-Pfad ("wrangler deploy") respektiert. Ohne diesen
# Umweg würde jeder Deploy versuchen, u.a. games/cozy-home/assets/Gimp/
# (>25 MB, Cloudflare Pages' Limit pro Datei) sowie interne Planungsdoku
# (AI documentation/, mockups/, README.md, ...) live mit hochzuladen.
#
# Dieses Skript baut deshalb selbst eine Staging-Kopie des Repos, die
# ".assetsignore" per Hand auswertet, und deployt DIE — nicht das Repo
# direkt. Einzige Wahrheitsquelle für "was nicht deployed wird" bleibt
# ".assetsignore" im Repo-Root.
#
# Aufruf: powershell -File scripts/deploy.ps1
# =============================================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$ignoreFile = Join-Path $root ".assetsignore"

# -Encoding UTF8 ist Pflicht: Windows PowerShell 5.1 liest Dateien sonst mit
# der System-ANSI-Codepage statt UTF-8 und zerlegt Umlaute (z.B. würde
# "Müll-Wasser.xlsx" in .assetsignore sonst zu "MÃ¼ll-Wasser.xlsx" und matcht
# dann nie gegen den echten Dateinamen — das Xlsx wäre live gelandet.
$patterns = Get-Content $ignoreFile -Encoding UTF8 |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -and -not $_.StartsWith("#") } |
  ForEach-Object { $_.TrimEnd("/") }

function Test-Ignored([string]$relPath) {
  $relPath = $relPath -replace '\\', '/'
  $name = Split-Path $relPath -Leaf
  foreach ($p in $patterns) {
    if ($relPath -eq $p -or $relPath.StartsWith("$p/")) { return $true }
    if ($name -like $p -or $relPath -like $p) { return $true }
  }
  return $false
}

$staging = Join-Path $env:TEMP ("nook-deploy-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $staging | Out-Null
Write-Host "Staging-Verzeichnis: $staging"

try {
  $copied = 0
  Get-ChildItem -Path $root -Recurse -File -Force | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    $relFwd = $rel -replace '\\', '/'

    # .git/.wrangler früh raus — sonst durchforstet Get-ChildItem oben
    # bereits die komplette Git-Objektdatenbank, bevor Test-Ignored
    # überhaupt greifen kann.
    if ($relFwd -eq ".git" -or $relFwd.StartsWith(".git/")) { return }
    if ($relFwd -eq ".wrangler" -or $relFwd.StartsWith(".wrangler/")) { return }
    if (Test-Ignored $relFwd) { return }

    $dest = Join-Path $staging $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $_.FullName $dest -Force
    $copied++
  }
  Write-Host "$copied Dateien gestaged."

  npx wrangler pages deploy $staging --project-name nook --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { throw "wrangler pages deploy fehlgeschlagen (Exit $LASTEXITCODE)" }
}
finally {
  Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
}
