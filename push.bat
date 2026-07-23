@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Relocate mobile header user profile pill to dedicated sub-row"
git push origin main
