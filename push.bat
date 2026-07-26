@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix critical template string syntax error in app.js and restore full application execution"
git push origin main
