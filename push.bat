@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix UTF-8 emoji encoding and map inventaris role to Pengajuan display"
git push origin main
