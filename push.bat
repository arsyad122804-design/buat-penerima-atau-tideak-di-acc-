@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Ensure Admin Beli action sends WA notification directly to the exact WA number in that item submission row"
git push origin main
