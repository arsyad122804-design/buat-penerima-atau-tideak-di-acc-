@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Implement 4-stage sequential notification pipeline for Manager, Direktur, Admin and Inventaris"
git push origin main
