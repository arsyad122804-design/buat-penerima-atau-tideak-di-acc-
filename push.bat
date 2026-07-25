@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix bug where forced clear block was wiping newly submitted items on reload"
git push origin main
