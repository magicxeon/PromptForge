# Internal helper for start-web-next.mjs. Never stop a process solely because it holds a port.
param([ValidateSet(6500, 6502)][int]$Port = 6502)

$ErrorActionPreference = 'Stop'

function Test-ApiOwner($Candidate) {
    if (-not $Candidate -or $Candidate.Name -ne 'node.exe' -or $Candidate.ExecutablePath -ine $env:MPF_WEB_NEXT_NODE) { return $false }
    $tokens = @([regex]::Matches([string]$Candidate.CommandLine, '"([^"]*)"|([^\s"]+)') | ForEach-Object {
        if ($_.Groups[1].Success) { $_.Groups[1].Value } else { $_.Groups[2].Value }
    })
    return $tokens.Count -eq 2 -and $tokens[1] -ieq $env:MPF_WEB_NEXT_API
}

function Test-ListenerOwner($Candidate) {
    if ($Port -eq 6500) { return Test-ApiOwner $Candidate }
    return Test-FrontendOwner $Candidate
}

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
    if (-not $env:MPF_WEB_NEXT_NODE -or ($Port -eq 6500 -and -not $env:MPF_WEB_NEXT_API) -or
        ($Port -eq 6502 -and (-not $env:MPF_WEB_NEXT_VITE -or -not $env:MPF_WEB_NEXT_CONFIG))) {
        throw 'Use scripts/start-web-next.bat to run the workspace launcher.'
    }
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    if ($Port -eq 6500 -and ($listeners | Where-Object LocalAddress -ne '127.0.0.1')) {
        throw 'API port 6500 has a non-loopback listener. Stop it from its own terminal if appropriate.'
    }
    $owners = @($listeners.OwningProcess | Sort-Object -Unique)
    $checked = @()
    foreach ($ownerId in $owners) {
        $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerId"
        if (-not (Test-ListenerOwner $candidate)) {
            throw "Port $Port belongs to an untracked process (PID $ownerId). Stop it from its own terminal if appropriate. Automatic cleanup only stops this workspace's launcher."
        }
        $checked += $candidate
    }
    foreach ($candidate in $checked) {
        # Recheck identity/start time immediately before stopping to guard against PID reuse.
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($candidate.ProcessId)"
        if (-not $current) { continue }
        if (-not (Test-ListenerOwner $current) -or $current.CreationDate -ne $candidate.CreationDate) {
            throw 'Process ownership changed during cleanup. No replacement process was stopped.'
        }
        Write-Host "Stopping previous workspace process PID $($current.ProcessId) on port $Port..."
        Stop-Process -Id $current.ProcessId -Force -Confirm:$false -ErrorAction Stop
    }
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
