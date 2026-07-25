@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix account signature isolation and add WhatsApp number to profile and procurement forms"
git push origin main
