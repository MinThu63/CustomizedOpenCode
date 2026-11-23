# Captures the full virtual desktop (all monitors) to a PNG, downscaled for speed.
# Usage: powershell -File screenshot.ps1 -Out "C:\path\shot.png" [-MaxWidth 1600]
param(
  [Parameter(Mandatory=$true)][string]$Out,
  [int]$MaxWidth = 1600
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
$full = New-Object System.Drawing.Bitmap $vs.Width, $vs.Height
$g = [System.Drawing.Graphics]::FromImage($full)
$g.CopyFromScreen($vs.Left, $vs.Top, 0, 0, $full.Size)
$g.Dispose()

if ($full.Width -gt $MaxWidth) {
  $scale = $MaxWidth / $full.Width
  $w = [int]($full.Width * $scale)
  $h = [int]($full.Height * $scale)
  $resized = New-Object System.Drawing.Bitmap $w, $h
  $rg = [System.Drawing.Graphics]::FromImage($resized)
  $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $rg.DrawImage($full, 0, 0, $w, $h)
  $rg.Dispose()
  $full.Dispose()
  $out_bmp = $resized
} else {
  $out_bmp = $full
}

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
$out_bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$out_bmp.Dispose()
Write-Output $Out
