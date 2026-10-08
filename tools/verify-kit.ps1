<#
.SYNOPSIS
    Audit du workflow-kit : agnosticisme du core, neutralite des packs, resolution des jetons.

.DESCRIPTION
    1. Lexique core : aucun terme projet ni techno dans core/ (le core est agnostique).
    2. Neutralite des packs : aucun terme projet/metier dans packs/<stack>/agents/**.
    3. References mortes : anciens noms de fichiers interdits dans packs/.
    4. Fichiers requis presents (core + packs).
    5. Round-trip : materialisation generique sans jeton non resolu.

    Lecture seule ; n'ecrit que dans -ReportDir.

.PARAMETER KitRoot   Racine du kit (defaut : parent du script).
.PARAMETER ReportDir Dossier de rapport (defaut : %TEMP%/workflow-kit-verify).
#>
[CmdletBinding()]
param(
    [string]$KitRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$ReportDir = (Join-Path $env:TEMP "workflow-kit-verify")
)

$ErrorActionPreference = "Stop"
$Utf8 = New-Object System.Text.UTF8Encoding($false)
if (-not (Test-Path -LiteralPath $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null }

function Read-Utf8([string]$p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function List-Md([string]$root) {
    Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
        $_.Extension -in '.md', '.json' -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\\.git\\'
    }
}

$fail = 0

# --- 1. Lexique core (projet + techno) ---------------------------------------
Write-Host "=== 1. Core agnostique (ni projet, ni techno) ===" -ForegroundColor Cyan
$coreDir = Join-Path $KitRoot "core"
$coreForbid = @(
    # projet
    'storvya', 'zindex', 'multicentre', 'raison_sociale', 'd_liste',
    # techno (le core ne doit pas en dependre)
    'livewire', 'laravel', 'blade', 'eloquent', 'artisan', 'composer', 'phpunit', '\bpint\b',
    'sanctum', 'tailwind', 'daisyui', 'vite', 'docker', 'mysql', 'sqlite', 'postgres', 'stripe', '\bnpm\b',
    '\bphp\b', '\.php\b', '\.blade\b', '#\[[A-Z]'
)
$coreFiles = List-Md $coreDir | Where-Object { $_.Name -notin @('package.json', 'package-lock.json') }  # manifests locaux (plugin), git-ignores
$coreHits = 0
foreach ($term in $coreForbid) {
    $hits = @()
    foreach ($f in $coreFiles) {
        $text = (Read-Utf8 $f.FullName) -replace '\{\{[A-Z0-9_]+\}\}', ''
        if ([regex]::IsMatch($text, $term, 'IgnoreCase')) { $hits += $f.Name }
    }
    if ($hits.Count -gt 0) { Write-Host "  '$term' -> $($hits.Count) : $(($hits | Sort-Object -Unique) -join ', ')" -ForegroundColor Yellow; $coreHits++ }
}
if ($coreHits -eq 0) { Write-Host "  aucun terme interdit." } else { $fail++ }

# --- 2. Neutralite des packs (agents/ seulement) -----------------------------
Write-Host "=== 2. Neutralite des packs (aucun terme projet) ===" -ForegroundColor Cyan
$packsRoot = Join-Path $KitRoot "packs"
$packForbid = @(
    'storvya', 'zindex', 'stripe', 'ionos', 'signable', 'multicentre',
    'raison_sociale', 'd_liste', '\bCentre\b', '\bFacture\b', '\bContrat\b', '\bSociete\b', '\bUnite\b'
)
$packSeedFiles = @()
Get-ChildItem -LiteralPath $packsRoot -Directory | ForEach-Object {
    $agents = Join-Path $_.FullName "agents"
    if (Test-Path -LiteralPath $agents) { $packSeedFiles += List-Md $agents }
}
$packHits = 0
foreach ($term in $packForbid) {
    $hits = @()
    foreach ($f in $packSeedFiles) {
        $text = (Read-Utf8 $f.FullName) -replace '\{\{[A-Z0-9_]+\}\}', ''
        if ([regex]::IsMatch($text, $term, 'IgnoreCase')) {
            $hits += $f.FullName.Substring($KitRoot.Length).TrimStart('\', '/')
        }
    }
    if ($hits.Count -gt 0) { Write-Host "  '$term' -> $(($hits | Sort-Object -Unique) -join ', ')" -ForegroundColor Yellow; $packHits++ }
}
if ($packHits -eq 0) { Write-Host "  aucun terme projet/metier." } else { $fail++ }

# --- 3. References mortes -----------------------------------------------------
Write-Host "=== 3. References mortes ===" -ForegroundColor Cyan
$deadPatterns = @('agent-frontend\.md', 'agent-livewire\.md', '\.opencode/agent-')
$deadHits = @()
foreach ($f in (List-Md $packsRoot)) {
    $text = Read-Utf8 $f.FullName
    foreach ($p in $deadPatterns) {
        if ([regex]::IsMatch($text, $p, 'IgnoreCase')) { $deadHits += "$($f.FullName.Substring($KitRoot.Length).TrimStart('\','/')) : $p" }
    }
}
if ($deadHits.Count -eq 0) { Write-Host "  aucune." } else { $deadHits | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }; $fail++ }

# --- 4. Fichiers requis -------------------------------------------------------
Write-Host "=== 4. Fichiers requis ===" -ForegroundColor Cyan
$required = @(
    "core/index.md", "core/agent-workflow.md", "core/agent-opencode.md",
    "core/agents/specs.md", "core/agents/test.md", "core/agents/architect.md",
    "core/agents/dev.md", "core/agents/review.md", "core/agents/doc.md",
    "core/templates/feature.md",
    "packs/_schema.md", "packs/_blank/pack.md", "packs/laravel-livewire/pack.md"
)
$missing = @()
foreach ($rel in $required) { if (-not (Test-Path -LiteralPath (Join-Path $KitRoot $rel))) { $missing += $rel } }
if ($missing.Count -eq 0) { Write-Host "  tous presents." } else { $missing | ForEach-Object { Write-Host "  ABSENT : $_" -ForegroundColor Yellow }; $fail++ }

# --- 5. Round-trip ------------------------------------------------------------
Write-Host "=== 5. Round-trip (materialisation generique) ===" -ForegroundColor Cyan
$tmp = Join-Path $env:TEMP "workflow-kit-roundtrip"
if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }
$tmpTarget = Join-Path $tmp "target"
New-Item -ItemType Directory -Path $tmpTarget -Force | Out-Null

& (Join-Path $KitRoot "scripts/bootstrap.ps1") -Target $tmpTarget -Stack "laravel-livewire" -ProjectName "demo" -Mode Copy -OnConflict Overwrite | Out-Null

$orphans = @()
foreach ($d in @((Join-Path $tmpTarget ".opencode"), (Join-Path $tmpTarget ".agents"))) {
    if (Test-Path -LiteralPath $d) {
        Get-ChildItem -LiteralPath $d -Recurse -File | Where-Object { $_.Extension -in '.md', '.json' -and $_.FullName -notmatch '\\doublons\\' } | ForEach-Object {
            foreach ($mm in [regex]::Matches((Read-Utf8 $_.FullName), '\{\{[A-Z0-9_]+\}\}|<Projet>|YYYY-MM-DD')) { $orphans += "$($_.Name) : $($mm.Value)" }
        }
    }
}
if ($orphans.Count -eq 0) { Write-Host "  aucun jeton non resolu." } else { $orphans | Sort-Object -Unique | ForEach-Object { Write-Host "  RESIDU $_" -ForegroundColor Yellow }; $fail++ }

# --- Rapport neutralite (fichier) --------------------------------------------
$report = Join-Path $ReportDir "neutralite.txt"
$lines = @("# Rapport neutralite workflow-kit", "# core interdit : $coreHits terme(s)", "# packs interdits : $packHits terme(s)", "# refs mortes : $($deadHits.Count)", "# fichiers requis manquants : $($missing.Count)", "# jetons non resolus : $($orphans.Count)")
[System.IO.File]::WriteAllText($report, (($lines -join "`n") + "`n"), $Utf8)

# --- Bilan --------------------------------------------------------------------
Write-Host ""
if ($fail -eq 0) { Write-Host "AUDIT : OK (aucun ecart bloquant)." -ForegroundColor Green }
else { Write-Host "AUDIT : $fail point(s) a examiner." -ForegroundColor Yellow }
Write-Host "Rapport : $report"
