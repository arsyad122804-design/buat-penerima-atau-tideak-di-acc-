@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Ensure synchronous direct WhatsApp trigger bypassing pop-up blockers"
git push origin main
