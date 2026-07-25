@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix mobile notification dropdown layout and clipping issue"
git push origin main
