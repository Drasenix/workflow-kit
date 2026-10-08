<#
.SYNOPSIS
    Materialise le workflow-kit dans un projet (mode lien par defaut).

.DESCRIPTION
    Mode Link (defaut) : le dossier agnostique .opencode/ est un LIEN (junction Windows /
    symlink Linux) vers <KitRoot>/core. Tu edites le kit, le projet suit.
    Mode Copy : core/ est COPIE dans .opencode/ (utile pour un dossier temporaire / audit).

    Dans les deux modes, les seeds projet sont copies vers .agents/ :
      packs/<stack>/agents/** -> .agents/**   (projet : quarantaine si existe)
      project/agents/**       -> .agents/**
      project/AGENTS.md       -> AGENTS.md

    Protection : un fichier projet deja present n'est JAMAIS ecrase -> .agents/doublons/.

.PARAMETER KitRoot      Racine du kit (defaut : parent du script).
.PARAMETER Target       Racine du projet cible (defaut : cwd).
.PARAMETER Stack        Pack techno (defaut : workflow.config.json .stack).
.PARAMETER ProjectName  Remplace le jeton <Projet> (optionnel).
.PARAMETER Date         Remplace YYYY-MM-DD (defaut : aujourd'hui).
.PARAMETER Mode         Link (defaut) | Copy.
.PARAMETER OnConflict   Quarantine (defaut) | Overwrite.
#>
[CmdletBinding()]
param(
    [string]$KitRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$Target = (Get-Location).Path,
    [string]$Stack = "",
    [string]$ProjectName = "",
    [string]$Date = (Get-Date -Format 'yyyy-MM-dd'),
    [ValidateSet('Link', 'Copy')]
    [string]$Mode = "Link",
    [ValidateSet('Quarantine', 'Overwrite')]
    [string]$OnConflict = "Quarantine"
)

$ErrorActionPreference = "Stop"
$Target = [System.IO.Path]::GetFullPath($Target).TrimEnd('\', '/')
$KitRoot = [System.IO.Path]::GetFullPath($KitRoot).TrimEnd('\', '/')

$configPath = Join-Path $KitRoot "workflow.config.json"
if ([string]::IsNullOrWhiteSpace($Stack)) {
    $Stack = if (Test-Path -LiteralPath $configPath) { (Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json).stack } else { "laravel-livewire" }
    if ([string]::IsNullOrWhiteSpace($Stack)) { $Stack = "laravel-livewire" }
}
$packDir = Join-Path $KitRoot (Join-Path "packs" $Stack)
if (-not (Test-Path -LiteralPath $packDir)) { throw "Pack introuvable : $packDir" }

$opencodeDir = Join-Path $Target ".opencode"
$agentsDir = Join-Path $Target ".agents"
$doublonsRoot = Join-Path $agentsDir "doublons"
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$conflicts = @()
$placed = @()

function Place-File([string]$source, [string]$destination, [string]$scope) {
    $content = [System.IO.File]::ReadAllText($source, [System.Text.Encoding]::UTF8)
    if (-not [string]::IsNullOrWhiteSpace($ProjectName)) { $content = $content.Replace('<Projet>', $ProjectName) }
    $content = $content.Replace('YYYY-MM-DD', $Date)

    if ($scope -ne 'agnostic' -and (Test-Path -LiteralPath $destination) -and $OnConflict -ne 'Overwrite') {
        $rel = $destination.Substring($Target.Length).TrimStart('\', '/')
        $qdest = Join-Path $doublonsRoot $rel
        $qdir = Split-Path -Parent $qdest
        if (-not (Test-Path -LiteralPath $qdir)) { New-Item -ItemType Directory -Path $qdir -Force | Out-Null }
        [System.IO.File]::WriteAllText($qdest, $content, $Utf8)
        $script:conflicts += $rel
        return
    }
    $dir = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($destination, $content, $Utf8)
    $script:placed += $destination
}

function Copy-Tree([string]$sourceRoot, [string]$destRoot, [string]$scope) {
    if (-not (Test-Path -LiteralPath $sourceRoot)) { return }
    Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($sourceRoot.Length).TrimStart('\', '/')
        Place-File $_.FullName (Join-Path $destRoot $rel) $scope
    }
}

# --- 1. Seeds projet -> .agents/ --------------------------------------------
Copy-Tree (Join-Path $packDir "agents") $agentsDir 'project'
Write-Host "[pack:$Stack] agents/ -> .agents/ [project]"
Copy-Tree (Join-Path $KitRoot "project/agents") $agentsDir 'project'
Write-Host "[project] agents/ -> .agents/ [project]"
$agentsMd = Join-Path $KitRoot "project/AGENTS.md"
if (Test-Path -LiteralPath $agentsMd) {
    Place-File $agentsMd (Join-Path $Target "AGENTS.md") 'project'
    Write-Host "[project] AGENTS.md -> AGENTS.md [project]"
}

# --- 2. Migration : anciens .opencode/ techno -> .agents/ --------------------
$legacy = @(
    @{ old = "agent-frontend.md";             new = "ui-rules.md" },
    @{ old = "agent-livewire.md";             new = "component-rules.md" },
    @{ old = "templates-index.md";            new = "templates-index.md" },
    @{ old = "doc/reference-utilitaires.md";  new = "reference-utilitaires.md" },
    @{ old = "templates/backend";             new = "templates/backend" },
    @{ old = "templates/frontend";            new = "templates/frontend" },
    @{ old = "templates/tests";               new = "templates/tests" },
    @{ old = "skills/tests";                  new = "skills/tests" },
    @{ old = "skills/recette";                new = "skills/recette" },
    @{ old = "skills/migrate-fresh";          new = "skills/migrate-fresh" }
)
$legacyMoved = @()
foreach ($m in $legacy) {
    $oldPath = Join-Path $opencodeDir $m.old
    if (-not (Test-Path -LiteralPath $oldPath)) { continue }
    $newPath = Join-Path $agentsDir $m.new
    if (Test-Path -LiteralPath $newPath) {
        $seedBak = Join-Path $doublonsRoot (Join-Path "_seeds" $m.new)
        $sdir = Split-Path -Parent $seedBak
        if (-not (Test-Path -LiteralPath $sdir)) { New-Item -ItemType Directory -Path $sdir -Force | Out-Null }
        Move-Item -LiteralPath $newPath -Destination $seedBak -Force
    }
    $ndir = Split-Path -Parent $newPath
    if (-not (Test-Path -LiteralPath $ndir)) { New-Item -ItemType Directory -Path $ndir -Force | Out-Null }
    Move-Item -LiteralPath $oldPath -Destination $newPath -Force
    $legacyMoved += $m.old
}
if ($legacyMoved.Count -gt 0) {
    Write-Host "[migration] $($legacyMoved.Count) chemin(s) .opencode/ migre(s) vers .agents/"
    $legacyMoved | Sort-Object -Unique | ForEach-Object { Write-Host "  ~ .opencode/$_ -> .agents/" }
}

# --- 3. .opencode/ : lien (Link) ou copie (Copy) -----------------------------
if ($Mode -eq 'Link') {
    # Migrer le contenu projet hors d'un .opencode/ reel, puis remplacer par un lien.
    if (Test-Path -LiteralPath $opencodeDir) {
        $item = Get-Item -LiteralPath $opencodeDir -Force
        $isLink = $item.Attributes -band [System.IO.FileAttributes]::ReparsePoint
        if (-not $isLink) {
            $featOld = Join-Path $opencodeDir "feature"
            if ((Test-Path -LiteralPath $featOld) -and -not (Test-Path -LiteralPath (Join-Path $agentsDir "feature"))) {
                New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
                Move-Item -LiteralPath $featOld -Destination (Join-Path $agentsDir "feature") -Force
                Write-Host "[migration] .opencode/feature -> .agents/feature"
            }
            $docOld = Join-Path $opencodeDir "doc"
            if (Test-Path -LiteralPath $docOld) {
                $docNew = Join-Path $agentsDir "doc"
                if (-not (Test-Path -LiteralPath $docNew)) { New-Item -ItemType Directory -Path $docNew -Force | Out-Null }
                Get-ChildItem -LiteralPath $docOld -Force | ForEach-Object {
                    $t = Join-Path $docNew $_.Name
                    if (-not (Test-Path -LiteralPath $t)) { Move-Item -LiteralPath $_.FullName -Destination $t -Force }
                }
                Write-Host "[migration] .opencode/doc -> .agents/doc"
            }
            [System.IO.Directory]::Delete($opencodeDir, $true)
        }
        else {
            # Supprimer le lien SANS suivre la cible (aucun prompt).
            [System.IO.Directory]::Delete($opencodeDir, $false)
        }
    }
    New-Item -ItemType Junction -Path $opencodeDir -Target (Join-Path $KitRoot "core") | Out-Null
    Write-Host "[link] .opencode -> $KitRoot/core"
}
else {
    Get-ChildItem -LiteralPath (Join-Path $KitRoot "core") -Recurse -File | Where-Object { $_.Name -ne 'opencode.agent.json' } | ForEach-Object {
        $rel = $_.FullName.Substring((Join-Path $KitRoot "core").Length).TrimStart('\', '/')
        Place-File $_.FullName (Join-Path $opencodeDir $rel) 'agnostic'
    }
    Write-Host "[core] -> .opencode/ [agnostic]"
}

# --- 4. Controle : jetons non resolus (fichiers ecrits) ----------------------
$leftover = @()
foreach ($f in ($placed | Sort-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $f)) { continue }
    $text = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    foreach ($m in [regex]::Matches($text, '\{\{[A-Z0-9_]+\}\}|<Projet>|YYYY-MM-DD')) { $leftover += "$f : $($m.Value)" }
}
if ($leftover.Count -gt 0) {
    Write-Warning "Jetons non resolus :"
    $leftover | Sort-Object -Unique | ForEach-Object { Write-Warning "  $_" }
}
else {
    Write-Host "[ok] aucun jeton non resolu."
}

# --- 5. Quarantaine : rapport -----------------------------------------------
if ($conflicts.Count -gt 0) {
    $uniq = $conflicts | Sort-Object -Unique
    $lines = @(
        "# Doublons (fichiers projet deja presents, non ecrases)",
        "",
        "La version du kit a ete deposee ici AU LIEU D'ECRASER l'existante.",
        "Parcourez ce dossier, reportez manuellement ce qui est utile, puis supprimez-le.",
        ""
    )
    foreach ($c in $uniq) { $lines += "- ``$c``" }
    $readmePath = Join-Path $doublonsRoot "README.md"
    $rdir = Split-Path -Parent $readmePath
    if (-not (Test-Path -LiteralPath $rdir)) { New-Item -ItemType Directory -Path $rdir -Force | Out-Null }
    [System.IO.File]::WriteAllText($readmePath, (($lines -join "`n") + "`n"), $Utf8)
    Write-Host ""
    Write-Warning "$($uniq.Count) fichier(s) projet deja present(s) : quarantaine dans .agents/doublons/"
}

Write-Host ""
Write-Host "Materialisation terminee (mode $Mode)."
