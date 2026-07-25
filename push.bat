@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix mobile notification dropdown position for screens under 900px"
git push origin main
