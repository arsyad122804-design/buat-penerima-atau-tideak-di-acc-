@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Match mobile dashboard layout exactly 1:1 with design screenshot"
git push origin main
