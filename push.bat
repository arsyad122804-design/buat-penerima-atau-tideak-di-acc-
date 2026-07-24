@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Add dual download options (.exe and .zip) and local web download server"
git push origin main
