@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Update WhatsApp notification flow strictly matching user 3-step pipeline: Inventaris -> Direktur & Manager -> Admin -> Inventaris"
git push origin main
