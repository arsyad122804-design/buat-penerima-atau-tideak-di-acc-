@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Enhance Admin WA number resolution fallback to check profiles if item.wa is empty"
git push origin main
