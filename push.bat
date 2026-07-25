@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix mobile modal layout and button overflow in approval dialog"
git push origin main
