@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Auto format WhatsApp input fields with +62 country code and placeholder"
git push origin main
