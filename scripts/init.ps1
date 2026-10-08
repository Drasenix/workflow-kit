<#
.SYNOPSIS
    Assistant d'installation du workflow-kit (mode lien).

.DESCRIPTION
    1. Place le kit en depot imbrique <Target>/workflow-kit/ (clone d'un remote, sinon copie locale),
       gitignore par le projet.
    2. Cree le LIEN .opencode -> workflow-kit/core (junction Windows / symlink Linux).
    3. Materialise .agents/ (seeds projet) + AGENTS.md.
    4. Fusionne opencode.json (permissions subagents + instructions workflow-commands).
    5. Cree .agents/feature/ et rappelle la checklist.

    Protection : un fichier projet deja present n'est JAMAIS ecrase -> .agents/doublons/.
    -Force force l'ecrasement.

.PARAMETER Target     Dossier projet cible (defaut : demande / cwd).
.PARAMETER Stack      Pack techno (defaut : demande / laravel-livewire).
.PARAMETER Name       Nom du projet (remplace <Projet>).
.PARAMETER KitRepo    URL du depot du kit (clone dans <Target>/workflow-kit). Sinon copie locale.
.PARAMETER OnConflict Quarantine (defaut) | Overwrite.
.PARAMETER KitRoot    Racine du kit source (defaut : parent du script).
.PARAMETER Force      Ecrase les fichiers projet + remplace le kit imbrique.
#>
[CmdletBinding()]
param(
    [string]$Target = "",
    [string]$Stack = "",
    [string]$Name = "",
    [string]$KitRepo = "",
    [ValidateSet('Quarantine', 'Overwrite')]
    [string]$OnConflict = "Quarantine",
    [string]$KitRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$conflictMode = if ($Force) { 'Overwrite' } else { $OnConflict }

function Read-Utf8([string]$p) { [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function Write-Utf8([string]$p, [string]$text) {
    $dir = Split-Path -Parent $p
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($p, $text, $Utf8)
}
function Prompt([string]$label, [string]$default) {
    $suffix = if ($default) { " [$default]" } else { "" }
    $ans = Read-Host "$label$suffix"
    if ([string]::IsNullOrWhiteSpace($ans)) { return $default }
    return $ans.Trim()
}

# --- 1. Parametres -----------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Target)) { $Target = Prompt "Dossier projet cible" (Get-Location).Path }
$Target = [System.IO.Path]::GetFullPath($Target)
if (-not (Test-Path -LiteralPath $Target)) { New-Item -ItemType Directory -Path $Target -Force | Out-Null }

$availableStacks = @(Get-ChildItem -LiteralPath (Join-Path $KitRoot "packs") -Directory | ForEach-Object Name)
if ([string]::IsNullOrWhiteSpace($Stack)) {
    Write-Host "Packs disponibles : $($availableStacks -join ', ')"
    $Stack = Prompt "Pack techno" "laravel-livewire"
}
if ($availableStacks -notcontains $Stack) { throw "Pack introuvable : '$Stack'. Disponibles : $($availableStacks -join ', ')" }
if ([string]::IsNullOrWhiteSpace($Name)) { $Name = Prompt "Nom du projet" (Split-Path -Leaf $Target) }

Write-Host ""
Write-Host "Projet  : $Target"
Write-Host "Nom     : $Name"
Write-Host "Stack   : $Stack"
Write-Host "KitRepo : $(if ($KitRepo) { $KitRepo } else { '(copie locale)' })"
Write-Host "Conflit : $conflictMode"
Write-Host ""

# --- 2. Kit en depot imbrique ------------------------------------------------
$projectKit = Join-Path $Target "workflow-kit"
if (Test-Path -LiteralPath $projectKit) {
    if ($Force) { Remove-Item -LiteralPath $projectKit -Recurse -Force }
    else { Write-Host "[kit] workflow-kit/ existe deja : reutilise" }
}
if (-not (Test-Path -LiteralPath $projectKit)) {
    if (-not [string]::IsNullOrWhiteSpace($KitRepo)) {
        Write-Host "[kit] git clone $KitRepo -> workflow-kit/"
        # git ecrit des warnings sur stderr : neutraliser Stop le temps de l'appel.
        $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
        try {
            & git clone --quiet $KitRepo $projectKit 2>&1 | Out-Null
            $cloneCode = $LASTEXITCODE
            if ($cloneCode -ne 0) { throw "git clone a echoue : $KitRepo" }
            # HEAD distant invalide (branche par defaut absente) -> checkout explicite main/master.
            if (-not (Test-Path -LiteralPath (Join-Path $projectKit "core"))) {
                $brs = @(& git -C $projectKit branch -r 2>$null | ForEach-Object { $_ -replace '.*origin/', '' } | Where-Object { $_ -notmatch 'HEAD' })
                $br = if ($brs -contains 'main') { 'main' } elseif ($brs -contains 'master') { 'master' } else { $brs | Select-Object -First 1 }
                if ($br) { & git -C $projectKit checkout --quiet $br 2>&1 | Out-Null }
                Write-Host "[kit] checkout branche '$br'"
            }
        }
        finally { $ErrorActionPreference = $prevEap }
    }
    else {
        Write-Host "[kit] copie locale -> workflow-kit/ (pas de .git : renseigner -KitRepo pour un clone)"
        New-Item -ItemType Directory -Path $projectKit -Force | Out-Null
        $exclude = @('.git', 'node_modules', 'workflow-kit')
        Get-ChildItem -LiteralPath $KitRoot -Force | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $projectKit -Recurse -Force
        }
    }
}
$runKit = $projectKit

# config du kit : stack choisie
Write-Utf8 (Join-Path $runKit "workflow.config.json") (@{ stack = $Stack } | ConvertTo-Json)

# .gitignore : ignorer le kit et le lien
$gitignore = Join-Path $Target ".gitignore"
$gi = if (Test-Path -LiteralPath $gitignore) { Read-Utf8 $gitignore } else { "" }
$added = @()
foreach ($pat in @('workflow-kit/', '.opencode/')) {
    if ($gi -notmatch ('(?m)^' + [regex]::Escape($pat) + '\s*$')) { $added += $pat }
}
if ($added.Count -gt 0) {
    if ($gi.Length -gt 0 -and -not $gi.EndsWith("`n")) { $gi += "`n" }
    $gi += "# workflow-kit (kit agnostique imbrique, non commite)`n"
    foreach ($pat in $added) { $gi += "$pat`n" }
    Write-Utf8 $gitignore $gi
    Write-Host "[gitignore] $($added -join ', ')"
}

# --- 3. Materialisation (mode lien) -----------------------------------------
& (Join-Path $runKit "scripts/bootstrap.ps1") -Target $Target -Stack $Stack -ProjectName $Name -Mode Link -OnConflict $conflictMode

# --- 4. Fusion opencode.json (permissions + instructions) --------------------
$fragment = Get-Content -LiteralPath (Join-Path $runKit "opencode.agent.json") -Raw | ConvertFrom-Json
$task = $fragment.agent.build.permission.task
$opencodePath = Join-Path $Target "opencode.json"
$cfg = if (Test-Path -LiteralPath $opencodePath) { Get-Content -LiteralPath $opencodePath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ '$schema' = 'https://opencode.ai/config.json' } }

if (-not $cfg.PSObject.Properties.Match('agent').Count) { $cfg | Add-Member -NotePropertyName 'agent' -NotePropertyValue ([pscustomobject]@{}) }
if (-not $cfg.agent.PSObject.Properties.Match('build').Count) { $cfg.agent | Add-Member -NotePropertyName 'build' -NotePropertyValue ([pscustomobject]@{}) }
if (-not $cfg.agent.build.PSObject.Properties.Match('permission').Count) { $cfg.agent.build | Add-Member -NotePropertyName 'permission' -NotePropertyValue ([pscustomobject]@{}) }
if (-not $cfg.agent.build.permission.PSObject.Properties.Match('task').Count) { $cfg.agent.build.permission | Add-Member -NotePropertyName 'task' -NotePropertyValue ([pscustomobject]@{}) }
foreach ($p in $task.PSObject.Properties) {
    if ($cfg.agent.build.permission.task.PSObject.Properties.Match($p.Name).Count) { $cfg.agent.build.permission.task.($p.Name) = $p.Value }
    else { $cfg.agent.build.permission.task | Add-Member -NotePropertyName $p.Name -NotePropertyValue $p.Value }
}

$instrFile = ".agents/workflow-commands.md"
$existing = if ($cfg.PSObject.Properties.Match('instructions').Count) { @($cfg.instructions) } else { @() }
if ($existing -notcontains $instrFile) { $existing += $instrFile }
if ($cfg.PSObject.Properties.Match('instructions').Count) { $cfg.instructions = $existing }
else { $cfg | Add-Member -NotePropertyName 'instructions' -NotePropertyValue $existing }

$json = $cfg | ConvertTo-Json -Depth 12
# ConvertTo-Json (PS 5.1) aplatit un tableau a 1 element -> forcer la forme tableau pour `instructions`.
$json = $json -replace '("instructions":\s*)"([^"]+)"', '$1[ "$2" ]'
Write-Utf8 $opencodePath $json
Write-Host "[opencode.json] permissions subagents + instructions fusionnees"

# --- 4bis. Retirer .opencode/ de l'index git (si deja suivi) -----------------
$gitDir = Join-Path $Target ".git"
if (Test-Path -LiteralPath $gitDir) {
    $prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { & git -C $Target rm -r --cached --ignore-unmatch --quiet .opencode 2>&1 | Out-Null } finally { $ErrorActionPreference = $prevEap }
    if ($LASTEXITCODE -eq 0) { Write-Host "[git] .opencode/ retire de l'index (fichiers conserves sur disque)" }
}

# --- 5. Dossier feature (non destructif) -------------------------------------
$featureDir = Join-Path $Target ".agents/feature"
New-Item -ItemType Directory -Path $featureDir -Force | Out-Null
$gitkeep = Join-Path $featureDir ".gitkeep"
if (-not (Test-Path -LiteralPath $gitkeep)) { Write-Utf8 $gitkeep "" }
Write-Host "[feature] dossier cree : .agents/feature/"

# --- 6. Bilan ----------------------------------------------------------------
Write-Host ""
Write-Host "Installation terminee." -ForegroundColor Green
Write-Host ""
Write-Host "A faire manuellement :"
Write-Host "  - Remplir le glossaire (.agents/domain-glossary.md)."
Write-Host "  - Deposer les specs officielles dans .agents/specs/spec.txt."
Write-Host "  - Remplir conventions / architecture / stack / commands (.agents/)."
if ($Stack -eq "_blank") { Write-Host "  - Pack '_blank' : completer les fichiers de .agents/." -ForegroundColor Yellow }
Write-Host "  - L'agnostique est LIVE : editer workflow-kit/core/ (git -C workflow-kit pour commit/push)."
