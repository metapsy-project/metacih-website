param(
    [string]$InputPath = "$PSScriptRoot\..\assets\databases\MetaCIH_unified_03PM_Jun11_2026.xlsx",
    [string]$OutputPath = "$PSScriptRoot\..\assets\databases\unified.json"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ColumnIndex([string]$cellRef) {
    $letters = ($cellRef -replace '\d', '')
    $index = 0
    foreach ($char in $letters.ToCharArray()) {
        $index = $index * 26 + ([int][char]$char - [int][char]'A' + 1)
    }
    return $index - 1
}

function Get-SharedStrings([string]$sstPath) {
    [xml]$sst = Get-Content $sstPath -Encoding UTF8
    $strings = New-Object System.Collections.Generic.List[string]
    foreach ($si in $sst.sst.si) {
        if ($si.t -and $si.t.'#text') {
            [void]$strings.Add([string]$si.t.'#text')
        }
        elseif ($si.t) {
            [void]$strings.Add([string]$si.t)
        }
        elseif ($si.r) {
            $parts = @($si.r | ForEach-Object {
                if ($_.t.'#text') { $_.t.'#text' } else { [string]$_.t }
            })
            [void]$strings.Add(($parts -join ''))
        }
        else {
            [void]$strings.Add('')
        }
    }
    return $strings
}

$tempDir = Join-Path $env:TEMP ("metacih_xlsx_" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null
try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $InputPath).Path, $tempDir)

    $strings = Get-SharedStrings (Join-Path $tempDir 'xl\sharedStrings.xml')
    [xml]$sheet = Get-Content (Join-Path $tempDir 'xl\worksheets\sheet1.xml') -Encoding UTF8

    $groupRow = $sheet.worksheet.sheetData.row | Where-Object { $_.r -eq '1' }
    $headerRow = $sheet.worksheet.sheetData.row | Where-Object { $_.r -eq '2' }

    $groupMap = @{}
    foreach ($cell in $groupRow.c) {
        $colIndex = Get-ColumnIndex $cell.r
        $value = if ($cell.t -eq 's') { $strings[[int]$cell.v] } else { [string]$cell.v }
        if ($value) { $groupMap[$colIndex] = $value }
    }

    $headerMap = @{}
    foreach ($cell in $headerRow.c) {
        $colIndex = Get-ColumnIndex $cell.r
        $value = if ($cell.t -eq 's') { $strings[[int]$cell.v] } else { [string]$cell.v }
        if ($value) { $headerMap[$colIndex] = $value }
    }

    $columns = @($headerMap.GetEnumerator() | Sort-Object Name | ForEach-Object { $_.Value })

    $columnGroupsList = New-Object System.Collections.Generic.List[object]
    $currentGroup = $null
    $currentColumns = New-Object System.Collections.Generic.List[string]
    $maxCol = ($headerMap.Keys | Measure-Object -Maximum).Maximum

    for ($i = 0; $i -le $maxCol; $i++) {
        if ($groupMap.ContainsKey($i)) {
            if ($currentGroup -and $currentColumns.Count -gt 0) {
                $columnGroupsList.Add([ordered]@{
                    label   = $currentGroup
                    columns = @($currentColumns.ToArray())
                })
            }
            $currentGroup = ($groupMap[$i] -replace '^S1-', '')
            $currentColumns = New-Object System.Collections.Generic.List[string]
        }

        if ($headerMap.ContainsKey($i)) {
            if (-not $currentGroup) { $currentGroup = 'Other' }
            [void]$currentColumns.Add($headerMap[$i])
        }
    }

    if ($currentGroup -and $currentColumns.Count -gt 0) {
        $columnGroupsList.Add([ordered]@{
            label   = $currentGroup
            columns = @($currentColumns.ToArray())
        })
    }

    $columnGroups = @($columnGroupsList.ToArray())
    $records = @()
    $years = New-Object System.Collections.Generic.List[int]

    foreach ($row in $sheet.worksheet.sheetData.row) {
        $rowNum = [int]$row.r
        if ($rowNum -le 2) { continue }

        $cells = @{}
        foreach ($cell in $row.c) {
            $colIndex = Get-ColumnIndex $cell.r
            $value = if ($cell.t -eq 's') { $strings[[int]$cell.v] } elseif ($cell.v) { [string]$cell.v } else { '' }
            $cells[$colIndex] = $value
        }

        $record = [ordered]@{}
        foreach ($entry in ($headerMap.GetEnumerator() | Sort-Object Name)) {
            if ($cells.ContainsKey($entry.Name)) {
                $record[$entry.Value] = $cells[$entry.Name]
            }
            else {
                $record[$entry.Value] = ''
            }
        }

        if (-not $record.title) { continue }

        $yearRaw = [string]$record.year
        if ($yearRaw -match '^\d{4}$') {
            $yearInt = [int]$yearRaw
            $record.year = $yearInt
            [void]$years.Add($yearInt)
        }
        else {
            $record.year = $null
        }

        $records += [pscustomobject]$record
    }

    $yearMin = if ($years.Count) { ($years | Measure-Object -Minimum).Minimum } else { $null }
    $yearMax = if ($years.Count) { ($years | Measure-Object -Maximum).Maximum } else { $null }

    $output = [ordered]@{
        columns      = $columns
        columnGroups = $columnGroups
        yearMin      = $yearMin
        yearMax      = $yearMax
        studies      = $records
    }

    $json = $output | ConvertTo-Json -Depth 5
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText((Resolve-Path (Split-Path $OutputPath -Parent)).Path + '\' + (Split-Path $OutputPath -Leaf), $json, $utf8NoBom)
    Write-Host "Wrote $($records.Count) records and $($columns.Count) columns to $OutputPath"
}
finally {
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
}
