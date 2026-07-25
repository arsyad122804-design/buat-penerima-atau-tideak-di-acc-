@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix Direktur signature modal submit hanging issue by making UI updates instant"
git push origin main
