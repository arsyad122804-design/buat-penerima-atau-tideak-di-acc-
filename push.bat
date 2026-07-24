@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Clean up mobile header single-row layout"
git push origin main
