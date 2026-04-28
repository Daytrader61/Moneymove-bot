Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c start /B node C:\Users\Hacer\.openclaw\workspace\trading-bot\bot.js", 0, False
