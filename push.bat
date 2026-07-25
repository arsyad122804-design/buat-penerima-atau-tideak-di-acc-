@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Enable persistent local storage overrides for approvals and purchases to maintain history"
git push origin main
