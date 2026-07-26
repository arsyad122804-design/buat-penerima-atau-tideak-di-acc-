@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add .
git commit -m "Fix AI modal opening bug using global window.toggleAiModal handler with inline onclick triggers"
git push origin main
