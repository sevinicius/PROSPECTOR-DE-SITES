' Gestão VF — abre o painel sem janela de console.
' Se o servidor já estiver no ar (porta 8765), só abre o navegador; senão, sobe o servidor
' escondido (o dashboard-server.py abre o navegador sozinho).
Option Explicit
Dim fso, pasta, url, http, noAr, sh
Set fso = CreateObject("Scripting.FileSystemObject")
pasta = fso.GetParentFolderName(WScript.ScriptFullName)
url = "http://127.0.0.1:8765/painel/"

noAr = False
On Error Resume Next
Set http = CreateObject("MSXML2.XMLHTTP")
http.Open "GET", url, False
http.Send
If Err.Number = 0 And http.Status = 200 Then noAr = True
On Error GoTo 0

Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = pasta
If noAr Then
  ' já rodando — só abre o painel no navegador padrão
  sh.Run "cmd /c start """" """ & url & """", 0, False
Else
  ' sobe o servidor escondido; ele mesmo abre o navegador
  sh.Run "pythonw.exe """ & pasta & "\dashboard-server.py""", 0, False
End If
