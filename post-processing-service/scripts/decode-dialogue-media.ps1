param(
    [Parameter(Mandatory=$true)][string]$JsonPath,
    [string]$OutputPath = 'D:\development\temp\momelo-dialogue-preview.mp4'
)

$payload = Get-Content -LiteralPath $JsonPath -Raw | ConvertFrom-Json
if (-not $payload.bytesBase64 -or -not $payload.sha256) { throw 'Expected a GET /v1/media/{id} JSON response.' }
$bytes = [Convert]::FromBase64String($payload.bytesBase64)
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $hash = [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant() }
finally { $sha.Dispose() }
if ($hash -ne $payload.sha256) { throw 'Media hash mismatch.' }
$destination = [System.IO.Path]::GetFullPath($OutputPath)
$root = [System.IO.Path]::GetFullPath('D:\development\temp')
if (-not $destination.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Decoded POC media must be written under D:\development\temp.'
}
$extension = switch ($payload.mimeType) {
    'video/mp4' { '.mp4' }
    'audio/mpeg' { '.mp3' }
    'audio/wav' { '.wav' }
    'audio/x-wav' { '.wav' }
    default { throw 'Unsupported media MIME type.' }
}
if (-not $destination.EndsWith($extension, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Output extension must match the media type ($extension)."
}
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destination)) | Out-Null
[System.IO.File]::WriteAllBytes($destination, $bytes)
Write-Output $destination
