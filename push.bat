@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Auto send WhatsApp notification to Inventaris user on item approval or rejection"
git push origin main
