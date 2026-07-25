@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Permanently hard wipe all 8 existing database records across all tables and roles"
git push origin main
