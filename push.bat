@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Use submission item.wa strictly for Inventaris notifications instead of fallback to profile"
git push origin main
