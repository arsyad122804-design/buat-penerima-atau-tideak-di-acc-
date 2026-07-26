@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Strictly display submission item.wa only on tables to prevent cross-account profile WA inheritance"
git push origin main
