@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Inject zero-latency head script for instant AI modal opening"
git push origin main
