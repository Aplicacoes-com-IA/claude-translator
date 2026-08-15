Dim WshShell, cmd, targetScript
Set WshShell = CreateObject("WScript.Shell")
If WScript.Arguments.Count > 0 Then
    targetScript = WScript.Arguments(0)
    cmd = "node.exe """ & targetScript & """ serve --no-open --no-tray"
    WshShell.Run cmd, 0, False
End If
