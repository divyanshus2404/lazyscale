# Run the whole thing locally on Windows — site and serverless functions.
#
#   powershell -ExecutionPolicy Bypass -File .\run-local.ps1
#
# This is the PowerShell twin of run-local.sh. Same reason for existing: vercel
# dev does not reliably pick up .env.local on a linked project — it resolves the
# environment from the linked Vercel project instead, so anything only in the
# local file never reaches the functions. Reading the file and setting the
# variables in this process does work.

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$Port = if ($env:PORT) { $env:PORT } else { '3100' }

if (Test-Path '.env.local') {
    foreach ($line in Get-Content '.env.local') {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }

        $split = $trimmed.IndexOf('=')
        if ($split -lt 1) { continue }

        $name  = $trimmed.Substring(0, $split).Trim()
        $value = $trimmed.Substring($split + 1).Trim()

        # Strip one layer of matching quotes. JSON values such as TENANTS_JSON
        # must be quoted in the file, and the quotes are not part of the value.
        if ($value.Length -ge 2 -and
            (($value.StartsWith('"') -and $value.EndsWith('"')) -or
             ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        Set-Item -Path "Env:$name" -Value $value
    }
    Write-Host 'loaded .env.local'
} else {
    Write-Host 'no .env.local - using defaults; see LOCAL.md'
    $env:TENANTS_JSON = '{"demo":{"name":"Demo Business","email":"you@example.com","autoreply":false,"threshold":11}}'
    $env:ADMIN_SECRET = 'local-dev-secret'
}

Write-Host "-> http://localhost:$Port"
vercel dev --listen $Port --yes
