@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Completely disable opening WhatsApp links to enforce 100% silent background API sending"
git push origin main
