@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Strictly display submission WA number for that item without global fallback leakage"
git push origin main
