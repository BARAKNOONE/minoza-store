Add-Type -AssemblyName System.Drawing

function Create-LogoPng {
    param(
        [string]$text,
        [int]$width,
        [int]$height,
        [string]$fontName,
        [float]$fontSize,
        [System.Drawing.Color]$bgColor,
        [System.Drawing.Color]$textColor,
        [string]$outputPath,
        [bool]$transparent = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $bmp.SetResolution(300, 300)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable maximum quality rendering
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    if ($transparent) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $g.Clear($bgColor)
    }

    # Font
    $fontStyle = [System.Drawing.FontStyle]::Bold
    $font = New-Object System.Drawing.Font($fontName, $fontSize, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
    
    # String format centered
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $brush = New-Object System.Drawing.SolidBrush($textColor)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $width, $height)

    $g.DrawString($text, $font, $brush, $rect, $sf)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $brush.Dispose()
    $font.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $outputPath"
}

$imgDir = "d:\dropshipping\public\images"

# 1. Arial Bold (Exact open 'O' and modern proportions like user screenshot)
Create-LogoPng -text "MINOZA" -width 2400 -height 600 -fontName "Arial" -fontSize 320 -bgColor ([System.Drawing.Color]::White) -textColor ([System.Drawing.Color]::Black) -outputPath "$imgDir\logo_arial_bold.png" -transparent $false
Create-LogoPng -text "MINOZA" -width 2400 -height 600 -fontName "Arial" -fontSize 320 -bgColor ([System.Drawing.Color]::White) -textColor ([System.Drawing.Color]::Black) -outputPath "$imgDir\logo_minozastore.png" -transparent $true

# 2. Segoe UI Bold (Modern clean tech look)
Create-LogoPng -text "MINOZA" -width 2400 -height 600 -fontName "Segoe UI" -fontSize 320 -bgColor ([System.Drawing.Color]::White) -textColor ([System.Drawing.Color]::Black) -outputPath "$imgDir\logo_segoe_bold.png" -transparent $false

# 3. Arial Black (Extra heavy weight)
Create-LogoPng -text "MINOZA" -width 2400 -height 600 -fontName "Arial Black" -fontSize 280 -bgColor ([System.Drawing.Color]::White) -textColor ([System.Drawing.Color]::Black) -outputPath "$imgDir\logo_arial_black.png" -transparent $false

# 4. Inverted Dark Background (Arial Bold)
Create-LogoPng -text "MINOZA" -width 2400 -height 600 -fontName "Arial" -fontSize 320 -bgColor ([System.Drawing.Color]::FromArgb(15, 15, 18)) -textColor ([System.Drawing.Color]::White) -outputPath "$imgDir\logo_dark_bg.png" -transparent $false

# 5. Square Profile Avatar (1200x1200)
Create-LogoPng -text "MINOZA" -width 1200 -height 1200 -fontName "Arial" -fontSize 260 -bgColor ([System.Drawing.Color]::Black) -textColor ([System.Drawing.Color]::White) -outputPath "$imgDir\logo_square_avatar.png" -transparent $false

# Copy all to artifacts directory for user review
$artifactDir = "C:\Users\BARAK_SMOKE\.gemini\antigravity-ide\brain\3142894f-b9f5-4ea1-9026-01c5a4fa795e"
Copy-Item "$imgDir\logo_arial_bold.png" "$artifactDir\logo_arial_bold.png" -Force
Copy-Item "$imgDir\logo_segoe_bold.png" "$artifactDir\logo_segoe_bold.png" -Force
Copy-Item "$imgDir\logo_arial_black.png" "$artifactDir\logo_arial_black.png" -Force
Copy-Item "$imgDir\logo_dark_bg.png" "$artifactDir\logo_minozastore_dark.png" -Force
Copy-Item "$imgDir\logo_square_avatar.png" "$artifactDir\logo_square_avatar.png" -Force

Write-Host "All Logo variations generated successfully!"
