@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Update download links to point directly to Aplikasi-SPMS.exe"
git push origin main
