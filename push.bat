@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Add friendly human greeting responses and fix total budget calculation number parsing"
git push origin main
