# YATZY! Android Setup and Build Script
# This script automates the creation and configuration of the Android native project,
# applies production configurations, generates launcher icons, and runs the release builds.

# Ensure we are in the script's directory
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Set-Location $PSScriptRoot

Write-Host "Checking for Flutter SDK..." -ForegroundColor Cyan
if (!(Get-Command flutter -ErrorAction SilentlyContinue)) {
    Write-Error "Flutter is not in your environment PATH. Please install Flutter and add it to your PATH before running this script."
    Exit 1
}

Write-Host "Step 1: Initializing Android Platform Directories..." -ForegroundColor Cyan
if (!(Test-Path "android")) {
    flutter create --org app.opengames --project-name open_yatzy .
} else {
    Write-Host "  Android directory already exists. Skipping initialization." -ForegroundColor Yellow
}

Write-Host "Step 2: Configuring Android Manifest..." -ForegroundColor Cyan
$manifestPath = "android/app/src/main/AndroidManifest.xml"
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw

    # 1. Add VIBRATE permission if not present
    if ($manifestContent -notmatch "android.permission.VIBRATE") {
        # Insert permission after <manifest ...> tag
        $manifestContent = $manifestContent -replace '(<manifest[^>]*>)', "`$1`n    <uses-permission android:name=`"android.permission.VIBRATE`"/>"
        Write-Host "  Added vibration permission to AndroidManifest.xml" -ForegroundColor Green
    }

    # 2. Update Application Label to YATZY!
    if ($manifestContent -match 'android:label="[^"]*"') {
        $manifestContent = $manifestContent -replace 'android:label="[^"]*"', 'android:label="YATZY!"'
        Write-Host "  Updated application label to YATZY! in AndroidManifest.xml" -ForegroundColor Green
    }

    Set-Content -Path $manifestPath -Value $manifestContent -NoNewline
} else {
    Write-Error "AndroidManifest.xml not found at $manifestPath"
}

Write-Host "Step 3: Configuring Proguard..." -ForegroundColor Cyan
$proguardPath = "android/app/proguard-rules.pro"
if (!(Test-Path $proguardPath)) {
    New-Item -Path $proguardPath -ItemType File -Value "# Flutter Proguard Rules`n" | Out-Null
    Write-Host "  Created empty proguard-rules.pro file" -ForegroundColor Green
}

Write-Host "Step 4: Configuring key.properties..." -ForegroundColor Cyan
$keyPropsPath = "android/key.properties"
if (!(Test-Path $keyPropsPath)) {
    $placeholderContent = @"
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=C:\\Users\\YOUR_USER_NAME\\upload-keystore.jks
"@
    Set-Content -Path $keyPropsPath -Value $placeholderContent
    Write-Host "  Created template key.properties at $keyPropsPath" -ForegroundColor Green
    Write-Host "  [IMPORTANT] Please edit this file with your actual keystore credentials before building a signed release." -ForegroundColor Yellow
}

Write-Host "Step 5: Configuring build.gradle..." -ForegroundColor Cyan
$gradlePath = "android/app/build.gradle"
if (Test-Path $gradlePath) {
    $gradleContent = Get-Content $gradlePath -Raw

    # Update ApplicationID
    if ($gradleContent -match 'applicationId\s+"[^"]+"') {
        $gradleContent = $gradleContent -replace 'applicationId\s+"[^"]+"', 'applicationId "app.opengames.yatzy"'
        Write-Host "  Updated applicationId to app.opengames.yatzy" -ForegroundColor Green
    }

    # Add keystore reading properties block if not present
    if ($gradleContent -notmatch "keystorePropertiesFile") {
        $keystorePropertiesBlock = @"
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

"@
        # Insert at the beginning of the file
        $gradleContent = $keystorePropertiesBlock + $gradleContent
        Write-Host "  Added keystore configuration reader to build.gradle" -ForegroundColor Green
    }

    # Add signing configs and release build type modifications
    if ($gradleContent -match 'android\s*\{' -and $gradleContent -notmatch 'signingConfigs\s*\{') {
        $signingConfigsBlock = @"
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
"@
        $gradleContent = $gradleContent -replace 'buildTypes\s*\{', $signingConfigsBlock
        
        # Add signingConfig and proguard optimization settings inside release buildType
        $releaseBuildTypeBlock = @"
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
"@
        # Replace the default release block
        $gradleContent = $gradleContent -replace 'release\s*\{[^\}]*\}', $releaseBuildTypeBlock
        Write-Host "  Added signing configurations and release build type settings to build.gradle" -ForegroundColor Green
    }

    Set-Content -Path $gradlePath -Value $gradleContent -NoNewline
} else {
    Write-Error "build.gradle not found at $gradlePath"
}

Write-Host "Step 6: Compiling Launcher Icons..." -ForegroundColor Cyan
flutter pub get
flutter pub run flutter_launcher_icons:main

Write-Host "Step 7: Compiling Release APK and AAB..." -ForegroundColor Cyan
Write-Host "  Running flutter clean..."
flutter clean
Write-Host "  Running flutter pub get..."
flutter pub get

Write-Host "  Building Release APK..." -ForegroundColor Green
flutter build apk --release

Write-Host "  Building Release App Bundle (AAB)..." -ForegroundColor Green
flutter build appbundle --release

Write-Host "Android Build Process Completed!" -ForegroundColor Green
Write-Host "Release APK: build/app/outputs/flutter-apk/app-release.apk" -ForegroundColor Green
Write-Host "Release AAB: build/app/outputs/bundle/release/app-release.aab" -ForegroundColor Green
