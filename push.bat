@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Keep item submission WA input field empty by default so user enters phone number manually"
git push origin main
