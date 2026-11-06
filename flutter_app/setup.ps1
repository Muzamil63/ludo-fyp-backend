# One-time setup on a new PC (run inside flutter_app/ in PowerShell):  .\setup.ps1
# 1. Generates the Android project files (keeps our lib/, test/ and pubspec.yaml as they are)
# 2. Lets the app use the internet and plain http:// (needed to reach the backend on your PC)
# 3. Downloads the packages

flutter create --platforms=android --org com.ludoarena --project-name ludo_arena .

$manifest = Join-Path $PSScriptRoot 'android\app\src\main\AndroidManifest.xml'
$xml = [System.IO.File]::ReadAllText($manifest)
if ($xml -notmatch 'android.permission.INTERNET') {
  $xml = $xml -replace '<application', "<uses-permission android:name=`"android.permission.INTERNET`" />`r`n    <application"
}
if ($xml -notmatch 'usesCleartextTraffic') {
  $xml = $xml -replace '<application', '<application android:usesCleartextTraffic="true"'
}
[System.IO.File]::WriteAllText($manifest, $xml)   # UTF-8 without BOM
Write-Host "AndroidManifest.xml patched (INTERNET + cleartext HTTP)"

flutter pub get
Write-Host "Done. Start an emulator or plug in a phone, then run:  flutter run"
