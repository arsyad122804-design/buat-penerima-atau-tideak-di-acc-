@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Restore style.css stylesheet link in index.html and admin.html head"
git push origin main
