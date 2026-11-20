# Internal helper for start-web-next.mjs. Never stop a process solely because it holds a port.
$ErrorActionPreference = 'Stop'

function Test-FrontendOwner($Candidate) {
    if (-not $Candidate -or $Candidate.Name -ne 'node.exe') { return $false }
    if (-not [string]::Equals($Candidate.ExecutablePath, $env:MPF_WEB_NEXT_NODE, [StringComparison]::OrdinalIgnoreCase)) { return $false }
    # Windows node/Vite arguments contain no escaped quotes. Compare complete tokens, not substrings.
    $tokens = @([regex]::Matches([string]$Candidate.CommandLine, '"([^"]*)"|([^\s"]+)') | ForEach-Object {
        if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value }
    })
    if ($tokens.Count -eq 2 -and [IO.Path]::GetFullPath($tokens[1]) -ieq $env:MPF_WEB_NEXT_VITE) {
        # One-time compatibility with the previous npm workspace launcher. Require
        # both this repository's Vite path and the exact web-next npm ancestor.
        $ancestorId = $Candidate.ParentProcessId
        for ($depth = 0; $depth -lt 4 -and $ancestorId; $depth++) {
            $ancestor = Get-CimInstance Win32_Process -Filter "ProcessId = $ancestorId"
            if (-not $ancestor) { break }
            $ancestorTokens = @([regex]::Matches([string]$ancestor.CommandLine, '"([^"]*)"|([^\s"]+)') | ForEach-Object {
                if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value }
            })
            if ($ancestor.Name -eq 'node.exe' -and $ancestorTokens.Count -eq 6 -and
                [IO.Path]::GetFileName($ancestorTokens[1]) -ieq 'npm-cli.js' -and
                $ancestorTokens[2] -eq 'run' -and $ancestorTokens[3] -eq 'dev' -and
                $ancestorTokens[4] -eq '--workspace' -and $ancestorTokens[5] -eq 'web-next') { return $true }
            $ancestorId = $ancestor.ParentProcessId
        }
        return $false
    }
    if ($tokens.Count -ne 9) { return $false }
    return $tokens[1] -ieq $env:MPF_WEB_NEXT_VITE -and
        $tokens[2] -eq '--config' -and $tokens[3] -ieq $env:MPF_WEB_NEXT_CONFIG -and
        $tokens[4] -eq '--host' -and $tokens[5] -eq '127.0.0.1' -and
        $tokens[6] -eq '--port' -and $tokens[7] -eq '6502' -and $tokens[8] -eq '--strictPort'
}

try {
    if (-not $env:MPF_WEB_NEXT_NODE -or -not $env:MPF_WEB_NEXT_VITE -or -not $env:MPF_WEB_NEXT_CONFIG) {
        throw 'Use node scripts/start-web-next.mjs --stop to clear the frontend port.'
    }
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 6502 -ErrorAction Stop)
    if (-not $listeners.Count) { throw 'Cannot identify the port6502 listener. No process was stopped.' }
    $owners = @($listeners.OwningProcess | Sort-Object -Unique)
    $checked = @()
    foreach ($ownerId in $owners) {
        $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
        if (-not (Test-FrontendOwner $candidate)) {
            throw "Port6502 belongs to an untracked process (PID $ownerId). Close that terminal first; automatic cleanup only stops this workspace's marked frontend."
        }
        $checked += $candidate
    }
    foreach ($candidate in $checked) {
        # Recheck identity/start time immediately before stopping to guard against PID reuse.
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($candidate.ProcessId)"
        if (-not $current) { continue }
        if (-not (Test-FrontendOwner $current) -or $current.CreationDate -ne $candidate.CreationDate) {
            throw 'Process ownership changed during cleanup. No replacement process was stopped.'
        }
        Write-Host "Stopping previous Image Playground PID $($current.ProcessId) on port6502..."
        Stop-Process -Id $current.ProcessId -Force -Confirm:$false -ErrorAction Stop
    }
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
