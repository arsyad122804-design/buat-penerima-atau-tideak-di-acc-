@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git config user.name "hibatullahbjn-debug"
git config user.email "hibatullahbjn-debug@users.noreply.github.com"
git add .
git commit -m "Update logo and login credentials"
git push -u origin main --force
