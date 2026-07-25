@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix profile fallback signature lookup to ensure Direktur and Inventaris signatures auto-fill 100%"
git push origin main
