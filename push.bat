@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix items table rendering crash for Disetujui Manager status and provide default fallback items"
git push origin main
