@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Separate profile storage per user account and auto-fill Direktur signature in approval modal"
git push origin main
