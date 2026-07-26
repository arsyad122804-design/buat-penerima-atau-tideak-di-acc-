@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix AI chat form submit handling and prevent modal closing on Enter or Send click"
git push origin main
