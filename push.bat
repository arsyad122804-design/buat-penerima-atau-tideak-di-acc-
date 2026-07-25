@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix Konfirmasi button click by handling both click and submit events with fail-safe canvas validation"
git push origin main
