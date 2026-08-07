$ErrorActionPreference = 'Stop'
$Root = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path (Join-Path $Root 'index.html'))) {
    Write-Host 'ERROR: dist\index.html was not found.' -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
$MimeTypes = @{
    '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
    '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png';
    '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.pdf'='application/pdf';
    '.ico'='image/x-icon'; '.woff'='font/woff'; '.woff2'='font/woff2'
}
function Get-SafeFilePath([string]$UrlPath) {
    $relative = [Uri]::UnescapeDataString(($UrlPath -split '\?')[0]).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
    $candidate = [IO.Path]::GetFullPath((Join-Path $Root $relative.Replace('/', [IO.Path]::DirectorySeparatorChar)))
    $rootFull = [IO.Path]::GetFullPath($Root) + [IO.Path]::DirectorySeparatorChar
    if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { return (Join-Path $Root 'index.html') }
    if ((Test-Path $candidate) -and -not (Get-Item $candidate).PSIsContainer) { return $candidate }
    return (Join-Path $Root 'index.html')
}
$Listener=$null; $Port=4173
while ($Port -le 4190) {
    try { $Listener=[Net.HttpListener]::new(); $Listener.Prefixes.Add("http://127.0.0.1:$Port/"); $Listener.Start(); break }
    catch { if ($Listener) { $Listener.Close() }; $Listener=$null; $Port++ }
}
if (-not $Listener) { Write-Host 'ERROR: No free local port was found (4173-4190).' -ForegroundColor Red; Read-Host 'Press Enter to close'; exit 1 }
$Url="http://127.0.0.1:$Port/"
Write-Host ''; Write-Host 'Saudia One IT Enterprise v1.8 is running.' -ForegroundColor Green
Write-Host "Open: $Url" -ForegroundColor Cyan
Write-Host 'Keep this window open. Press Ctrl+C to stop.' -ForegroundColor Yellow; Write-Host ''
Start-Process $Url
try {
    while ($Listener.IsListening) {
        $Context=$Listener.GetContext()
        try {
            $FilePath=Get-SafeFilePath $Context.Request.Url.PathAndQuery
            $Bytes=[IO.File]::ReadAllBytes($FilePath)
            $Extension=[IO.Path]::GetExtension($FilePath).ToLowerInvariant()
            $ContentType=$MimeTypes[$Extension]; if (-not $ContentType) { $ContentType='application/octet-stream' }
            $Context.Response.StatusCode=200; $Context.Response.ContentType=$ContentType
            if ($Extension -eq '.html') { $Context.Response.Headers['Cache-Control']='no-cache' } else { $Context.Response.Headers['Cache-Control']='public, max-age=3600' }
            $Context.Response.ContentLength64=$Bytes.Length
            $Context.Response.OutputStream.Write($Bytes,0,$Bytes.Length)
        } catch {
            $Message=[Text.Encoding]::UTF8.GetBytes('Server error'); $Context.Response.StatusCode=500
            $Context.Response.ContentType='text/plain; charset=utf-8'; $Context.Response.ContentLength64=$Message.Length
            $Context.Response.OutputStream.Write($Message,0,$Message.Length)
        } finally { $Context.Response.OutputStream.Close() }
    }
} finally { if ($Listener) { $Listener.Stop(); $Listener.Close() } }
