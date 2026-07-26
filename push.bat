@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Integrate Google Gemini 1.5 Flash AI Engine with live database context"
git push origin main
