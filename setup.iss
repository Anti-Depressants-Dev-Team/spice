[Setup]
AppName=Spice
AppVersion=1.0.0
WizardStyle=modern
DefaultDirName={autopf}\Spice
DefaultGroupName=Spice
UninstallDisplayIcon={app}\Spice.exe
Compression=lzma2
SolidCompression=yes
OutputDir=dist
OutputBaseFilename=Spice Setup 1.0.0
SetupIconFile=dist\.icon-ico\icon.ico

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "dist\.icon-ico\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Spice"; Filename: "{app}\Spice.exe"; IconFilename: "{app}\icon.ico"; WorkingDir: "{app}"
Name: "{autodesktop}\Spice"; Filename: "{app}\Spice.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"; WorkingDir: "{app}"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
