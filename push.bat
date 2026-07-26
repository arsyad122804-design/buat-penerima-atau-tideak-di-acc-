@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix chat send button inside AI modal and restore floating AI widget pill design"
git push origin main
