$path = "c:\Users\willi\OneDrive\Desktop\MyRotina-Provisional-name\Rotina.html"
$content = Get-Content -Raw -Path $path -Encoding UTF8

$content = $content -replace '(?s)\s*<!-- ==================== MISSIONS ==================== -->\s*<section class="page" id="page-missions">.*?MissÃµes.*?</section>\s*', "`n"
$content = $content.Replace('<span class="nav-label">MissÃµes</span>', '<span class="nav-label">Missões</span>')

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Output "Fix completed"
