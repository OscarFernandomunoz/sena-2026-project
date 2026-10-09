// Script de PowerShell que abre el Excel ORIGINAL con la aplicación de Excel (COM),
// escribe las horas de TODAS las cédulas en sus respectivas filas, pinta las celdas
// y guarda una copia. Al abrirlo con Excel de verdad, el diseño y los filtros del
// archivo quedan idénticos.

export const APPLY_HOURS_MULTIPLE_PS1 = `
param(
  [string]$InPath,
  [string]$OutPath,
  [string]$Targets
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
function Norm([string]$s) {
  if ($null -eq $s) { return '' }
  $u = ($s -replace '\\s+', ' ').Trim().ToUpper()
  $u = $u -replace '[ÁÀÂÄ]','A' -replace '[ÉÈÊË]','E' -replace '[ÍÌÎÏ]','I' -replace '[ÓÒÔÖ]','O' -replace '[ÚÙÛÜ]','U' -replace 'Ñ','N'
  return $u
}
$cedulaNames = @('COLUMNA 3', '# DE DOCUMENTO')
# Targets es un string con formato "cedula1|horas1;cedula2|horas2;..."
$targetPairs = @{}
foreach ($pair in $Targets.Split(';')) {
  $parts = $pair.Split('|')
  if ($parts.Count -eq 2) { $targetPairs[$parts[0].Trim()] = $parts[1] }
}
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $null
try {
  $wb = $excel.Workbooks.Open($InPath)
  $done = $false
  foreach ($ws in $wb.Worksheets) {
    if ($done) { break }
    $used = $ws.UsedRange
    $top = $used.Row; $left = $used.Column
    $bottom = $top + $used.Rows.Count - 1; $right = $left + $used.Columns.Count - 1
    $cedulaCol = 0
    $hoursCol = 0
    for ($s = $top; $s -le $bottom -and ($cedulaCol -eq 0 -or $hoursCol -eq 0); $s++) {
      for ($c = $left; $c -le $right; $c++) {
        $txt = Norm([string]$used.Cells.Item($s, $c).Text)
        if ($cedulaCol -eq 0 -and $cedulaNames -contains $txt) { $cedulaCol = $c }
        if ($hoursCol -eq 0 -and $txt -eq 'HORAS ACADEMICAS') { $hoursCol = $c }
      }
    }
    if ($cedulaCol -eq 0) { continue }
    if ($hoursCol -eq 0) {
      $hoursCol = $right + 1
      $used.Cells.Item($top, $hoursCol).Value2 = 'Horas académicas'
      $right++
    }
    for ($r2 = $top; $r2 -le $bottom; $r2++) {
      $cedula = ([string]$used.Cells.Item($r2, $cedulaCol).Text).Trim()
      if ($targetPairs.ContainsKey($cedula)) {
        $hours = $targetPairs[$cedula]
        $cell = $used.Cells.Item($r2, $hoursCol)
        $num = 0.0
        $parts = [regex]::Matches(($hours -replace ',', '.'), '\\d+(?:\\.\\d+)?') | ForEach-Object { [double]$_.Value }
        if ($parts.Count -gt 0) {
          $num = $parts[0]
          for ($i = 1; $i -lt $parts.Count; $i++) { $num *= $parts[$i] }
          $cell.Value2 = $num
        } else {
          $cell.Value2 = $hours
        }
        if ($num -lt 160) {
          $cell.Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::FromArgb(255, 0, 0))
        } else {
          $cell.Interior.Color = [System.Drawing.ColorTranslator]::ToOle([System.Drawing.Color]::FromArgb(0, 176, 80))
        }
        $done = $true
      }
    }
  }
  if (-not $done) { exit 3 }
  $wb.SaveCopyAs($OutPath)
  $wb.Close($false)
  $excel.Quit()
  exit 0
} finally {
  if ($null -ne $wb) { try { $wb.Close($false) } catch {} }
  try { $excel.Quit() } catch {}
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
`;
