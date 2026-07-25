@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Enhance sendWaDirect with URLSearchParams and fallback to direct link opening"
git push origin main
