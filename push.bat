@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Ensure WA number is always resolved and displayed as direct chat link in tables"
git push origin main
