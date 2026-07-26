@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix unclosed modal-edit-item div that trapped AI button inside hidden backdrop"
git push origin main
