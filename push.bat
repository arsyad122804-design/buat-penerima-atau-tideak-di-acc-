@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Bind profile WA numbers dynamically across role, username, and fullname keys for automated notifications"
git push origin main
