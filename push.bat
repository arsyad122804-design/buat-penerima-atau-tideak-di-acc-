@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix signature confirmation button click event by adding canvas dataset flag and delegated form submit"
git push origin main
