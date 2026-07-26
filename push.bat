@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix pointer-events blocking and add robust multi-event handlers for AI FAB button"
git push origin main
